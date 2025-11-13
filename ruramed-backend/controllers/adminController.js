import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, checkDatabaseHealth } from '../config/database.js';
import { cache } from '../utils/cache.js';
import fs from 'fs/promises';
import path from 'path';
import { 
    logger, 
    logAuthEvent, 
    logSecurityEvent, 
    logError, 
    logAuditTrail 
} from '../utils/logger.js';
import { hashPassword, verifyPassword } from '../utils/validation.js';

// Admin login
export const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    const clientIp = req.ip;
    const deviceInfo = req.deviceInfo;

    try {
        // Find admin by email
        const [adminRows] = await db.execute(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );

        if (adminRows.length === 0) {
            logSecurityEvent('admin_login_invalid_email', { email }, null, clientIp);
            
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
                timestamp: new Date().toISOString()
            });
        }

        const admin = adminRows[0];

        // Verify password
        const { success: verifySuccess, isValid } = await verifyPassword(password, admin.password);
        if (!verifySuccess || !isValid) {
            logSecurityEvent('admin_login_invalid_password', {
                email,
                admin_id: admin.id
            }, admin.id, clientIp);

            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
                timestamp: new Date().toISOString()
            });
        }

        // Generate JWT token with admin role
        const token = jwt.sign(
            { 
                id: admin.id, 
                email: admin.email, 
                role: 'admin' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Shorter session for admin
        );

        logAuthEvent('admin_login_success', admin.id, clientIp, {
            email,
            device_fingerprint: deviceInfo.fingerprint
        });

        res.json({
            message: 'Admin login successful',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: 'admin'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'admin_login',
            email,
            ip: clientIp
        });

        res.status(500).json({
            error: 'Login failed',
            timestamp: new Date().toISOString()
        });
    }
};

// Get dashboard data
export const getDashboard = async (req, res) => {
    const adminId = req.user.id;

    try {
        // Get key metrics
        const [userStats] = await db.execute(
            'SELECT COUNT(*) as total_users, COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today FROM users'
        );

        const [orderStats] = await db.execute(
            `SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as orders_today,
                SUM(total_amount) as total_revenue
             FROM orders`
        );

        const [medicineStats] = await db.execute(
            'SELECT COUNT(*) as total_medicines, COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_medicines FROM medicines'
        );

        const [doctorStats] = await db.execute(
            'SELECT COUNT(*) as total_doctors, COUNT(CASE WHEN available = 1 THEN 1 END) as available_doctors FROM doctors'
        );

        const [recentOrders] = await db.execute(
            `SELECT o.id, o.total_amount, o.status, o.created_at, u.name as user_name
             FROM orders o
             JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC
             LIMIT 5`
        );

        const dashboardData = {
            metrics: {
                users: userStats[0],
                orders: orderStats[0],
                medicines: medicineStats[0],
                doctors: doctorStats[0]
            },
            recent_orders: recentOrders,
            system_health: await checkDatabaseHealth(),
            timestamp: new Date().toISOString()
        };

        logAuthEvent('admin_dashboard_accessed', adminId, req.ip);

        res.json(dashboardData);

    } catch (error) {
        logError(error, {
            operation: 'get_dashboard',
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to fetch dashboard data',
            timestamp: new Date().toISOString()
        });
    }
};

// Get analytics overview
export const getAnalyticsOverview = async (req, res) => {
    const { startDate, endDate } = req.dateRange || {};
    const adminId = req.user.id;

    try {
        let dateFilter = '';
        const params = [];

        if (startDate) {
            dateFilter += ' AND created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ' AND created_at <= ?';
            params.push(endDate);
        }

        // Sales analytics
        const [salesData] = await db.execute(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue
             FROM orders 
             WHERE 1=1 ${dateFilter}
             GROUP BY DATE(created_at)
             ORDER BY date DESC
             LIMIT 30`,
            params
        );

        // User growth
        const [userGrowth] = await db.execute(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
             FROM users 
             WHERE 1=1 ${dateFilter}
             GROUP BY DATE(created_at)
             ORDER BY date DESC
             LIMIT 30`,
            params
        );

        // Top medicines
        const [topMedicines] = await db.execute(
            `SELECT m.name, COUNT(*) as order_count
             FROM medicines m
             JOIN orders o ON JSON_CONTAINS(o.medicines, JSON_OBJECT('id', m.id))
             WHERE o.created_at >= CURDATE() - INTERVAL 30 DAY
             GROUP BY m.id, m.name
             ORDER BY order_count DESC
             LIMIT 10`
        );

        res.json({
            sales_data: salesData,
            user_growth: userGrowth,
            top_medicines: topMedicines,
            date_range: {
                start: startDate,
                end: endDate
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_analytics_overview',
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to fetch analytics',
            timestamp: new Date().toISOString()
        });
    }
};

// Get all users
export const getAllUsers = async (req, res) => {
    const { page, limit, offset } = req.pagination;
    const adminId = req.user.id;

    try {
        const [users] = await db.execute(
            `SELECT id, name, email, phone, location, created_at
             FROM users 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await db.execute('SELECT COUNT(*) as total FROM users');

        res.json({
            users,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_all_users',
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to fetch users',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user details
export const getUserDetails = async (req, res) => {
    const userId = req.params.id;
    const adminId = req.user.id;

    try {
        const [users] = await db.execute(
            'SELECT id, name, email, phone, location, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        // Get user statistics
        const [orderStats] = await db.execute(
            'SELECT COUNT(*) as total_orders, SUM(total_amount) as total_spent FROM orders WHERE user_id = ?',
            [userId]
        );

        const [addressCount] = await db.execute(
            'SELECT COUNT(*) as address_count FROM addresses WHERE user_id = ?',
            [userId]
        );

        res.json({
            user: users[0],
            statistics: {
                ...orderStats[0],
                ...addressCount[0]
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_user_details',
            user_id: userId,
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to fetch user details',
            timestamp: new Date().toISOString()
        });
    }
};

// Get security events
export const getSecurityEvents = async (req, res) => {
    const { page, limit, offset } = req.pagination;
    const { startDate, endDate } = req.dateRange || {};

    try {
        let query = 'SELECT * FROM security_events WHERE 1=1';
        const params = [];

        if (startDate) {
            query += ' AND created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND created_at <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [events] = await db.execute(query, params);

        res.json({
            security_events: events.map(event => ({
                ...event,
                event_data: JSON.parse(event.event_data || '{}'),
                network_info: JSON.parse(event.network_info || '{}'),
                geo_location: JSON.parse(event.geo_location || '{}')
            })),
            pagination: { page, limit, total: events.length },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_security_events',
            admin_id: req.user.id
        });

        res.status(500).json({
            error: 'Failed to fetch security events',
            timestamp: new Date().toISOString()
        });
    }
};

// Get system health
export const getSystemHealth = async (req, res) => {
    try {
        const health = await checkDatabaseHealth();
        const cacheStats = cache.getStats();
        
        const systemInfo = {
            database: health,
            cache: {
                status: 'healthy',
                stats: cacheStats
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                node_version: process.version
            },
            timestamp: new Date().toISOString()
        };

        res.json(systemInfo);

    } catch (error) {
        logError(error, {
            operation: 'get_system_health',
            admin_id: req.user.id
        });

        res.status(500).json({
            error: 'Failed to fetch system health',
            timestamp: new Date().toISOString()
        });
    }
};

// Clear cache
export const clearCache = async (req, res) => {
    const adminId = req.user.id;

    try {
        const beforeSize = typeof cache?.cache?.size === 'number' ? cache.cache.size : undefined;
        const ok = cache.flush();
        const afterSize = typeof cache?.cache?.size === 'number' ? cache.cache.size : undefined;

        logSecurityEvent('cache_cleared', {
            admin_id: adminId,
            before_size: beforeSize,
            after_size: afterSize,
            success: ok === true
        }, adminId, req.ip);

        res.json({
            message: 'Cache cleared successfully',
            before_size: beforeSize,
            after_size: afterSize,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'clear_cache',
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to clear cache',
            timestamp: new Date().toISOString()
        });
    }
};

// Create admin
export const createAdmin = async (req, res) => {
    const { name, email, password } = req.validatedData;
    const adminId = req.user.id;

    try {
        // Check if admin already exists
        const [existingAdmin] = await db.execute(
            'SELECT id FROM admins WHERE email = ?',
            [email]
        );

        if (existingAdmin.length > 0) {
            return res.status(409).json({
                error: 'Admin already exists',
                timestamp: new Date().toISOString()
            });
        }

        // Hash password
        const { success, hash } = await hashPassword(password);
        if (!success) {
            throw new Error('Password hashing failed');
        }

        // Create admin
        const [result] = await db.execute(
            'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
            [name, email, hash]
        );

        logSecurityEvent('admin_created', {
            new_admin_id: result.insertId,
            new_admin_email: email,
            created_by: adminId
        }, adminId, req.ip);

        logAuditTrail('CREATE', 'admin', adminId, null, {
            admin_id: result.insertId,
            name,
            email
        });

        res.status(201).json({
            message: 'Admin created successfully',
            admin_id: result.insertId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'create_admin',
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to create admin',
            timestamp: new Date().toISOString()
        });
    }
};

// User analytics (registrations over time, top locations)
export const getUserAnalytics = async (req, res) => {
    const { startDate, endDate } = req.dateRange || {};
    try {
        const params = [];
        let filter = '';
        if (startDate) { filter += ' AND created_at >= ?'; params.push(startDate); }
        if (endDate)   { filter += ' AND created_at <= ?'; params.push(endDate); }

        const [byDay] = await db.execute(
            `SELECT DATE(created_at) as day, COUNT(*) as registrations
             FROM users WHERE 1=1 ${filter}
             GROUP BY DATE(created_at)
             ORDER BY day DESC LIMIT 60`, params);

        const [topLocations] = await db.execute(
            `SELECT COALESCE(location,'Unknown') as location, COUNT(*) as users
             FROM users WHERE 1=1 ${filter}
             GROUP BY COALESCE(location,'Unknown')
             ORDER BY users DESC LIMIT 10`, params);

        res.json({ users_by_day: byDay, top_locations: topLocations, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_user_analytics' });
        res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
};

// Sales analytics (orders and revenue)
export const getSalesAnalytics = async (req, res) => {
    const { startDate, endDate } = req.dateRange || {};
    try {
        const params = [];
        let filter = '';
        if (startDate) { filter += ' AND created_at >= ?'; params.push(startDate); }
        if (endDate)   { filter += ' AND created_at <= ?'; params.push(endDate); }

        const [byDay] = await db.execute(
            `SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total_amount) as revenue
             FROM orders WHERE 1=1 ${filter}
             GROUP BY DATE(created_at)
             ORDER BY day DESC LIMIT 60`, params);

        const [byStatus] = await db.execute(
            `SELECT status, COUNT(*) as count, SUM(total_amount) as revenue
             FROM orders WHERE 1=1 ${filter}
             GROUP BY status`, params);

        res.json({ sales_by_day: byDay, by_status: byStatus, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_sales_analytics' });
        res.status(500).json({ error: 'Failed to fetch sales analytics' });
    }
};

// Update user status - schema has no status field; implement administrative actions
export const updateUserStatus = async (req, res) => {
    const userId = req.params.id;
    const { action } = req.body; // expected: 'revoke_sessions' or 'block_devices'

    if (!action) {
        return res.status(400).json({ error: 'action is required (revoke_sessions|block_devices)' });
    }

    try {
        if (action === 'revoke_sessions') {
            await db.execute(
                'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = "admin" WHERE user_id = ? AND is_active = 1',
                [userId]
            );
        } else if (action === 'block_devices') {
            // Mark devices as blocked in device_tracking
            await db.execute('UPDATE device_tracking SET is_blocked = 1 WHERE user_id = ?', [userId]);
        } else {
            return res.status(400).json({ error: 'Unsupported action' });
        }

        logSecurityEvent('admin_user_status_action', { user_id: userId, action }, req.user.id, req.ip);
        res.json({ message: 'Action completed', user_id: userId, action, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'update_user_status', user_id: userId });
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

// Delete user (only if no dependent orders/prescriptions)
export const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        const [[orderCnt]] = await db.execute('SELECT COUNT(*) as c FROM orders WHERE user_id = ?', [userId]);
        const [[rxCnt]]    = await db.execute('SELECT COUNT(*) as c FROM prescriptions WHERE user_id = ?', [userId]);
        if (orderCnt.c > 0 || rxCnt.c > 0) {
            return res.status(400).json({ error: 'User has related orders/prescriptions; cannot delete' });
        }
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted', user_id: userId, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'delete_user', user_id: userId });
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Orders (admin)
export const getAllOrders = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    const { startDate, endDate } = req.dateRange || {};
    try {
        let baseQuery = `FROM orders o JOIN users u ON o.user_id = u.id WHERE 1=1`;
        const params = [];
        if (startDate) { baseQuery += ' AND o.created_at >= ?'; params.push(startDate); }
        if (endDate)   { baseQuery += ' AND o.created_at <= ?'; params.push(endDate); }

        // Data query (inline LIMIT/OFFSET to avoid PS issues)
        const dataQuery = `SELECT o.*, u.name AS user_name, u.email AS user_email ${baseQuery} ORDER BY o.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
        const [rows] = await db.execute(dataQuery, params);

        // Count query with same filters
        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
        const [[cnt]] = await db.execute(countQuery, params);

        res.json({ orders: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_all_orders' });
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const updateOrderStatus = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const allowed = ['pending','approved','out_for_delivery','delivered'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }
    try {
        const [result] = await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order status updated', order_id: orderId, status, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'update_order_status', order_id: orderId });
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// Prescriptions
export const getAllPrescriptions = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const [rows] = await db.execute(
            `SELECT p.*, u.name AS user_name, u.email AS user_email
             FROM prescriptions p JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
        const [[cnt]] = await db.execute('SELECT COUNT(*) as total FROM prescriptions');
        res.json({ prescriptions: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_all_prescriptions' });
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
};

export const getPendingPrescriptions = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const [rows] = await db.execute(
            `SELECT p.*, u.name AS user_name, u.email AS user_email
             FROM prescriptions p JOIN users u ON p.user_id = u.id
             WHERE p.status = 'pending'
             ORDER BY p.created_at ASC LIMIT ? OFFSET ?`, [limit, offset]);
        const [[cnt]] = await db.execute("SELECT COUNT(*) as total FROM prescriptions WHERE status = 'pending'");
        res.json({ prescriptions: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_pending_prescriptions' });
        res.status(500).json({ error: 'Failed to fetch pending prescriptions' });
    }
};

export const approvePrescription = async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await db.execute("UPDATE prescriptions SET status='approved' WHERE id = ?", [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Prescription not found' });
        res.json({ message: 'Prescription approved', id, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'approve_prescription', id });
        res.status(500).json({ error: 'Failed to approve prescription' });
    }
};

export const rejectPrescription = async (req, res) => {
    const id = req.params.id;
    const { doctor_notes } = req.body || {};
    try {
        const [result] = await db.execute("UPDATE prescriptions SET status='rejected', doctor_notes = ? WHERE id = ?", [doctor_notes || null, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Prescription not found' });
        res.json({ message: 'Prescription rejected', id, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'reject_prescription', id });
        res.status(500).json({ error: 'Failed to reject prescription' });
    }
};

// Audit logs from security_events (no dedicated audit table in schema)
export const getAuditLogs = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    const { startDate, endDate } = req.dateRange || {};
    try {
        let query = 'SELECT * FROM security_events WHERE 1=1';
        const params = [];
        if (startDate) { query += ' AND created_at >= ?'; params.push(startDate); }
        if (endDate)   { query += ' AND created_at <= ?'; params.push(endDate); }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [rows] = await db.execute(query, params);
        res.json({ logs: rows, pagination: { page, limit, total: rows.length }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_audit_logs' });
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

export const getActiveSessions = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const [rows] = await db.execute(
            `SELECT s.*, u.email, u.name FROM user_sessions s JOIN users u ON s.user_id = u.id
             WHERE s.is_active = 1 ORDER BY s.last_activity DESC LIMIT ? OFFSET ?`, [limit, offset]);
        const [[cnt]] = await db.execute('SELECT COUNT(*) as total FROM user_sessions WHERE is_active = 1');
        res.json({ sessions: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_active_sessions' });
        res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
};

export const revokeSession = async (req, res) => {
    const sessionId = req.params.sessionId;
    try {
        const [result] = await db.execute(
            'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = "admin" WHERE session_id = ?',
            [sessionId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session revoked', session_id: sessionId, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'revoke_session', session_id: sessionId });
        res.status(500).json({ error: 'Failed to revoke session' });
    }
};

export const getSystemLogs = async (req, res) => {
    try {
        const logPath = path.resolve(process.cwd(), 'logs', 'error.log');
        const content = await fs.readFile(logPath, 'utf8');
        // Return last ~200 lines to avoid huge payloads
        const lines = content.trim().split(/\r?\n/);
        const tail = lines.slice(-200);
        res.json({ lines: tail, count: tail.length, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_system_logs' });
        res.status(500).json({ error: 'Failed to read system logs' });
    }
};

export const getAllAdmins = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const sql = `SELECT id, name, email, created_at FROM admins ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
        const [rows] = await db.execute(sql);
        const [[cnt]] = await db.execute('SELECT COUNT(*) as total FROM admins');
        res.json({ admins: rows, pagination: { page, limit, total: cnt.total, pages: Math.ceil(cnt.total / limit) }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_all_admins' });
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
};

export const deleteAdmin = async (req, res) => {
    const id = req.params.id;
    const currentAdminId = req.user.id;
    if (parseInt(id) === parseInt(currentAdminId)) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    try {
        const [result] = await db.execute('DELETE FROM admins WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Admin not found' });
        res.json({ message: 'Admin deleted', admin_id: id, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'delete_admin', id });
        res.status(500).json({ error: 'Failed to delete admin' });
    }
};
