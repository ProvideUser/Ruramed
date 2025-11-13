import { db } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { 
    logger, 
    logHealthcareEvent, 
    logError, 
    logAuditTrail 
} from '../utils/logger.js';
import { geocodingUtils as geocodeUtil } from '../utils/geocoding.js';


// Get user addresses
export const getUserAddresses = async (req, res) => {
    const userId = req.user.id;

    try {
        const addresses = await preparedQueries.addresses.findByUserId(userId);

        logHealthcareEvent('addresses_listed', {
            user_id: userId,
            count: addresses.length
        }, userId);

        res.json({
            addresses,
            count: addresses.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_addresses',
            user_id: userId
        });

        res.status(500).json({
            error: 'Failed to fetch addresses',
            timestamp: new Date().toISOString()
        });
    }
};


// Create new address
export const createAddress = async (req, res) => {
    const userId = req.user.id;
    const addressData = {
        ...req.validatedData,
        user_id: userId
    };

    try {
        // If this is set as default, unset other defaults first
        if (addressData.is_default) {
            await db.execute(
                'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
                [userId]
            );
        }

        // Geocode address if coordinates not provided
        if (!addressData.latitude || !addressData.longitude) {
            try {
                const fullAddress = `${addressData.address_line1}, ${addressData.city}, ${addressData.state}, ${addressData.postal_code}`;
                
                // ✅ FIX: Call the correct method
                const result = await geocodeUtil.forwardGeocode(fullAddress);
                
                if (result && result.data && result.data.length > 0) {
                    const firstResult = result.data[0];
                    addressData.latitude = parseFloat(firstResult.lat);
                    addressData.longitude = parseFloat(firstResult.lon);
                }
            } catch (geocodeError) {
                logger.warn('Geocoding failed for address', {
                    error: geocodeError.message,
                    address: addressData.city
                });
            }
        }

        const addressId = await preparedQueries.addresses.create(addressData, userId);

        logHealthcareEvent('address_created', {
            address_id: addressId,
            city: addressData.city,
            state: addressData.state,
            is_default: addressData.is_default
        }, userId);

        logAuditTrail('CREATE', 'address', userId, null, {
            address_id: addressId,
            city: addressData.city,
            state: addressData.state
        });

        res.status(201).json({
            message: 'Address created successfully',
            address_id: addressId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'create_address',
            user_id: userId,
            address_data: addressData
        });

        res.status(500).json({
            error: 'Failed to create address',
            timestamp: new Date().toISOString()
        });
    }
};


// Get address by ID
export const getAddressById = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        const [addresses] = await db.execute(
            'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (addresses.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            address: addresses[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_address_by_id',
            user_id: userId,
            address_id: addressId
        });

        res.status(500).json({
            error: 'Failed to fetch address',
            timestamp: new Date().toISOString()
        });
    }
};


// Update address
export const updateAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    const updateData = req.validatedData;

    try {
        // Get current address for audit trail
        const [currentAddresses] = await db.execute(
            'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (currentAddresses.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        const currentAddress = currentAddresses[0];

        // If setting as default, unset other defaults
        if (updateData.is_default && !currentAddress.is_default) {
            await db.execute(
                'UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?',
                [userId, addressId]
            );
        }

        // Update coordinates if address changed
        if (updateData.address_line1 || updateData.city || updateData.state || updateData.postal_code) {
            try {
                const fullAddress = `${updateData.address_line1 || currentAddress.address_line1}, ${updateData.city || currentAddress.city}, ${updateData.state || currentAddress.state}, ${updateData.postal_code || currentAddress.postal_code}`;
                
                // ✅ FIX: Call the correct method
                const result = await geocodeUtil.forwardGeocode(fullAddress);
                
                if (result && result.data && result.data.length > 0) {
                    const firstResult = result.data[0];
                    updateData.latitude = parseFloat(firstResult.lat);
                    updateData.longitude = parseFloat(firstResult.lon);
                }
            } catch (geocodeError) {
                logger.warn('Geocoding failed for address update', {
                    error: geocodeError.message,
                    address_id: addressId
                });
            }
        }

        // Update address
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const [result] = await db.execute(
            `UPDATE addresses SET ${setClause} WHERE id = ? AND user_id = ?`,
            [...values, addressId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('address_updated', {
            address_id: addressId,
            updated_fields: fields
        }, userId);

        logAuditTrail('UPDATE', 'address', userId, currentAddress, updateData);

        res.json({
            message: 'Address updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_address',
            user_id: userId,
            address_id: addressId,
            update_data: updateData
        });

        res.status(500).json({
            error: 'Failed to update address',
            timestamp: new Date().toISOString()
        });
    }
};


// Delete address
export const deleteAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        // Get address data before deletion
        const [addresses] = await db.execute(
            'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (addresses.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        const address = addresses[0];

        // Check if address is used in any active orders
        const [activeOrders] = await db.execute(
            'SELECT COUNT(*) as count FROM orders WHERE address_id = ? AND status IN ("pending", "approved", "out_for_delivery")',
            [addressId]
        );

        if (activeOrders[0].count > 0) {
            return res.status(400).json({
                error: 'Cannot delete address',
                message: 'This address is associated with active orders',
                timestamp: new Date().toISOString()
            });
        }

        // Delete address
        const [result] = await db.execute(
            'DELETE FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        // If deleted address was default, set another as default
        if (address.is_default) {
            await db.execute(
                'UPDATE addresses SET is_default = 1 WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
                [userId]
            );
        }

        logHealthcareEvent('address_deleted', {
            address_id: addressId,
            city: address.city,
            was_default: address.is_default
        }, userId);

        logAuditTrail('DELETE', 'address', userId, address, null);

        res.json({
            message: 'Address deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'delete_address',
            user_id: userId,
            address_id: addressId
        });

        res.status(500).json({
            error: 'Failed to delete address',
            timestamp: new Date().toISOString()
        });
    }
};


// Set default address
export const setDefaultAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        // Verify address exists and belongs to user
        const [addresses] = await db.execute(
            'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (addresses.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        // Unset all other defaults
        await db.execute(
            'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
            [userId]
        );

        // Set this address as default
        await db.execute(
            'UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        logHealthcareEvent('default_address_changed', {
            address_id: addressId,
            city: addresses[0].city
        }, userId);

        res.json({
            message: 'Default address updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'set_default_address',
            user_id: userId,
            address_id: addressId
        });

        res.status(500).json({
            error: 'Failed to set default address',
            timestamp: new Date().toISOString()
        });
    }
};


// Get default address
export const getDefaultAddress = async (req, res) => {
    const userId = req.user.id;

    try {
        const defaultAddress = await preparedQueries.addresses.findDefault(userId);
        
        if (!defaultAddress) {
            return res.status(404).json({
                error: 'No default address found',
                message: 'Please set a default address',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            address: defaultAddress,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_default_address',
            user_id: userId
        });

        res.status(500).json({
            error: 'Failed to fetch default address',
            timestamp: new Date().toISOString()
        });
    }
};


// Validate address
export const validateAddress = async (req, res) => {
    const addressData = req.validatedData;

    try {
        // Basic validation is already done by middleware
        let isValid = true;
        const issues = [];

        // Try to geocode the address
        try {
            const fullAddress = `${addressData.address_line1}, ${addressData.city}, ${addressData.state}, ${addressData.postal_code}`;
            
            // ✅ FIX: Call the correct method
            const result = await geocodeUtil.forwardGeocode(fullAddress);
            
            if (!result || !result.data || result.data.length === 0) {
                issues.push('Address could not be verified with mapping service');
                isValid = false;
            }
        } catch (geocodeError) {
            issues.push('Address verification service temporarily unavailable');
        }

        res.json({
            is_valid: isValid,
            issues: issues.length > 0 ? issues : null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'validate_address',
            address_data: addressData,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Address validation failed',
            timestamp: new Date().toISOString()
        });
    }
};


// Geocode address
export const geocodeAddress = async (req, res) => {
    const { address } = req.body;

    try {
        // ✅ FIX: Call the correct method
        const result = await geocodeUtil.forwardGeocode(address);
        
        if (!result || !result.data || result.data.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                message: 'Could not determine coordinates for the provided address',
                timestamp: new Date().toISOString()
            });
        }

        const firstResult = result.data[0];

        res.json({
            address: address,
            coordinates: {
                lat: parseFloat(firstResult.lat),
                lng: parseFloat(firstResult.lon)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'geocode_address',
            address: address,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Geocoding failed',
            timestamp: new Date().toISOString()
        });
    }
};


// Check service area
export const checkServiceArea = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        // Get address coordinates
        const [addresses] = await db.execute(
            'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
            [addressId, userId]
        );

        if (addresses.length === 0) {
            return res.status(404).json({
                error: 'Address not found',
                timestamp: new Date().toISOString()
            });
        }

        const address = addresses[0];

        // Check service areas (mock implementation)
        const [serviceAreas] = await db.execute(
            'SELECT * FROM service_areas WHERE is_active = 1'
        );

        let isServiced = false;
        let serviceArea = null;
        let deliveryFee = 0;

        // Simple postal code check (in real implementation, would use geo boundaries)
        for (const area of serviceAreas) {
            const postalCodes = area.postal_codes ? area.postal_codes.split(',') : [];
            if (postalCodes.includes(address.postal_code)) {
                isServiced = true;
                serviceArea = area;
                deliveryFee = area.delivery_fee;
                break;
            }
        }

        res.json({
            address_id: addressId,
            is_serviced: isServiced,
            service_area: serviceArea ? {
                name: serviceArea.area_name,
                delivery_fee: deliveryFee,
                delivery_time_hours: serviceArea.delivery_time_hours,
                min_order_amount: serviceArea.min_order_amount
            } : null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'check_service_area',
            user_id: userId,
            address_id: addressId
        });

        res.status(500).json({
            error: 'Failed to check service area',
            timestamp: new Date().toISOString()
        });
    }
};
