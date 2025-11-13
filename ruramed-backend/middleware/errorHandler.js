import { logger, logError, logSecurityEvent } from '../utils/logger.js';

// Global error handling middleware for Express
export const errorHandler = (err, req, res, next) => {
    // Log error with structured logging
    logError(err, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null,
        body: process.env.NODE_ENV === 'development' ? req.body : undefined
    });

    // Default error response
    let error = {
        status: err.status || err.statusCode || 500,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        requestId: req.id || null // If you add request ID middleware
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        // Mongoose/Express validation errors
        error.status = 400;
        error.message = 'Validation Error';
        error.details = Object.values(err.errors).map(e => e.message);
        
        logSecurityEvent('validation_error', {
            errors: error.details,
            endpoint: req.originalUrl
        }, req.user?.id, req.ip);
        
    } else if (err.name === 'JsonWebTokenError') {
        // JWT errors
        error.status = 401;
        error.message = 'Invalid token';
        
        logSecurityEvent('invalid_jwt_token', {
            endpoint: req.originalUrl,
            token_error: err.message
        }, req.user?.id, req.ip);
        
    } else if (err.name === 'TokenExpiredError') {
        // JWT expiration
        error.status = 401;
        error.message = 'Token expired';
        
        logSecurityEvent('expired_jwt_token', {
            endpoint: req.originalUrl,
            expired_at: err.expiredAt
        }, req.user?.id, req.ip);
        
    } else if (err.code === 'ER_DUP_ENTRY') {
        // MySQL duplicate entry
        error.status = 409;
        error.message = 'Duplicate entry';
        
        if (err.message.includes('email')) {
            error.message = 'Email already exists';
            logSecurityEvent('duplicate_email_attempt', {
                endpoint: req.originalUrl
            }, req.user?.id, req.ip);
        } else if (err.message.includes('phone')) {
            error.message = 'Phone number already exists';
            logSecurityEvent('duplicate_phone_attempt', {
                endpoint: req.originalUrl
            }, req.user?.id, req.ip);
        }
        
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        // MySQL foreign key constraint
        error.status = 400;
        error.message = 'Referenced record does not exist';
        
        logger.warn('Foreign key constraint violation', {
            error_code: err.code,
            endpoint: req.originalUrl,
            userId: req.user?.id
        });
        
    } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        // MySQL foreign key constraint (delete)
        error.status = 400;
        error.message = 'Cannot delete - record is referenced by other data';
        
        logger.warn('Delete constraint violation', {
            error_code: err.code,
            endpoint: req.originalUrl,
            userId: req.user?.id
        });
        
    } else if (err.code === 'ECONNREFUSED') {
        // Database connection error
        error.status = 503;
        error.message = 'Database connection failed';
        
        logger.error('Database connection refused', {
            error_code: err.code,
            endpoint: req.originalUrl,
            category: 'database_error'
        });
        
    } else if (err.type === 'entity.parse.failed') {
        // JSON parsing error
        error.status = 400;
        error.message = 'Invalid JSON format';
        
        logSecurityEvent('json_parse_error', {
            endpoint: req.originalUrl,
            content_type: req.get('Content-Type')
        }, req.user?.id, req.ip);
        
    } else if (err.type === 'entity.too.large') {
        // Request too large
        error.status = 413;
        error.message = 'Request entity too large';
        
        logSecurityEvent('request_too_large', {
            endpoint: req.originalUrl,
            content_length: req.get('Content-Length')
        }, req.user?.id, req.ip);
        
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        // File upload size limit
        error.status = 413;
        error.message = 'File too large';
        
        logger.warn('File upload size exceeded', {
            endpoint: req.originalUrl,
            userId: req.user?.id,
            category: 'file_upload_error'
        });
        
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Unexpected file field
        error.status = 400;
        error.message = 'Unexpected file field';
        
        logSecurityEvent('unexpected_file_upload', {
            endpoint: req.originalUrl,
            field_name: err.field
        }, req.user?.id, req.ip);
    }

    // Handle rate limiting errors
    if (err.status === 429) {
        error.status = 429;
        error.message = 'Too many requests';
        
        logSecurityEvent('rate_limit_exceeded', {
            endpoint: req.originalUrl,
            limit_type: err.limitType || 'general'
        }, req.user?.id, req.ip);
    }

    // Add development details
    if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack;
        error.details = err.details || undefined;
        error.originalError = err.name;
    }

    // Log final error response for monitoring
    logger.info('Error response sent', {
        status: error.status,
        message: error.message,
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip,
        category: 'error_response'
    });

    // Send error response
    res.status(error.status).json({
        error: error.message,
        ...error
    });
};

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
    logger.warn('404 Not Found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null,
        category: 'not_found'
    });

    // Log potential security probing
    if (req.originalUrl.includes('admin') || 
        req.originalUrl.includes('config') || 
        req.originalUrl.includes('env') ||
        req.originalUrl.includes('..')) {
        
        logSecurityEvent('suspicious_path_access', {
            path: req.originalUrl,
            method: req.method,
            potential_probe: true
        }, req.user?.id, req.ip);
    }

    const response404 = {
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        requestId: req.id || null
    };

    // Add available routes for development
    if (process.env.NODE_ENV === 'development') {
        response404.availableRoutes = {
            auth: [
                'POST /api/auth/register',
                'POST /api/auth/login',
                'GET /api/auth/profile',
                'POST /api/auth/logout'
            ],
            medicines: [
                'GET /api/medicines',
                'GET /api/medicines/search',
                'GET /api/medicines/categories',
                'GET /api/medicines/forms',
                'GET /api/medicines/:id'
            ],
            doctors: [
                'GET /api/doctors',
                'GET /api/doctors/search',
                'GET /api/doctors/specialties',
                'GET /api/doctors/:id'
            ],
            addresses: [
                'GET /api/addresses',
                'POST /api/addresses',
                'PUT /api/addresses/:id',
                'DELETE /api/addresses/:id'
            ],
            orders: [
                'GET /api/orders',
                'POST /api/orders',
                'GET /api/orders/:id',
                'PUT /api/orders/:id/status'
            ],
            users: [
                'GET /api/users/profile',
                'PUT /api/users/profile'
            ],
            delivery: [
                'GET /api/delivery/check-service-area'
            ],
            geocoding: [
                'GET /api/geocode',
                'GET /api/geocode/distance'
            ],
            health: [
                'GET /api/health',
                'GET /api/health/system',
                'GET /api/health/database',
                'GET /api/health/cache'
            ],
            admin: [
                'POST /api/admin/login',
                'GET /api/admin/dashboard'
            ]
        };
    }

    res.status(404).json(response404);
};

// Rate limiting helper with structured logging
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests', limitType = 'general') => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        
        if (!requests.has(key)) {
            requests.set(key, []);
        }
        
        const userRequests = requests.get(key);
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => now - time < windowMs);
        
        if (validRequests.length >= max) {
            logSecurityEvent('rate_limit_triggered', {
                ip: req.ip,
                endpoint: req.originalUrl,
                limit_type: limitType,
                request_count: validRequests.length,
                window_ms: windowMs
            }, req.user?.id, req.ip);

            const error = new Error(message);
            error.status = 429;
            error.limitType = limitType;
            
            return res.status(429).json({
                error: 'Too Many Requests',
                message: message,
                retryAfter: Math.ceil(windowMs / 1000),
                timestamp: new Date().toISOString(),
                limitType: limitType
            });
        }
        
        validRequests.push(now);
        requests.set(key, validRequests);
        
        next();
    };
};

// Input validation middleware (legacy - consider using new validation middleware)
export const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = [];
        
        for (const field of fields) {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                missing.push(field);
            }
        }
        
        if (missing.length > 0) {
            logger.warn('Required field validation failed', {
                missing_fields: missing,
                endpoint: req.originalUrl,
                userId: req.user?.id,
                category: 'validation_error'
            });

            return res.status(400).json({
                error: 'Missing required fields',
                fields: missing,
                message: `The following fields are required: ${missing.join(', ')}`,
                timestamp: new Date().toISOString()
            });
        }
        
        next();
    };
};

// Enhanced async error handler wrapper
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        Promise.resolve(fn(req, res, next))
            .then((result) => {
                const duration = Date.now() - startTime;
                
                // Log slow operations (> 5000ms)
                if (duration > 5000) {
                    logger.warn('Slow operation detected', {
                        endpoint: req.originalUrl,
                        method: req.method,
                        duration_ms: duration,
                        userId: req.user?.id,
                        category: 'performance_warning'
                    });
                }
                
                return result;
            })
            .catch((error) => {
                const duration = Date.now() - startTime;
                
                // Add timing information to error context
                error.operationDuration = duration;
                error.endpoint = req.originalUrl;
                error.method = req.method;
                
                next(error);
            });
    };
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    next();
};

// Request ID middleware for tracing
export const requestId = (req, res, next) => {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.id);
    next();
};

export default {
    errorHandler,
    notFoundHandler,
    createRateLimit,
    validateRequired,
    asyncHandler,
    securityHeaders,
    requestId
};
