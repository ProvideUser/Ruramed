import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { logger, logError, logSecurityEvent, logAuthEvent } from '../utils/logger.js';
import { userCache } from '../utils/cache.js';
import dotenv from 'dotenv';

dotenv.config();

// Enhanced token authentication middleware
export const authenticateToken = async (req, res, next) => {
    const startTime = Date.now();
    const authHeader = req.headers['authorization'];
    const userAgent = req.get('User-Agent');
    const clientIp = req.ip;

    // Check for authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logSecurityEvent('missing_auth_header', {
            endpoint: req.originalUrl,
            method: req.method,
            user_agent: userAgent
        }, null, clientIp);

        return res.status(401).json({ 
            error: 'Authorization header missing or malformed',
            message: 'Please provide a valid Bearer token',
            timestamp: new Date().toISOString()
        });
    }

    const token = authHeader.split(' ')[1];

    // Check for empty token
    if (!token) {
        logSecurityEvent('empty_auth_token', {
            endpoint: req.originalUrl,
            method: req.method
        }, null, clientIp);

        return res.status(401).json({ 
            error: 'Access token required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Validate token structure
        if (!decoded.id || !decoded.email) {
            logSecurityEvent('malformed_jwt_payload', {
                endpoint: req.originalUrl,
                token_payload_keys: Object.keys(decoded)
            }, decoded.id, clientIp);

            return res.status(403).json({ 
                error: 'Invalid token structure',
                timestamp: new Date().toISOString()
            });
        }

        // Check token expiration (additional validation)
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            logAuthEvent('token_expired_validation', decoded.id, clientIp, {
                expired_at: new Date(decoded.exp * 1000).toISOString(),
                endpoint: req.originalUrl
            });

            return res.status(401).json({ 
                error: 'Token expired',
                expired_at: new Date(decoded.exp * 1000).toISOString(),
                timestamp: new Date().toISOString()
            });
        }

        // If token is for admin, validate against admins table and bypass user cache
        if (decoded.role === 'admin') {
            const [adminRows] = await db.execute(
                'SELECT id, name, email FROM admins WHERE id = ? AND email = ?',
                [decoded.id, decoded.email]
            );

            if (adminRows.length === 0) {
                logSecurityEvent('token_admin_not_found', {
                    admin_id: decoded.id,
                    email: decoded.email,
                    endpoint: req.originalUrl
                }, decoded.id, clientIp);

                return res.status(403).json({ 
                    error: 'Admin not found or disabled',
                    timestamp: new Date().toISOString()
                });
            }

            // Attach admin as user context with role admin
            req.user = {
                id: adminRows[0].id,
                name: adminRows[0].name,
                email: adminRows[0].email,
                role: 'admin'
            };

            const duration = Date.now() - startTime;
            logAuthEvent('admin_token_validated', decoded.id, clientIp, {
                endpoint: req.originalUrl,
                method: req.method,
                validation_time_ms: duration
            });

            return next();
        }

        // Try to get user from cache first
        let user = userCache.get(decoded.id);
        
        if (!user) {
            // Fetch user from database if not in cache
            const [userRows] = await db.execute(
                'SELECT id, name, email, phone, location, created_at FROM users WHERE id = ? AND email = ?',
                [decoded.id, decoded.email]
            );

            if (userRows.length === 0) {
                logSecurityEvent('token_user_not_found', {
                    user_id: decoded.id,
                    email: decoded.email,
                    endpoint: req.originalUrl
                }, decoded.id, clientIp);

                return res.status(403).json({ 
                    error: 'User not found or disabled',
                    timestamp: new Date().toISOString()
                });
            }

            user = userRows[0];
            
            // Cache user for future requests (30 minutes)
            userCache.set(decoded.id, user, 1800);
            
            logger.debug('User loaded from database and cached', {
                user_id: decoded.id,
                endpoint: req.originalUrl
            });
        } else {
            logger.debug('User loaded from cache', {
                user_id: decoded.id,
                endpoint: req.originalUrl
            });
        }

        // Enforce active session for users (session-based auth)
        const sessionId = req.headers['x-session-id'];
        if (!sessionId) {
            logSecurityEvent('missing_session_id', {
                endpoint: req.originalUrl,
                method: req.method
            }, decoded.id, clientIp);

            return res.status(401).json({
                error: 'Session ID required',
                message: 'Please include x-session-id header',
                timestamp: new Date().toISOString()
            });
        }

        // Validate session is active and not expired
        const [sessions] = await db.execute(
            `SELECT session_id FROM user_sessions 
             WHERE session_id = ? AND user_id = ? AND is_active = 1 AND expires_at > NOW()`,
            [sessionId, decoded.id]
        );

        if (sessions.length === 0) {
            logSecurityEvent('invalid_or_revoked_session', {
                endpoint: req.originalUrl,
                session_id: sessionId
            }, decoded.id, clientIp);

            return res.status(401).json({
                error: 'Session invalid or revoked',
                message: 'Please login again',
                timestamp: new Date().toISOString()
            });
        }

        // Add user info to request object
        req.user = {
            ...decoded,
            ...user,
            role: decoded.role || 'user' // Default role
        };
        req.sessionId = sessionId;

        // Log successful authentication
        const duration = Date.now() - startTime;
        logAuthEvent('token_validated', decoded.id, clientIp, {
            endpoint: req.originalUrl,
            method: req.method,
            validation_time_ms: duration,
            cached: !!userCache.get(decoded.id)
        });

        next();

    } catch (error) {
        const duration = Date.now() - startTime;
        
        if (error.name === 'TokenExpiredError') {
            logAuthEvent('token_expired', null, clientIp, {
                endpoint: req.originalUrl,
                expired_at: error.expiredAt,
                validation_time_ms: duration
            });

            return res.status(401).json({ 
                error: 'Token expired',
                expired_at: error.expiredAt,
                timestamp: new Date().toISOString()
            });
            
        } else if (error.name === 'JsonWebTokenError') {
            logSecurityEvent('invalid_jwt_token', {
                endpoint: req.originalUrl,
                jwt_error: error.message,
                validation_time_ms: duration
            }, null, clientIp);

            return res.status(403).json({ 
                error: 'Invalid token',
                timestamp: new Date().toISOString()
            });
            
        } else if (error.name === 'NotBeforeError') {
            logSecurityEvent('premature_jwt_token', {
                endpoint: req.originalUrl,
                not_before: error.date,
                validation_time_ms: duration
            }, null, clientIp);

            return res.status(403).json({ 
                error: 'Token not yet valid',
                not_before: error.date,
                timestamp: new Date().toISOString()
            });
            
        } else {
            // Database or other errors
            logError(error, {
                context: 'auth_middleware_error',
                endpoint: req.originalUrl,
                method: req.method,
                validation_time_ms: duration,
                ip: clientIp
            });

            return res.status(500).json({ 
                error: 'Authentication service error',
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Enhanced admin authorization middleware
export const isAdmin = async (req, res, next) => {
    const startTime = Date.now();
    
    // Check if user is authenticated first
    if (!req.user) {
        logSecurityEvent('admin_check_no_user', {
            endpoint: req.originalUrl,
            method: req.method
        }, null, req.ip);

        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Please authenticate before accessing admin resources',
            timestamp: new Date().toISOString()
        });
    }

    // Check admin role
    if (req.user.role !== 'admin') {
        logSecurityEvent('unauthorized_admin_access', {
            endpoint: req.originalUrl,
            method: req.method,
            user_role: req.user.role || 'none',
            attempted_resource: req.originalUrl
        }, req.user.id, req.ip);

        return res.status(403).json({ 
            error: 'Admin access required',
            message: 'You do not have permission to access this resource',
            timestamp: new Date().toISOString()
        });
    }

    // Verify admin user exists in database (additional security check)
    try {
        const [adminRows] = await db.execute(
            'SELECT id, email, name FROM admins WHERE email = ?',
            [req.user.email]
        );

        if (adminRows.length === 0) {
            logSecurityEvent('admin_token_invalid_user', {
                endpoint: req.originalUrl,
                admin_email: req.user.email,
                user_id: req.user.id
            }, req.user.id, req.ip);

            return res.status(403).json({ 
                error: 'Admin access denied',
                message: 'Admin credentials not found',
                timestamp: new Date().toISOString()
            });
        }

        // Add admin info to request
        req.admin = adminRows[0];
        
        const duration = Date.now() - startTime;
        
        // Log successful admin access
        logAuthEvent('admin_access_granted', req.user.id, req.ip, {
            endpoint: req.originalUrl,
            method: req.method,
            admin_name: req.admin.name,
            validation_time_ms: duration
        });

        next();

    } catch (error) {
        const duration = Date.now() - startTime;
        
        logError(error, {
            context: 'admin_middleware_error',
            endpoint: req.originalUrl,
            user_id: req.user.id,
            validation_time_ms: duration
        });

        return res.status(500).json({ 
            error: 'Admin verification error',
            timestamp: new Date().toISOString()
        });
    }
};

// Optional user role middleware (for future role-based access)
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            logSecurityEvent('role_check_no_user', {
                endpoint: req.originalUrl,
                required_roles: allowedRoles
            }, null, req.ip);

            return res.status(401).json({ 
                error: 'Authentication required',
                timestamp: new Date().toISOString()
            });
        }

        const userRole = req.user.role || 'user';
        const hasRequiredRole = allowedRoles.includes(userRole);

        if (!hasRequiredRole) {
            logSecurityEvent('insufficient_role_access', {
                endpoint: req.originalUrl,
                user_role: userRole,
                required_roles: allowedRoles
            }, req.user.id, req.ip);

            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required_roles: allowedRoles,
                your_role: userRole,
                timestamp: new Date().toISOString()
            });
        }

        logAuthEvent('role_access_granted', req.user.id, req.ip, {
            endpoint: req.originalUrl,
            user_role: userRole,
            required_roles: allowedRoles
        });

        next();
    };
};

// User ownership verification middleware
export const requireOwnership = (resourceIdParam = 'id', resourceTable = null) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                timestamp: new Date().toISOString()
            });
        }

        // Admin bypass
        if (req.user.role === 'admin') {
            return next();
        }

        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;

        // If checking user's own resources
        if (resourceTable === 'users' && resourceId == userId) {
            return next();
        }

        // For other resources, check ownership in database
        if (resourceTable) {
            try {
                const [rows] = await db.execute(
                    `SELECT user_id FROM ${resourceTable} WHERE id = ?`,
                    [resourceId]
                );

                if (rows.length === 0) {
                    return res.status(404).json({ 
                        error: 'Resource not found',
                        timestamp: new Date().toISOString()
                    });
                }

                if (rows[0].user_id !== userId) {
                    logSecurityEvent('unauthorized_resource_access', {
                        endpoint: req.originalUrl,
                        resource_table: resourceTable,
                        resource_id: resourceId,
                        resource_owner: rows[0].user_id
                    }, userId, req.ip);

                    return res.status(403).json({ 
                        error: 'Access denied',
                        message: 'You can only access your own resources',
                        timestamp: new Date().toISOString()
                    });
                }

                next();
            } catch (error) {
                logError(error, {
                    context: 'ownership_check_error',
                    resource_table: resourceTable,
                    resource_id: resourceId,
                    user_id: userId
                });

                return res.status(500).json({ 
                    error: 'Authorization check failed',
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            next();
        }
    };
};

export default {
    authenticateToken,
    isAdmin,
    requireRole,
    requireOwnership
};
