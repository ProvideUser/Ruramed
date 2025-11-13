import { db } from '../config/database.js';
import { emailService } from './emailService.js';
import { logger, logError, logSecurityEvent } from './logger.js';
import crypto from 'crypto';

class OTPService {
    constructor() {
        this.otpLength = 6;
        this.defaultExpiryMinutes = 10;
        this.maxAttempts = 5;
    }

    /**
     * Generate random OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Create and send OTP
     * @param {string} email - User email
     * @param {string} phone - User phone (optional)
     * @param {string} otpType - Type of OTP (signup, forgot_password, etc.)
     * @param {number} userId - User ID (optional)
     * @param {number} expiryMinutes - Expiry time in minutes
     */
    async createOTP(email, phone = null, otpType = 'email_verification', userId = null, expiryMinutes = null) {
        const expiry = expiryMinutes || this.defaultExpiryMinutes;
        
        try {
            // Generate OTP
            const otpCode = this.generateOTP();
            const expiresAt = new Date(Date.now() + expiry * 60 * 1000);

            // Delete any existing OTPs for this email/type
            await db.execute(
                `DELETE FROM otp_verifications 
                 WHERE email = ? AND otp_type = ?`,
                [email, otpType]
            );

            // Insert new OTP
            await db.execute(
                `INSERT INTO otp_verifications 
                 (user_id, email, phone, otp_code, otp_type, expires_at, attempts) 
                 VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [userId, email, phone, otpCode, otpType, expiresAt]
            );

            // Send OTP via email
            const emailResult = await emailService.sendOTP(email, otpCode, otpType, expiry);

            if (!emailResult.success) {
                logError(new Error('Failed to send OTP email'), {
                    email,
                    otp_type: otpType,
                    email_error: emailResult.error
                });
                return { success: false, error: 'Failed to send OTP email' };
            }

            logger.info('OTP created and sent', {
                email,
                otp_type: otpType,
                user_id: userId,
                expires_at: expiresAt,
                category: 'otp_service'
            });

            return {
                success: true,
                expiresAt: expiresAt.toISOString()
            };

        } catch (error) {
            logError(error, {
                operation: 'create_otp',
                email,
                otp_type: otpType
            });
            return { success: false, error: 'Failed to create OTP' };
        }
    }

    /**
     * Verify OTP
     * @param {string} email - User email
     * @param {string} otpCode - OTP code to verify
     * @param {string} otpType - Type of OTP
     * @param {string} ip - Client IP address
     */
    async verifyOTP(email, otpCode, otpType, ip = null) {
        try {
            // Find OTP record
            const [rows] = await db.execute(
                `SELECT * FROM otp_verifications 
                 WHERE email = ? 
                 AND otp_code = ? 
                 AND otp_type = ? 
                 AND expires_at > NOW() 
                 AND is_verified = 0
                 LIMIT 1`,
                [email, otpCode, otpType]
            );

            if (rows.length === 0) {
                logSecurityEvent('otp_verification_failed', {
                    email,
                    otp_type: otpType,
                    reason: 'invalid_or_expired'
                }, null, ip);

                return { success: false, error: 'Invalid or expired OTP' };
            }

            const otpRecord = rows[0];

            // Check max attempts
            if (otpRecord.attempts >= this.maxAttempts) {
                logSecurityEvent('otp_max_attempts_exceeded', {
                    email,
                    otp_type: otpType,
                    attempts: otpRecord.attempts
                }, otpRecord.user_id, ip);

                // Delete OTP after max attempts
                await db.execute(
                    'DELETE FROM otp_verifications WHERE id = ?',
                    [otpRecord.id]
                );

                return { success: false, error: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
            }

            // Mark as verified
            await db.execute(
                `UPDATE otp_verifications 
                 SET is_verified = 1, verified_at = NOW() 
                 WHERE id = ?`,
                [otpRecord.id]
            );

            // Delete verified OTP (cleanup)
            await db.execute(
                'DELETE FROM otp_verifications WHERE id = ?',
                [otpRecord.id]
            );

            logger.info('OTP verified successfully', {
                email,
                otp_type: otpType,
                user_id: otpRecord.user_id,
                category: 'otp_service'
            });

            return {
                success: true,
                userId: otpRecord.user_id,
                email: otpRecord.email,
                phone: otpRecord.phone
            };

        } catch (error) {
            logError(error, {
                operation: 'verify_otp',
                email,
                otp_type: otpType
            });
            return { success: false, error: 'OTP verification failed' };
        }
    }

    /**
     * Increment failed OTP attempts
     */
    async incrementAttempts(email, otpType, ip = null) {
        try {
            const [result] = await db.execute(
                `UPDATE otp_verifications 
                 SET attempts = attempts + 1 
                 WHERE email = ? AND otp_type = ? AND expires_at > NOW()`,
                [email, otpType]
            );

            if (result.affectedRows > 0) {
                logSecurityEvent('otp_failed_attempt', {
                    email,
                    otp_type: otpType
                }, null, ip);
            }
        } catch (error) {
            logError(error, {
                operation: 'increment_otp_attempts',
                email,
                otp_type: otpType
            });
        }
    }

    /**
     * Cleanup expired OTPs
     */
    async cleanupExpired() {
        try {
            const [result] = await db.execute(
                'DELETE FROM otp_verifications WHERE expires_at < NOW()'
            );

            if (result.affectedRows > 0) {
                logger.info('Expired OTPs cleaned up', {
                    deleted_count: result.affectedRows,
                    category: 'otp_service'
                });
            }
        } catch (error) {
            logError(error, { operation: 'cleanup_expired_otps' });
        }
    }
}

// Create singleton instance
export const otpService = new OTPService();

// Start cleanup interval (run every hour)
setInterval(() => {
    otpService.cleanupExpired();
}, 60 * 60 * 1000);

export default otpService;
