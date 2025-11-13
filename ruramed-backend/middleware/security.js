import { db } from '../config/database.js';
import { logger, logError, logSecurityEvent } from '../utils/logger.js';
import crypto from 'crypto';

// Device fingerprinting middleware
export const deviceFingerprint = (req, res, next) => {
    try {
        const userAgent = req.get('User-Agent') || '';
        const acceptLanguage = req.get('Accept-Language') || '';
        const acceptEncoding = req.get('Accept-Encoding') || '';
        const ip = req.ip;

        // Create device fingerprint
        const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;
        const deviceFingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 32);

        // Simple user agent parsing (without external library)
        const parseUserAgent = (ua) => {
            const browser = ua.includes('Chrome') ? 'Chrome' : 
                           ua.includes('Firefox') ? 'Firefox' : 
                           ua.includes('Safari') ? 'Safari' : 
                           ua.includes('Edge') ? 'Edge' : 'Unknown';
            
            const os = ua.includes('Windows') ? 'Windows' : 
                      ua.includes('Mac') ? 'macOS' : 
                      ua.includes('Linux') ? 'Linux' : 
                      ua.includes('Android') ? 'Android' : 
                      ua.includes('iOS') ? 'iOS' : 'Unknown';
            
            const device = ua.includes('Mobile') ? 'Mobile' : 
                          ua.includes('Tablet') ? 'Tablet' : 'Desktop';
            
            return { browser, os, device };
        };

        const parsed = parseUserAgent(userAgent);
        
        req.deviceInfo = {
            fingerprint: deviceFingerprint,
            userAgent: userAgent,
            browser: parsed.browser,
            os: parsed.os,
            device: parsed.device,
            ip: ip,
            language: acceptLanguage.split(',')[0],
            encoding: acceptEncoding
        };

        next();
    } catch (error) {
        logError(error, { context: 'device_fingerprint_middleware' });
        req.deviceInfo = { fingerprint: 'unknown', ip: req.ip };
        next();
    }
};

// Advanced rate limiting with device tracking
export const advancedRateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,
        maxPerDevice = 50,
        blockDuration = 60 * 60 * 1000, // 1 hour
        endpoint = 'general'
    } = options;

    return async (req, res, next) => {
        try {
            const ip = req.ip;
            const deviceFingerprint = req.deviceInfo?.fingerprint;
            const userId = req.user?.id;
            const now = new Date();
            const windowStart = new Date(now.getTime() - windowMs);

            // Check IP-based rate limit
            const [ipLimits] = await db.execute(
                `SELECT request_count, is_blocked, block_reason 
                 FROM rate_limits 
                 WHERE identifier = ? AND identifier_type = 'ip' AND endpoint = ? AND window_end > ?`,
                [ip, endpoint, now]
            );

            // Check device-based rate limit
            const [deviceLimits] = deviceFingerprint ? await db.execute(
                `SELECT request_count, is_blocked, block_reason 
                 FROM rate_limits 
                 WHERE identifier = ? AND identifier_type = 'device' AND endpoint = ? AND window_end > ?`,
                [deviceFingerprint, endpoint, now]
            ) : [[]];

            // Check if IP or device is blocked
            const ipBlocked = ipLimits.length > 0 && ipLimits[0].is_blocked;
            const deviceBlocked = deviceLimits.length > 0 && deviceLimits[0].is_blocked;

            if (ipBlocked || deviceBlocked) {
                const blockReason = ipBlocked ? ipLimits[0].block_reason : deviceLimits[0].block_reason;
                
                logSecurityEvent('rate_limit_blocked_request', {
                    ip: ip,
                    device_fingerprint: deviceFingerprint,
                    endpoint: endpoint,
                    block_reason: blockReason,
                    severity: 'high'
                }, userId, ip);

                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Your access has been temporarily blocked due to suspicious activity',
                    retryAfter: Math.ceil(blockDuration / 1000),
                    blocked: true
                });
            }

            // Update or create rate limit entries
            const windowEnd = new Date(now.getTime() + windowMs);

            // Update IP rate limit
            await db.execute(
                `INSERT INTO rate_limits (identifier, identifier_type, endpoint, request_count, window_start, window_end) 
                 VALUES (?, 'ip', ?, 1, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP`,
                [ip, endpoint, now, windowEnd]
            );

            // Update device rate limit if fingerprint available
            if (deviceFingerprint) {
                await db.execute(
                    `INSERT INTO rate_limits (identifier, identifier_type, endpoint, request_count, window_start, window_end) 
                     VALUES (?, 'device', ?, 1, ?, ?) 
                     ON DUPLICATE KEY UPDATE 
                     request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP`,
                    [deviceFingerprint, endpoint, now, windowEnd]
                );
            }

            // Check if limits exceeded and block if necessary
            const [updatedIpLimit] = await db.execute(
                `SELECT request_count FROM rate_limits 
                 WHERE identifier = ? AND identifier_type = 'ip' AND endpoint = ?`,
                [ip, endpoint]
            );

            if (updatedIpLimit[0]?.request_count > maxRequests) {
                await db.execute(
                    `UPDATE rate_limits SET is_blocked = 1, block_reason = 'IP rate limit exceeded' 
                     WHERE identifier = ? AND identifier_type = 'ip' AND endpoint = ?`,
                    [ip, endpoint]
                );

                logSecurityEvent('rate_limit_exceeded_ip', {
                    ip: ip,
                    request_count: updatedIpLimit[0].request_count,
                    max_requests: maxRequests,
                    endpoint: endpoint,
                    severity: 'high'
                }, userId, ip);
            }

            next();
        } catch (error) {
            logError(error, { context: 'advanced_rate_limit_middleware' });
            next(); // Continue on error to not break the application
        }
    };
};

// Session management middleware
export const sessionManager = async (req, res, next) => {
    if (!req.user) {
        return next(); // Skip if no authenticated user
    }

    try {
        const userId = req.user.id;
        const sessionId = req.headers['x-session-id'] || crypto.randomBytes(16).toString('hex');
        const deviceInfo = req.deviceInfo;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Track device
        await db.execute(
            `INSERT INTO device_tracking 
             (device_fingerprint, user_id, device_type, browser, os, timezone, language, last_seen, visit_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1) 
             ON DUPLICATE KEY UPDATE 
             user_id = COALESCE(user_id, VALUES(user_id)),
             last_seen = NOW(), 
             visit_count = visit_count + 1`,
            [
                deviceInfo.fingerprint,
                userId,
                deviceInfo.device,
                deviceInfo.browser,
                deviceInfo.os,
                req.headers['x-timezone'] || 'UTC',
                deviceInfo.language
            ]
        );

        // Create or update session
        await db.execute(
            `INSERT INTO user_sessions 
             (session_id, user_id, ip_address, user_agent, device_fingerprint, device_info, expires_at, last_activity) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE 
             last_activity = NOW()`,
            [
                sessionId,
                userId,
                req.ip,
                deviceInfo.userAgent,
                deviceInfo.fingerprint,
                JSON.stringify(deviceInfo),
                expiresAt
            ]
        );

        // Add session info to request
        req.sessionId = sessionId;
        res.setHeader('x-session-id', sessionId);

        next();
    } catch (error) {
        logError(error, { context: 'session_manager_middleware' });
        next(); // Continue on error
    }
};

// Security event logger middleware
export const securityEventLogger = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Log security-relevant responses
        if (res.statusCode === 401 || res.statusCode === 403) {
            logSecurityEvent('unauthorized_access_attempt', {
                endpoint: req.originalUrl,
                method: req.method,
                status_code: res.statusCode,
                response_data: data.error || data.message,
                device_info: req.deviceInfo
            }, req.user?.id, req.ip);
        }

        if (res.statusCode === 429) {
            logSecurityEvent('rate_limit_triggered', {
                endpoint: req.originalUrl,
                device_fingerprint: req.deviceInfo?.fingerprint,
                severity: 'medium'
            }, req.user?.id, req.ip);
        }

        return originalJson.call(this, data);
    };

    next();
};

export default {
    deviceFingerprint,
    advancedRateLimit,
    sessionManager,
    securityEventLogger
};
