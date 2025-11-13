import { db } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { userCache } from '../utils/cache.js';
import { 
    logger, 
    logHealthcareEvent, 
    logSecurityEvent, 
    logError, 
    logAuditTrail 
} from '../utils/logger.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date_of_birth to YYYY-MM-DD string
 * Handles both Date objects and string formats
 */
const formatDateOfBirth = (dateValue) => {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    } else if (typeof dateValue === 'string') {
        return dateValue.split('T')[0];
    }
    
    return null;
};

/**
 * Format profile response data
 * Ensures consistent date formatting across all profile endpoints
 */
const formatProfileResponse = (profile) => {
    return {
        id: profile.id,
        userId: profile.user_id,
        fullName: profile.full_name,
        profilePicture: profile.profile_picture,
        gender: profile.gender,
        dateOfBirth: formatDateOfBirth(profile.date_of_birth),
        bloodGroup: profile.blood_group,
        emailVerified: profile.email_verified,
        mobileVerified: profile.mobile_verified,
        alternateContact: profile.alternate_contact,
        customerUniqueId: profile.customer_unique_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
    };
};

// ============================================================================
// EXISTING USER PROFILE ENDPOINTS (Keep as is)
// ============================================================================


// =================== New Profile Picture Handlers ======================

// Upload Profile Picture
export const uploadProfilePicture = async (req, res) => {
    const userId = req.user.id;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                timestamp: new Date().toISOString()
            });
        }

        // Validate actual file content (magic bytes)
        const buffer = fs.readFileSync(req.file.path);
        const detectedType = await fileTypeFromBuffer(buffer);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
            fs.unlinkSync(req.file.path);
            logSecurityEvent('malicious_file_upload_attempt', {
                user_id: userId,
                claimed_type: req.file.mimetype,
                actual_type: detectedType?.mime || 'unknown',
                filename: req.file.originalname
            }, userId, req.ip);

            return res.status(400).json({
                success: false,
                error: 'Invalid file type',
                message: 'File content does not match a supported image format'
            });
        }

        // Reprocess image to standardized format and strip metadata
        const processedImagePath = path.join(__dirname, '../uploads/profiles', `processed_${req.file.filename}.jpg`);
        await sharp(req.file.path)
            .resize(500, 500, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(processedImagePath);

        // Delete original uploaded file
        fs.unlinkSync(req.file.path);

        // Delete old profile picture if exists
        const existingProfile = await preparedQueries.userProfiles.findByUserId(userId);
        if (existingProfile?.profile_picture) {
            const oldFileName = path.basename(existingProfile.profile_picture);
            const oldFilePath = path.join(__dirname, '../uploads/profiles', oldFileName);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Save new profile picture path (relative URL) in DB
        const relativePath = `/api/users/profile/picture/processed_${req.file.filename}.jpg`;

        await preparedQueries.userProfiles.updateById(userId, {
            profile_picture: relativePath
        }, userId);

        logHealthcareEvent('profile_picture_uploaded', {
            user_id: userId,
            filename: `processed_${req.file.filename}.jpg`
        }, userId);

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: {
                profilePicture: relativePath,
                filename: `processed_${req.file.filename}.jpg`
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        logError(error, { operation: 'upload_profile_picture', user_id: userId });

        res.status(500).json({
            success: false,
            error: 'Failed to upload profile picture',
            timestamp: new Date().toISOString()
        });
    }
};

// Get Profile Picture (Secure serving)
export const getProfilePicture = async (req, res) => {
    const userId = req.user.id;
    const requestedFilename = req.params.filename;

    try {
        const profile = await preparedQueries.userProfiles.findByUserId(userId);
        if (!profile || !profile.profile_picture) {
            return res.status(404).json({
                success: false,
                error: 'No profile picture found',
                timestamp: new Date().toISOString()
            });
        }

        const userFilename = path.basename(profile.profile_picture);

        // Verify ownership - requested file must match user's profile picture
        if (userFilename !== requestedFilename) {
            logSecurityEvent('unauthorized_file_access_attempt', {
                user_id: userId,
                requested_file: requestedFilename,
                actual_file: userFilename
            }, userId, req.ip);

            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only access your own profile picture',
                timestamp: new Date().toISOString()
            });
        }

        const filePath = path.join(__dirname, '../uploads/profiles', requestedFilename);

        // Prevent path traversal
        const uploadsDir = path.join(__dirname, '../uploads/profiles');
        if (!filePath.startsWith(uploadsDir)) {
            logSecurityEvent('path_traversal_attempt', {
                user_id: userId,
                requested_file: requestedFilename,
                resolved_path: filePath
            }, userId, req.ip);

            return res.status(403).json({
                success: false,
                error: 'Invalid file path',
                timestamp: new Date().toISOString()
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found',
                timestamp: new Date().toISOString()
            });
        }

        res.sendFile(filePath);

    } catch (error) {
        logError(error, {
            operation: 'get_profile_picture',
            user_id: userId,
            filename: requestedFilename
        });

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile picture',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete Profile Picture
export const deleteProfilePicture = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await preparedQueries.userProfiles.findByUserId(userId);

        if (!profile?.profile_picture) {
            return res.status(404).json({
                success: false,
                error: 'No profile picture found',
                timestamp: new Date().toISOString()
            });
        }

        const fileName = path.basename(profile.profile_picture);
        const filePath = path.join(__dirname, '../uploads/profiles', fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await preparedQueries.userProfiles.updateById(userId, {
            profile_picture: null
        }, userId);

        res.json({
            success: true,
            message: 'Profile picture deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'delete_profile_picture',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to delete profile picture',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user profile
export const getUserProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await preparedQueries.users.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('profile_accessed', {
            user_id: userId
        }, userId);

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location,
                created_at: user.created_at
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_profile',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            timestamp: new Date().toISOString()
        });
    }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    const updateData = req.validatedData;
    const clientIp = req.ip;

    try {
        const currentUser = await preparedQueries.users.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        const updated = await preparedQueries.users.updateById(userId, updateData, userId);
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        userCache.delete(userId);

        logHealthcareEvent('profile_updated', {
            updated_fields: Object.keys(updateData)
        }, userId);

        logAuditTrail('UPDATE', 'user_profile', userId, currentUser, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_user_profile',
            user_id: userId,
            update_data: updateData
        });

        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
    const userId = req.user.id;
    const clientIp = req.ip;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        const user = users[0];

        const [activeOrders] = await connection.execute(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN (?, ?, ?)',
            [userId, 'pending', 'approved', 'out_for_delivery']
        );

        if (activeOrders[0].count > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                error: 'Cannot delete account',
                message: 'You have active orders. Please wait for completion or contact support.',
                timestamp: new Date().toISOString()
            });
        }

        const deletionTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await connection.execute(
            `UPDATE users 
             SET email = ?, 
                 phone = ?, 
                 name = ?,
                 deleted_at = ?
             WHERE id = ?`,
            [
                `deleted_${userId}_${user.email}`,
                `deleted_${user.phone}`,
                'Deleted User',
                deletionTimestamp,
                userId
            ]
        );

        await connection.execute(
            'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = ? WHERE user_id = ?',
            ['account_deleted', userId]
        );

        await connection.commit();
        connection.release();

        userCache.delete(userId);

        logSecurityEvent('account_deleted', {
            user_id: userId,
            email: user.email,
            ip: clientIp
        }, userId, clientIp);

        logAuditTrail('DELETE', 'user_account', userId, user, null);

        res.json({
            success: true,
            message: 'Account deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        
        logError(error, {
            operation: 'delete_user_account',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to delete account',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  const userId = req.user.id;

  const page = Number(req.pagination?.page) || 1;
  const limit = Number(req.pagination?.limit) || 10;
  const offset = Number((page - 1) * limit);

  const { startDate, endDate } = req.dateRange || {};

  try {
    let query = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.prescription_id,
        o.medicines,
        o.total_amount,
        o.delivery_address,
        o.status,
        o.created_at,
        o.address_id,
        a.address_line1, 
        a.city, 
        a.state
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.user_id = ?
    `;
    const params = [userId];

    if (startDate) {
      query += ' AND o.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND o.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(String(limit), String(offset));

    const [orders] = await db.execute(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?';
    const countParams = [userId];

    if (startDate) {
      countQuery += ' AND created_at >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND created_at <= ?';
      countParams.push(endDate);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const totalItems = countResult?.[0]?.total || 0;

    res.json({
      success: true,
      data: orders.map(order => ({
        ...order,
        orderNumber: order.order_number,
        medicines: order.medicines ? JSON.parse(order.medicines) : [],
      })),
      pagination: {
        currentPage: page,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error, {
      operation: 'get_user_orders',
      user_id: userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      timestamp: new Date().toISOString(),
    });
  }
};

// Get user order by ID
export const getUserOrderById = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.orderId;

    try {
        const order = await preparedQueries.orders.findById(orderId, userId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: {
                ...order,
                medicines: JSON.parse(order.medicines)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_order_by_id',
            user_id: userId,
            order_id: orderId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch order',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user addresses
export const getUserAddresses = async (req, res) => {
    const userId = req.user.id;

    try {
        const addresses = await preparedQueries.addresses.findByUserId(userId);

        res.json({
            success: true,
            data: addresses,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_addresses',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch addresses',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user prescriptions
export const getUserPrescriptions = async (req, res) => {
    const userId = req.user.id;
    
    const page = parseInt(req.pagination?.page, 10) || 1;
    const limit = parseInt(req.pagination?.limit, 10) || 10;
    const offset = (page - 1) * limit;

    try {
        const [prescriptions] = await db.execute(
            `SELECT * FROM prescriptions 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM prescriptions WHERE user_id = ?',
            [userId]
        );

        const totalItems = countResult[0].total;

        res.json({
            success: true,
            data: prescriptions,
            pagination: {
                currentPage: page,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                itemsPerPage: limit,
                hasNextPage: page * limit < totalItems,
                hasPreviousPage: page > 1
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_prescriptions',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch prescriptions',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user prescription by ID
export const getUserPrescriptionById = async (req, res) => {
    const userId = req.user.id;
    const prescriptionId = req.params.prescriptionId;

    try {
        const [prescriptions] = await db.execute(
            'SELECT * FROM prescriptions WHERE id = ? AND user_id = ?',
            [prescriptionId, userId]
        );

        if (prescriptions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Prescription not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: prescriptions[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_prescription_by_id',
            user_id: userId,
            prescription_id: prescriptionId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch prescription',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user consultations
export const getUserConsultations = async (req, res) => {
    const userId = req.user.id;
    
    const page = parseInt(req.pagination?.page, 10) || 1;
    const limit = parseInt(req.pagination?.limit, 10) || 10;
    const offset = (page - 1) * limit;
    
    const { startDate, endDate } = req.dateRange || {};

    try {
        let query = `
            SELECT c.*, d.name as doctor_name, d.specialty, d.consultation_fee
            FROM consultations c
            JOIN doctors d ON c.doctor_id = d.id
            WHERE c.user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            query += ' AND c.consultation_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND c.consultation_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY c.consultation_date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [consultations] = await db.execute(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM consultations c JOIN doctors d ON c.doctor_id = d.id WHERE c.user_id = ?';
        const countParams = [userId];

        if (startDate) {
            countQuery += ' AND c.consultation_date >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ' AND c.consultation_date <= ?';
            countParams.push(endDate);
        }

        const [countResult] = await db.execute(countQuery, countParams);
        const totalItems = countResult[0].total;

        res.json({
            success: true,
            data: consultations,
            pagination: {
                currentPage: page,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                itemsPerPage: limit,
                hasNextPage: page * limit < totalItems,
                hasPreviousPage: page > 1
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_consultations',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch consultations',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user sessions
export const getUserSessions = async (req, res) => {
    const userId = req.user.id;

    try {
        const [sessions] = await db.execute(
            `SELECT session_id, ip_address, device_info, is_active, last_activity, created_at
             FROM user_sessions 
             WHERE user_id = ? 
             ORDER BY last_activity DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: sessions.map(session => ({
                ...session,
                device_info: JSON.parse(session.device_info || '{}')
            })),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_sessions',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions',
            timestamp: new Date().toISOString()
        });
    }
};

// Revoke user session
export const revokeUserSession = async (req, res) => {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;

    try {
        const [result] = await db.execute(
            'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = ? WHERE session_id = ? AND user_id = ?',
            ['manual', sessionId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
                timestamp: new Date().toISOString()
            });
        }

        logSecurityEvent('session_revoked', {
            session_id: sessionId,
            revoked_by: userId
        }, userId, req.ip);

        res.json({
            success: true,
            message: 'Session revoked successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'revoke_user_session',
            user_id: userId,
            session_id: sessionId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to revoke session',
            timestamp: new Date().toISOString()
        });
    }
};

// Revoke all user sessions
export const revokeAllUserSessions = async (req, res) => {
    const userId = req.user.id;

    try {
        await db.execute(
            'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = ? WHERE user_id = ? AND is_active = 1',
            ['manual', userId]
        );

        userCache.delete(userId);

        logSecurityEvent('all_sessions_revoked', {
            user_id: userId
        }, userId, req.ip);

        res.json({
            success: true,
            message: 'All sessions revoked successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'revoke_all_user_sessions',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to revoke sessions',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user statistics
export const getUserStats = async (req, res) => {
    const userId = req.user.id;

    try {
        const [orderStats] = await db.execute(
            `SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as pendingOrders,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completedOrders,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cancelledOrders,
                COALESCE(SUM(CASE WHEN status = ? THEN total_amount ELSE 0 END), 0) as totalSpent
             FROM orders WHERE user_id = ?`,
            ['pending', 'confirmed', 'delivered', 'cancelled', 'delivered', userId]
        );

        res.json({
            success: true,
            data: {
                totalOrders: orderStats[0].totalOrders || 0,
                pendingOrders: orderStats[0].pendingOrders || 0,
                completedOrders: orderStats[0].completedOrders || 0,
                cancelledOrders: orderStats[0].cancelledOrders || 0,
                totalSpent: parseFloat(orderStats[0].totalSpent) || 0
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_stats',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics',
            timestamp: new Date().toISOString()
        });
    }
};

// ============================================================================
// USER PROFILE DETAIL ENDPOINTS (Updated with helper functions)
// ============================================================================

// Get user profile details
export const getUserProfileDetails = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await preparedQueries.userProfiles.findByUserId(userId);
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                message: 'User profile has not been created yet',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('profile_details_accessed', {
            user_id: userId,
            customer_id: profile.customer_unique_id
        }, userId);

        res.json({
            success: true,
            data: formatProfileResponse(profile),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_profile_details',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile details',
            timestamp: new Date().toISOString()
        });
    }
};

// Update user profile details
export const updateUserProfileDetails = async (req, res) => {
    const userId = req.user.id;
    const updateData = req.validatedData || req.body || {};
    const clientIp = req.ip;

    try {
        const allowedFields = [
            'full_name',
            'profile_picture',
            'gender',
            'date_of_birth',
            'blood_group',
            'email_verified',
            'mobile_verified',
            'alternate_contact'
        ];

        const fieldsToUpdate = {};
        Object.keys(updateData).forEach(key => {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(dbKey)) {
                if (dbKey === 'date_of_birth' && updateData[key]) {
                    const dateValue = updateData[key];
                    if (typeof dateValue === 'string') {
                        fieldsToUpdate[dbKey] = dateValue.split('T')[0];
                    } else if (dateValue instanceof Date) {
                        fieldsToUpdate[dbKey] = dateValue.toISOString().split('T')[0];
                    } else {
                        fieldsToUpdate[dbKey] = dateValue;
                    }
                } else {
                    fieldsToUpdate[dbKey] = updateData[key];
                }
            }
        });

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update',
                message: 'Provide at least one valid field: fullName, profilePicture, gender, dateOfBirth, bloodGroup, emailVerified, mobileVerified, alternateContact',
                timestamp: new Date().toISOString()
            });
        }

        const existingProfile = await preparedQueries.userProfiles.findByUserId(userId);
        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                message: 'User profile does not exist',
                timestamp: new Date().toISOString()
            });
        }

        const updated = await preparedQueries.userProfiles.updateById(userId, fieldsToUpdate, userId);
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('profile_details_updated', {
            user_id: userId,
            updated_fields: Object.keys(fieldsToUpdate)
        }, userId);

        logAuditTrail('UPDATE', 'user_profiles', userId, existingProfile, fieldsToUpdate);

        const updatedProfile = await preparedQueries.userProfiles.findByUserId(userId);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: formatProfileResponse(updatedProfile),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_user_profile_details',
            user_id: userId,
            update_data: updateData
        });

        res.status(500).json({
            success: false,
            error: 'Failed to update profile details',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete specific profile field
export const deleteUserProfileField = async (req, res) => {
    const userId = req.user.id;
    const { field } = req.params;
    const clientIp = req.ip;

    try {
        const allowedFields = [
            'full_name',
            'profile_picture',
            'gender',
            'date_of_birth',
            'blood_group',
            'alternate_contact'
        ];

        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();

        if (!allowedFields.includes(dbField)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid field',
                message: `Cannot delete field: ${field}. Allowed fields: fullName, profilePicture, gender, dateOfBirth, bloodGroup, alternateContact`,
                timestamp: new Date().toISOString()
            });
        }

        const existingProfile = await preparedQueries.userProfiles.findByUserId(userId);
        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                message: 'User profile does not exist',
                timestamp: new Date().toISOString()
            });
        }

        const deleted = await preparedQueries.userProfiles.deleteField(userId, dbField);
        if (!deleted) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete field',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('profile_field_deleted', {
            user_id: userId,
            deleted_field: dbField
        }, userId);

        logAuditTrail('DELETE', 'user_profiles_field', userId, { field: dbField }, null);

        const updatedProfile = await preparedQueries.userProfiles.findByUserId(userId);

        res.json({
            success: true,
            message: `Profile field '${field}' deleted successfully`,
            data: formatProfileResponse(updatedProfile),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'delete_user_profile_field',
            user_id: userId,
            field
        });

        res.status(500).json({
            success: false,
            error: 'Failed to delete profile field',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete all profile fields
export const deleteAllUserProfileFields = async (req, res) => {
    const userId = req.user.id;
    const clientIp = req.ip;

    try {
        const existingProfile = await preparedQueries.userProfiles.findByUserId(userId);
        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found',
                message: 'User profile does not exist',
                timestamp: new Date().toISOString()
            });
        }

        const deleted = await preparedQueries.userProfiles.deleteAllFields(userId);
        if (!deleted) {
            return res.status(500).json({
                success: false,
                error: 'Failed to delete profile data',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('all_profile_fields_deleted', {
            user_id: userId
        }, userId);

        logAuditTrail('DELETE', 'user_profiles_all', userId, existingProfile, null);

        const updatedProfile = await preparedQueries.userProfiles.findByUserId(userId);

        res.json({
            success: true,
            message: 'All profile fields deleted successfully',
            data: formatProfileResponse(updatedProfile),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'delete_all_user_profile_fields',
            user_id: userId
        });

        res.status(500).json({
            success: false,
            error: 'Failed to delete all profile fields',
            timestamp: new Date().toISOString()
        });
    }
};
