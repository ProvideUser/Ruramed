import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format for healthcare applications
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            environment: process.env.NODE_ENV || 'development',
            ...meta
        };

        if (stack) {
            logEntry.stack = stack;
        }

        return JSON.stringify(logEntry);
    })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} [${level}] ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            const cleanMeta = { ...meta };
            delete cleanMeta.timestamp;
            delete cleanMeta.level;
            delete cleanMeta.message;
            
            if (Object.keys(cleanMeta).length > 0) {
                logMessage += ` | ${JSON.stringify(cleanMeta)}`;
            }
        }
        
        return logMessage;
    })
);

// Create Winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Error logs - separate file for errors only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // Combined logs - all levels
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // Security logs - authentication, authorization events
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            level: 'warn',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),

        // Healthcare-specific audit logs
        new winston.transports.File({
            filename: path.join(logsDir, 'audit.log'),
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 15,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],

    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 3
        })
    ],

    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 3
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Healthcare-specific logging functions
export const logHealthcareEvent = (eventType, data, userId = null) => {
    logger.info('Healthcare Event', {
        event_type: eventType,
        user_id: userId,
        data: data,
        category: 'healthcare',
        timestamp: new Date().toISOString()
    });
};

// Security event logging
export const logSecurityEvent = (eventType, details, userId = null, ip = null) => {
    logger.warn('Security Event', {
        event_type: eventType,
        user_id: userId,
        ip_address: ip,
        details: details,
        category: 'security',
        timestamp: new Date().toISOString()
    });
};

// Database operation logging
export const logDatabaseOperation = (operation, table, userId = null, details = null) => {
    logger.info('Database Operation', {
        operation: operation,
        table: table,
        user_id: userId,
        details: details,
        category: 'database',
        timestamp: new Date().toISOString()
    });
};

// API request/response logging
export const logApiRequest = (req, res, responseTime) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        status_code: res.statusCode,
        response_time_ms: responseTime,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip,
        user_id: req.user?.id || null,
        category: 'api'
    };

    // Log different levels based on status code
    if (res.statusCode >= 500) {
        logger.error('API Request - Server Error', logData);
    } else if (res.statusCode >= 400) {
        logger.warn('API Request - Client Error', logData);
    } else {
        logger.info('API Request - Success', logData);
    }
};

// File operation logging
export const logFileOperation = (operation, filename, userId = null, details = null) => {
    logger.info('File Operation', {
        operation: operation,
        filename: filename,
        user_id: userId,
        details: details,
        category: 'file_operation',
        timestamp: new Date().toISOString()
    });
};

// Medicine operation logging
export const logMedicineOperation = (operation, medicineId, userId = null, details = null) => {
    logHealthcareEvent('medicine_operation', {
        operation: operation,
        medicine_id: medicineId,
        details: details
    }, userId);
};

// Prescription operation logging
export const logPrescriptionOperation = (operation, prescriptionId, userId = null, details = null) => {
    logHealthcareEvent('prescription_operation', {
        operation: operation,
        prescription_id: prescriptionId,
        details: details
    }, userId);
};

// Order operation logging
export const logOrderOperation = (operation, orderId, userId = null, details = null) => {
    logHealthcareEvent('order_operation', {
        operation: operation,
        order_id: orderId,
        details: details
    }, userId);
};

// Authentication logging
export const logAuthEvent = (event, userId = null, ip = null, details = null) => {
    logSecurityEvent(`auth_${event}`, details, userId, ip);
};

// Error logging with context
export const logError = (error, context = {}) => {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        context: context,
        category: 'error',
        timestamp: new Date().toISOString()
    });
};

// Performance logging
export const logPerformance = (operation, duration, details = null) => {
    logger.info('Performance Metric', {
        operation: operation,
        duration_ms: duration,
        details: details,
        category: 'performance',
        timestamp: new Date().toISOString()
    });
};

// Audit trail logging for sensitive operations
export const logAuditTrail = (action, resource, userId, oldData = null, newData = null) => {
    const auditLog = logger.child({ category: 'audit' });
    
    auditLog.info('Audit Trail', {
        action: action,
        resource: resource,
        user_id: userId,
        old_data: oldData,
        new_data: newData,
        timestamp: new Date().toISOString(),
        session_id: null // Can be added if session tracking is implemented
    });
};

// Compliance logging for healthcare regulations
export const logComplianceEvent = (regulation, event, details, userId = null) => {
    logger.info('Compliance Event', {
        regulation: regulation, // e.g., 'HIPAA', 'GDPR'
        event: event,
        details: details,
        user_id: userId,
        category: 'compliance',
        timestamp: new Date().toISOString()
    });
};

// Request logging middleware
export const requestLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request
    logger.debug('Incoming Request', {
        method: req.method,
        url: req.originalUrl,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        content_type: req.get('Content-Type'),
        user_id: req.user?.id || null,
        category: 'request'
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        // Log API request with response time
        logApiRequest(req, res, responseTime);
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Export main logger instance
export { logger };

// Default export
export default logger;
