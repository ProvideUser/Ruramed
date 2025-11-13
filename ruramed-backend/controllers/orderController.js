import { db, withTransaction } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { 
    logger, 
    logHealthcareEvent, 
    logError, 
    logAuditTrail,
    logOrderOperation 
} from '../utils/logger.js';

// Get user orders
export const getUserOrders = async (req, res) => {
    const userId = req.user.id;
    const { page, limit, offset } = req.pagination;
    const { startDate, endDate } = req.dateRange || {};

    try {
        const orders = await preparedQueries.orders.findByUserId(userId, null, limit, offset);

        // Apply date filters if provided
        let filteredOrders = orders;
        if (startDate || endDate) {
            filteredOrders = orders.filter(order => {
                const orderDate = new Date(order.created_at);
                if (startDate && orderDate < startDate) return false;
                if (endDate && orderDate > endDate) return false;
                return true;
            });
        }

        res.json({
            orders: filteredOrders.map(order => ({
                ...order,
                medicines: JSON.parse(order.medicines)
            })),
            pagination: {
                page,
                limit,
                total: filteredOrders.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_orders',
            user_id: userId
        });

        res.status(500).json({
            error: 'Failed to fetch orders',
            timestamp: new Date().toISOString()
        });
    }
};

// Create new order
export const createOrder = async (req, res) => {
    const userId = req.user.id;
    const { medicines, address_id, prescription_id } = req.validatedData;

    try {
        const orderId = await withTransaction(async (connection) => {
            // Validate address belongs to user
            const [addressCheck] = await connection.execute(
                'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
                [address_id, userId]
            );

            if (addressCheck.length === 0) {
                throw new Error('Invalid address');
            }

            // Calculate total amount
            let totalAmount = 0;
            const medicineDetails = [];

            for (const medicine of medicines) {
                const [medicineData] = await connection.execute(
                    'SELECT id, name, price, requires_prescription FROM medicines WHERE id = ? AND is_active = 1',
                    [medicine.id]
                );

                if (medicineData.length === 0) {
                    throw new Error(`Medicine with ID ${medicine.id} not found`);
                }

                const med = medicineData[0];
                const itemTotal = med.price * medicine.quantity;
                totalAmount += itemTotal;

                medicineDetails.push({
                    id: med.id,
                    name: med.name,
                    price: med.price,
                    quantity: medicine.quantity,
                    total: itemTotal,
                    requires_prescription: med.requires_prescription
                });
            }

            // Check if prescription is required
            const requiresPrescription = medicineDetails.some(med => med.requires_prescription);
            if (requiresPrescription && !prescription_id) {
                throw new Error('Prescription required for one or more medicines');
            }

            // Create order
            const [orderResult] = await connection.execute(
                'INSERT INTO orders (user_id, medicines, total_amount, address_id, prescription_id, status) VALUES (?, ?, ?, ?, ?, "pending")',
                [userId, JSON.stringify(medicineDetails), totalAmount, address_id, prescription_id]
            );

            return orderResult.insertId;
        });

        logOrderOperation('created', orderId, userId, {
            total_amount: req.validatedData.total_amount,
            medicine_count: medicines.length,
            requires_prescription: !!prescription_id
        });

        logAuditTrail('CREATE', 'order', userId, null, {
            order_id: orderId,
            medicines: medicines.length,
            total_amount: req.validatedData.total_amount
        });

        res.status(201).json({
            message: 'Order created successfully',
            order_id: orderId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'create_order',
            user_id: userId,
            order_data: req.validatedData
        });

        if (error.message.includes('Invalid address') || error.message.includes('not found') || error.message.includes('Prescription required')) {
            return res.status(400).json({
                error: 'Order validation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }

        res.status(500).json({
            error: 'Failed to create order',
            timestamp: new Date().toISOString()
        });
    }
};

// Get order by ID
export const getOrderById = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const order = await preparedQueries.orders.findById(orderId, userId);
        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            order: {
                ...order,
                medicines: JSON.parse(order.medicines)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_order_by_id',
            user_id: userId,
            order_id: orderId
        });

        res.status(500).json({
            error: 'Failed to fetch order',
            timestamp: new Date().toISOString()
        });
    }
};

// Cancel order
export const cancelOrder = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        // Check if order exists and belongs to user
        const order = await preparedQueries.orders.findById(orderId, userId);
        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        // Check if order can be cancelled
        if (!['pending', 'approved'].includes(order.status)) {
            return res.status(400).json({
                error: 'Order cannot be cancelled',
                message: `Orders with status '${order.status}' cannot be cancelled`,
                timestamp: new Date().toISOString()
            });
        }

        // Update order status
        const updated = await preparedQueries.orders.updateStatus(orderId, 'cancelled', userId);
        if (!updated) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        logOrderOperation('cancelled', orderId, userId, {
            previous_status: order.status
        });

        logAuditTrail('UPDATE', 'order_status', userId, 
            { status: order.status }, 
            { status: 'cancelled' }
        );

        res.json({
            message: 'Order cancelled successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'cancel_order',
            user_id: userId,
            order_id: orderId
        });

        res.status(500).json({
            error: 'Failed to cancel order',
            timestamp: new Date().toISOString()
        });
    }
};

// Get order tracking
export const getOrderTracking = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const order = await preparedQueries.orders.findById(orderId, userId);
        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        // Mock tracking data - in real implementation, this would come from delivery service
        const trackingSteps = [
            { status: 'pending', message: 'Order placed', completed: true, timestamp: order.created_at },
            { status: 'approved', message: 'Order approved', completed: order.status !== 'pending', timestamp: order.status !== 'pending' ? order.updated_at : null },
            { status: 'out_for_delivery', message: 'Out for delivery', completed: ['out_for_delivery', 'delivered'].includes(order.status), timestamp: ['out_for_delivery', 'delivered'].includes(order.status) ? order.updated_at : null },
            { status: 'delivered', message: 'Delivered', completed: order.status === 'delivered', timestamp: order.status === 'delivered' ? order.updated_at : null }
        ];

        res.json({
            order_id: orderId,
            current_status: order.status,
            tracking: trackingSteps,
            estimated_delivery: order.status === 'out_for_delivery' ? 
                new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null, // 2 hours from now
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_order_tracking',
            user_id: userId,
            order_id: orderId
        });

        res.status(500).json({
            error: 'Failed to fetch order tracking',
            timestamp: new Date().toISOString()
        });
    }
};

// Get order receipt
export const getOrderReceipt = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const order = await preparedQueries.orders.findById(orderId, userId);
        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        const receipt = {
            order_id: orderId,
            order_date: order.created_at,
            customer: {
                name: order.user_name,
                email: order.user_email
            },
            delivery_address: {
                line1: order.address_line1,
                city: order.city,
                state: order.state,
                postal_code: order.postal_code
            },
            medicines: JSON.parse(order.medicines),
            total_amount: order.total_amount,
            status: order.status,
            generated_at: new Date().toISOString()
        };

        logHealthcareEvent('receipt_generated', {
            order_id: orderId
        }, userId);

        res.json({ receipt });

    } catch (error) {
        logError(error, {
            operation: 'get_order_receipt',
            user_id: userId,
            order_id: orderId
        });

        res.status(500).json({
            error: 'Failed to generate receipt',
            timestamp: new Date().toISOString()
        });
    }
};

// Reorder from previous order
export const reorderFromPrevious = async (req, res) => {
    const userId = req.user.id;
    const previousOrderId = req.params.id;

    try {
        const previousOrder = await preparedQueries.orders.findById(previousOrderId, userId);
        if (!previousOrder) {
            return res.status(404).json({
                error: 'Previous order not found',
                timestamp: new Date().toISOString()
            });
        }

        const medicines = JSON.parse(previousOrder.medicines);
        
        // Validate medicines are still available
        const validMedicines = [];
        for (const medicine of medicines) {
            const [medicineCheck] = await db.execute(
                'SELECT id, price, is_active FROM medicines WHERE id = ?',
                [medicine.id]
            );

            if (medicineCheck.length > 0 && medicineCheck[0].is_active) {
                validMedicines.push({
                    id: medicine.id,
                    quantity: medicine.quantity,
                    current_price: medicineCheck[0].price
                });
            }
        }

        if (validMedicines.length === 0) {
            return res.status(400).json({
                error: 'No medicines available for reorder',
                message: 'All medicines from the previous order are currently unavailable',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: 'Reorder data prepared',
            medicines: validMedicines,
            address_id: previousOrder.address_id,
            unavailable_count: medicines.length - validMedicines.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'reorder_from_previous',
            user_id: userId,
            previous_order_id: previousOrderId
        });

        res.status(500).json({
            error: 'Failed to prepare reorder',
            timestamp: new Date().toISOString()
        });
    }
};

// Admin functions
export const getAllOrdersAdmin = async (req, res) => {
    const { page, limit, offset } = req.pagination;
    const { startDate, endDate } = req.dateRange || {};

    try {
        let query = `
            SELECT o.*, u.name as user_name, u.email as user_email,
                   a.address_line1, a.city, a.state
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN addresses a ON o.address_id = a.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ' AND o.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND o.created_at <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [orders] = await db.execute(query, params);

        res.json({
            orders: orders.map(order => ({
                ...order,
                medicines: JSON.parse(order.medicines)
            })),
            pagination: { page, limit, total: orders.length },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_all_orders_admin',
            admin_id: req.user.id
        });

        res.status(500).json({
            error: 'Failed to fetch orders',
            timestamp: new Date().toISOString()
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const adminId = req.user.id;

    try {
        const updated = await preparedQueries.orders.updateStatus(orderId, status, adminId);
        if (!updated) {
            return res.status(404).json({
                error: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        logOrderOperation('status_updated', orderId, adminId, {
            new_status: status
        });

        res.json({
            message: 'Order status updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_order_status',
            order_id: orderId,
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to update order status',
            timestamp: new Date().toISOString()
        });
    }
};

export const approveOrder = async (req, res) => {
    const orderId = req.params.id;
    try {
        const [result] = await db.execute("UPDATE orders SET status = 'approved' WHERE id = ?", [orderId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order approved', order_id: orderId, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'approve_order', order_id: orderId });
        res.status(500).json({ error: 'Failed to approve order' });
    }
};

export const rejectOrder = async (req, res) => {
    const orderId = req.params.id;
    // Orders schema does not support 'rejected'; we revert to 'pending'
    try {
        const [result] = await db.execute("UPDATE orders SET status = 'pending' WHERE id = ?", [orderId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order set to pending (reject unsupported by schema)', order_id: orderId, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'reject_order', order_id: orderId });
        res.status(500).json({ error: 'Failed to update order' });
    }
};

export const getOrderAnalytics = async (req, res) => {
    const { startDate, endDate } = req.dateRange || {};
    try {
        const params = [];
        let filter = '';
        if (startDate) { filter += ' AND created_at >= ?'; params.push(startDate); }
        if (endDate)   { filter += ' AND created_at <= ?'; params.push(endDate); }
        const [byDay] = await db.execute(
            `SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total_amount) as revenue
             FROM orders WHERE 1=1 ${filter} GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 60`, params);
        const [byStatus] = await db.execute(
            `SELECT status, COUNT(*) as count FROM orders WHERE 1=1 ${filter} GROUP BY status`, params);
        res.json({ sales_by_day: byDay, by_status: byStatus, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_order_analytics' });
        res.status(500).json({ error: 'Failed to fetch order analytics' });
    }
};

export const getPendingOrders = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const [rows] = await db.execute("SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC LIMIT ? OFFSET ?", [limit, offset]);
        const [[cnt]] = await db.execute("SELECT COUNT(*) as total FROM orders WHERE status = 'pending'");
        res.json({ orders: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_pending_orders' });
        res.status(500).json({ error: 'Failed to fetch pending orders' });
    }
};
