import { db } from '../config/database.js';
import { logger, logSecurityEvent } from '../utils/logger.js';

/**
 * Advanced Rate Limiter with Database Persistence
 * Tracks limits by IP, Device, User, Email, and Phone
 */
class RateLimiter {
    constructor() {
        this.cleanupInterval = null;
        this.startCleanup();
    }

    /**
     * Create rate limit middleware
     * @param {Object} options - Rate limit configuration
     */
    createLimit(options = {}) {
        const config = {
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            maxRequests: options.maxRequests || 100,
            maxPerDevice: options.maxPerDevice || 50,
            maxPerUser: options.maxPerUser || null,
            endpoint: options.endpoint || 'general',
            identifierType: options.identifierType || 'ip',
            blockDuration: options.blockDuration || 60 * 60 * 1000, // 1 hour
            message: options.message || 'Too many requests from this IP, please try again later.',
            skipSuccessfulRequests: options.skipSuccessfulRequests || false,
            skipFailedRequests: options.skipFailedRequests || false
        };

        return async (req, res, next) => {
            try {
                const ip = req.ip;
                const deviceFingerprint = req.deviceInfo?.fingerprint || 'unknown';
                const userId = req.user?.id || null;
                const endpoint = config.endpoint;

                // Check IP-based rate limit
                const ipCheck = await this.checkLimit(ip, 'ip', endpoint, config.maxRequests, config.windowMs);
                if (ipCheck.blocked) {
                    return this.sendBlockedResponse(res, ipCheck, config);
                }

                // Check device-based rate limit
                if (deviceFingerprint !== 'unknown' && config.maxPerDevice) {
                    const deviceCheck = await this.checkLimit(
                        deviceFingerprint,
                        'device',
                        endpoint,
                        config.maxPerDevice,
                        config.windowMs
                    );
                    if (deviceCheck.blocked) {
                        return this.sendBlockedResponse(res, deviceCheck, config);
                    }
                }

                // Check user-based rate limit (if authenticated)
                if (userId && config.maxPerUser) {
                    const userCheck = await this.checkLimit(
                        userId.toString(),
                        'user',
                        endpoint,
                        config.maxPerUser,
                        config.windowMs
                    );
                    if (userCheck.blocked) {
                        return this.sendBlockedResponse(res, userCheck, config);
                    }
                }

                // Store original end function
                const originalEnd = res.end;
                res.end = async function(chunk, encoding) {
                    // Only count if not skipping based on status
                    const shouldCount = 
                        (!config.skipSuccessfulRequests || res.statusCode >= 400) &&
                        (!config.skipFailedRequests || res.statusCode < 400);

                    if (shouldCount) {
                        // Increment counters
                        await rateLimiter.incrementLimit(ip, 'ip', endpoint, config.windowMs);
                        if (deviceFingerprint !== 'unknown') {
                            await rateLimiter.incrementLimit(deviceFingerprint, 'device', endpoint, config.windowMs);
                        }
                        if (userId && config.maxPerUser) {
                            await rateLimiter.incrementLimit(userId.toString(), 'user', endpoint, config.windowMs);
                        }
                    }

                    // Call original end
                    originalEnd.call(this, chunk, encoding);
                };

                next();
            } catch (error) {
                logger.error('Rate limiter error', {
                    error: error.message,
                    endpoint: config.endpoint,
                    category: 'rate_limiter_error'
                });
                // On error, allow request to proceed
                next();
            }
        };
    }

    /**
     * Check if identifier has exceeded rate limit
     */
    async checkLimit(identifier, identifierType, endpoint, maxRequests, windowMs) {
        try {
            const windowStart = new Date(Date.now() - windowMs);
            const windowEnd = new Date(Date.now() + windowMs);

            // Check if already blocked
            const [blocked] = await db.execute(
                `SELECT id, block_reason, window_end 
                 FROM rate_limits 
                 WHERE identifier = ? 
                 AND identifier_type = ? 
                 AND endpoint = ? 
                 AND is_blocked = 1 
                 AND window_end > NOW()
                 LIMIT 1`,
                [identifier, identifierType, endpoint]
            );

            if (blocked.length > 0) {
                const retryAfter = Math.ceil((new Date(blocked[0].window_end) - Date.now()) / 1000);
                return {
                    blocked: true,
                    reason: blocked[0].block_reason || 'Rate limit exceeded',
                    retryAfter
                };
            }

            // Get current request count in window
            const [rows] = await db.execute(
                `SELECT request_count, window_start, window_end 
                 FROM rate_limits 
                 WHERE identifier = ? 
                 AND identifier_type = ? 
                 AND endpoint = ? 
                 AND window_end > NOW()
                 ORDER BY window_start DESC
                 LIMIT 1`,
                [identifier, identifierType, endpoint]
            );

            if (rows.length > 0) {
                const current = rows[0];
                if (current.request_count >= maxRequests) {
                    // Block this identifier
                    await db.execute(
                        `UPDATE rate_limits 
                         SET is_blocked = 1, 
                             block_reason = 'Rate limit exceeded',
                             window_end = DATE_ADD(NOW(), INTERVAL ? MILLISECOND)
                         WHERE identifier = ? 
                         AND identifier_type = ? 
                         AND endpoint = ?`,
                        [windowMs, identifier, identifierType, endpoint]
                    );

                    logSecurityEvent('rate_limit_exceeded', {
                        identifier,
                        identifier_type: identifierType,
                        endpoint,
                        request_count: current.request_count,
                        max_requests: maxRequests
                    }, null, identifier);

                    const retryAfter = Math.ceil(windowMs / 1000);
                    return {
                        blocked: true,
                        reason: 'Too many requests',
                        retryAfter
                    };
                }
            }

            return { blocked: false };
        } catch (error) {
            logger.error('Rate limit check error', {
                error: error.message,
                identifier,
                identifier_type: identifierType,
                category: 'rate_limiter_error'
            });
            return { blocked: false }; // Fail open
        }
    }

    /**
     * Increment request count for identifier
     */
    async incrementLimit(identifier, identifierType, endpoint, windowMs) {
        try {
            const windowStart = new Date();
            const windowEnd = new Date(Date.now() + windowMs);

            await db.execute(
                `INSERT INTO rate_limits 
                 (identifier, identifier_type, endpoint, request_count, window_start, window_end) 
                 VALUES (?, ?, ?, 1, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 request_count = request_count + 1,
                 updated_at = NOW()`,
                [identifier, identifierType, endpoint, windowStart, windowEnd]
            );
        } catch (error) {
            logger.error('Rate limit increment error', {
                error: error.message,
                identifier,
                identifier_type: identifierType,
                category: 'rate_limiter_error'
            });
        }
    }

    /**
     * Send blocked response
     */
    sendBlockedResponse(res, checkResult, config) {
        logSecurityEvent('rate_limit_blocked_request', {
            endpoint: config.endpoint,
            reason: checkResult.reason,
            retry_after: checkResult.retryAfter
        }, null, null);

        return res.status(429).json({
            error: 'Too Many Requests',
            message: config.message,
            retryAfter: checkResult.retryAfter,
            blocked: true,
            endpoint: config.endpoint,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Cleanup expired rate limit records
     */
    async cleanup() {
        try {
            const [result] = await db.execute(
                'DELETE FROM rate_limits WHERE window_end < NOW()'
            );

            if (result.affectedRows > 0) {
                logger.info('Rate limit cleanup completed', {
                    deleted_records: result.affectedRows,
                    category: 'rate_limiter_cleanup'
                });
            }
        } catch (error) {
            logger.error('Rate limit cleanup error', {
                error: error.message,
                category: 'rate_limiter_error'
            });
        }
    }

    /**
     * Start automatic cleanup
     */
    startCleanup() {
        // Run cleanup every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);

        // Also run on startup
        this.cleanup();
    }

    /**
     * Stop automatic cleanup
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Advanced rate limit with multiple strategies
 */
export const advancedRateLimit = (options = {}) => {
    return rateLimiter.createLimit(options);
};

/**
 * Preset rate limiters for common scenarios
 */
export const rateLimitPresets = {
    // Strict limit for authentication endpoints
    auth: advancedRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        maxPerDevice: 3,
        endpoint: 'auth',
        message: 'Too many authentication attempts. Please try again later.'
    }),

    // Very strict for login
    login: advancedRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 3,
        maxPerDevice: 2,
        endpoint: 'login',
        message: 'Too many login attempts. Please try again later.',
        skipSuccessfulRequests: true // Only count failed attempts
    }),

    // Moderate limit for password reset
    passwordReset: advancedRateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        maxPerDevice: 2,
        endpoint: 'password_reset',
        message: 'Too many password reset requests. Please try again later.'
    }),

    // Lenient for general API
    api: advancedRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        maxPerDevice: 50,
        endpoint: 'api',
        message: 'Too many requests. Please try again later.'
    }),

    // Strict for OTP endpoints
    otp: advancedRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        maxPerDevice: 3,
        endpoint: 'otp',
        message: 'Too many OTP requests. Please try again later.'
    })
};

export { rateLimiter };
export default advancedRateLimit;
