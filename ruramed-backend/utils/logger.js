import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------
// 📁 Create logs directory (only in development)
// ---------------------------------------------------------
const logsDir = path.join(__dirname, '../logs');
if (!isProduction && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ---------------------------------------------------------
// 🧩 Log Formats
// ---------------------------------------------------------

// Structured JSON format (GCP-compatible)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      severity: level.toUpperCase(), // GCP uses 'severity' instead of 'level'
      message,
      environment: process.env.NODE_ENV || 'development',
      service: 'ruramed-backend',
      version: '2.0.0',
      ...meta,
    };

    if (stack) logEntry.stack = stack;

    return JSON.stringify(logEntry);
  })
);

// Console-friendly format for development
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
      delete cleanMeta.severity;
      delete cleanMeta.service;
      delete cleanMeta.version;
      delete cleanMeta.environment;

      if (Object.keys(cleanMeta).length > 0) {
        logMessage += ` | ${JSON.stringify(cleanMeta)}`;
      }
    }

    return logMessage;
  })
);

// ---------------------------------------------------------
// 🚚 Transports
// ---------------------------------------------------------
const transports = [];

// Console transport (always enabled – Cloud Logging captures stdout)
transports.push(
  new winston.transports.Console({
    format: isProduction ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  })
);

// File transports (only in development or if explicitly enabled)
if (!isProduction || process.env.ENABLE_FILE_LOGGING === 'true') {
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: logFormat,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
      format: logFormat,
    }),
    // Security logs
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: logFormat,
    }),
    // Audit logs
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 15,
      tailable: true,
      format: logFormat,
    })
  );
}

// ---------------------------------------------------------
// 🧠 Logger Instance
// ---------------------------------------------------------
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: logFormat,
  transports,
  defaultMeta: {
    service: 'ruramed-backend',
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
  },
});

// Exception and rejection handlers (only in development)
if (!isProduction) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
    })
  );
}

// ---------------------------------------------------------
// 🏥 Healthcare-Specific Loggers
// ---------------------------------------------------------
export const logHealthcareEvent = (eventType, data, userId = null) => {
  logger.info('Healthcare Event', {
    event_type: eventType,
    user_id: userId,
    data,
    category: 'healthcare',
    severity: 'INFO',
  });
};

// Security event logging
export const logSecurityEvent = (eventType, details, userId = null, ip = null) => {
  logger.warn('Security Event', {
    event_type: eventType,
    user_id: userId,
    ip_address: ip,
    details,
    category: 'security',
    severity: 'WARNING',
  });
};

// Database operation logging
export const logDatabaseOperation = (operation, table, userId = null, details = null) => {
  logger.info('Database Operation', {
    operation,
    table,
    user_id: userId,
    details,
    category: 'database',
    severity: 'INFO',
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
    category: 'api',
    'logging.googleapis.com/trace': req.headers['x-cloud-trace-context'],
  };

  if (res.statusCode >= 500) {
    logger.error('API Request - Server Error', { ...logData, severity: 'ERROR' });
  } else if (res.statusCode >= 400) {
    logger.warn('API Request - Client Error', { ...logData, severity: 'WARNING' });
  } else {
    logger.info('API Request - Success', { ...logData, severity: 'INFO' });
  }
};

// File operation logging
export const logFileOperation = (operation, filename, userId = null, details = null) => {
  logger.info('File Operation', {
    operation,
    filename,
    user_id: userId,
    details,
    category: 'file_operation',
    severity: 'INFO',
  });
};

// Medicine operation logging
export const logMedicineOperation = (operation, medicineId, userId = null, details = null) => {
  logHealthcareEvent('medicine_operation', { operation, medicine_id: medicineId, details }, userId);
};

// Prescription operation logging
export const logPrescriptionOperation = (operation, prescriptionId, userId = null, details = null) => {
  logHealthcareEvent('prescription_operation', { operation, prescription_id: prescriptionId, details }, userId);
};

// Order operation logging
export const logOrderOperation = (operation, orderId, userId = null, details = null) => {
  logHealthcareEvent('order_operation', { operation, order_id: orderId, details }, userId);
};

// Authentication logging
export const logAuthEvent = (event, userId = null, ip = null, details = null) => {
  logSecurityEvent(`auth_${event}`, details, userId, ip);
};

// Error logging with context
export const logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    error_name: error.name,
    error_code: error.code,
    stack: error.stack,
    context,
    category: 'error',
    severity: 'ERROR',
    '@type':
      'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
  });
};

// Performance logging
export const logPerformance = (operation, duration, details = null) => {
  const severity = duration > 2000 ? 'WARNING' : 'INFO';
  logger.log(severity.toLowerCase(), 'Performance Metric', {
    operation,
    duration_ms: duration,
    details,
    category: 'performance',
    severity,
  });
};

// Audit trail logging
export const logAuditTrail = (action, resource, userId, oldData = null, newData = null) => {
  logger.info('Audit Trail', {
    action,
    resource,
    user_id: userId,
    old_data: oldData,
    new_data: newData,
    category: 'audit',
    severity: 'NOTICE',
  });
};

// Compliance logging (e.g., HIPAA, GDPR)
export const logComplianceEvent = (regulation, event, details, userId = null) => {
  logger.info('Compliance Event', {
    regulation,
    event,
    details,
    user_id: userId,
    category: 'compliance',
    severity: 'NOTICE',
  });
};

// ---------------------------------------------------------
// 🌐 Request Logging Middleware
// ---------------------------------------------------------
export const requestLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Extract trace context for GCP
  const traceHeader = req.headers['x-cloud-trace-context'];
  if (traceHeader && isProduction) {
    const [trace] = traceHeader.split('/');
    req.traceId = trace;
  }

  // Log incoming request in debug mode
  if (!isProduction || process.env.LOG_LEVEL === 'debug') {
    logger.debug('Incoming Request', {
      method: req.method,
      url: req.originalUrl,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      content_type: req.get('Content-Type'),
      user_id: req.user?.id || null,
      category: 'request',
      severity: 'DEBUG',
      trace_id: req.traceId,
    });
  }

  // Override res.end to measure response time
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const responseTime = Date.now() - startTime;
    logApiRequest(req, res, responseTime);
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ---------------------------------------------------------
// 🚀 Startup Log
// ---------------------------------------------------------
logger.info('Logger initialized', {
  level: logger.level,
  environment: process.env.NODE_ENV || 'development',
  file_logging_enabled: !isProduction || process.env.ENABLE_FILE_LOGGING === 'true',
  severity: 'INFO',
});

// ---------------------------------------------------------
// 📤 Exports
// ---------------------------------------------------------
export { logger };
export default logger;
