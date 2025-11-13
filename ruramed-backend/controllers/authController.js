import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, withTransaction } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { userCache } from '../utils/cache.js';
import { 
    logger, 
    logAuthEvent, 
    logSecurityEvent, 
    logError, 
    logAuditTrail 
} from '../utils/logger.js';
import { 
    hashPassword, 
    verifyPassword, 
    validatePasswordSecurity,
    validateEmail,
    validatePhone  // ← ADD THIS
} from '../utils/validation.js';
import { emailService } from '../utils/emailService.js';
import { otpService } from '../utils/otpService.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TOKEN GENERATION & REFRESH LOGIC
// ============================================

// Generate short-lived JWT access token (15 minutes)
const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role || 'user',
            type: 'access'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
};

// Generate long-lived refresh token (7 days)
const generateRefreshToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken, expiresAt) => {
    try {
        await db.execute(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
             token = VALUES(token),
             expires_at = VALUES(expires_at),
             updated_at = NOW()`,
            [userId, refreshToken, expiresAt]
        );
    } catch (error) {
        logError(error, { context: 'store_refresh_token_failed', user_id: userId });
    }
};

export const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;
    const clientIp = req.ip;

    if (!refreshToken) {
        return res.status(400).json({
            error: 'Refresh token is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Verify refresh token signature
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Verify it's a refresh token
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                error: 'Invalid token type',
                timestamp: new Date().toISOString()
            });
        }

        // Check if token exists in database and is not revoked
        const [tokenRows] = await db.execute(
            `SELECT token FROM refresh_tokens 
             WHERE user_id = ? AND token = ? AND expires_at > NOW()`,
            [decoded.id, refreshToken]
        );

        if (tokenRows.length === 0) {
            logSecurityEvent('refresh_token_invalid_or_revoked', {
                user_id: decoded.id
            }, decoded.id, clientIp);

            return res.status(401).json({
                error: 'Refresh token invalid or expired',
                timestamp: new Date().toISOString()
            });
        }

        // Get user data
        const user = await preparedQueries.users.findById(decoded.id);
        if (!user) {
            return res.status(403).json({
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user);

        logAuthEvent('token_refreshed', user.id, clientIp, {
            email: user.email
        });

        res.json({
            message: 'Token refreshed successfully',
            accessToken: newAccessToken,
            expiresIn: 900, // 15 minutes
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Refresh token expired',
                expired_at: error.expiredAt,
                timestamp: new Date().toISOString()
            });
        }

        logError(error, {
            operation: 'refresh_token',
            ip: clientIp
        });

        res.status(401).json({
            error: 'Failed to refresh token',
            timestamp: new Date().toISOString()
        });
    }
};


// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// User registration (Email OTP mandatory)
export const register = async (req, res) => {
    // Get data either from validated middleware or direct from body
    const userData = req.validatedData || req.body || {};
    const { name, email, phone, password, location } = userData;
    const providedOtp = userData.otp || userData.otp_code;
    const clientIp = req.ip;
    const deviceInfo = req.deviceInfo || { fingerprint: 'unknown' };

    // Basic validation if middleware didn't run
    if (!name || !email || !phone || !password) {
        return res.status(400).json({
            error: 'Missing required fields',
            message: 'Name, email, phone, and password are required',
            timestamp: new Date().toISOString()
        });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Invalid email format',
            timestamp: new Date().toISOString()
        });
    }

    // Password validation (fallback if utils not available)
    if (password.length < 8) {
        return res.status(400).json({
            error: 'Password validation failed',
            message: 'Password must be at least 8 characters long',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // ==========================================
        // STEP 1: No OTP provided - Send OTP
        // ==========================================
        if (!providedOtp) {
            // Check if user already exists BEFORE sending OTP
            // This prevents duplicate registrations for completed accounts
            const existingUser = await preparedQueries.users.findByEmail(email);
            if (existingUser) {
                logSecurityEvent('duplicate_registration_attempt', {
                    email,
                    existing_user_id: existingUser.id,
                    stage: 'otp_request'
                }, null, clientIp);

                return res.status(409).json({
                    error: 'User already exists',
                    message: 'An account with this email already exists. Please login instead.',
                    timestamp: new Date().toISOString()
                });
            }

            // Check if phone already exists
            const [phoneCheck] = await db.execute(
                'SELECT id FROM users WHERE phone = ?',
                [phone]
            );
            if (phoneCheck.length > 0) {
                return res.status(409).json({
                    error: 'Phone number already exists',
                    message: 'An account with this phone number already exists',
                    timestamp: new Date().toISOString()
                });
            }

            // Send OTP for email verification
            const result = await otpService.createOTP(email, null, 'email_verification', null, 10);
            if (!result.success) {
                return res.status(500).json({
                    error: 'Failed to send verification OTP',
                    timestamp: new Date().toISOString()
                });
            }

            logAuthEvent('registration_otp_sent', null, clientIp, { 
                email, 
                expires_at: result.expiresAt 
            });

            return res.status(202).json({
                message: 'OTP sent to your email. Please verify to complete registration',
                email_verification_required: true,
                expires_at: result.expiresAt,
                timestamp: new Date().toISOString()
            });
        }

        // ==========================================
        // STEP 2: OTP provided - Verify and Register
        // ==========================================
        
        // Verify provided OTP (mandatory)
        const verify = await otpService.verifyOTP(email, providedOtp, 'email_verification', clientIp);
        if (!verify.success) {
            await otpService.incrementAttempts(email, 'email_verification', clientIp);
            return res.status(400).json({
                error: verify.error || 'Invalid OTP',
                message: verify.error || 'The OTP you entered is invalid or expired',
                timestamp: new Date().toISOString()
            });
        }

        // NOW check if user exists (after OTP verification)
        // This prevents race conditions where multiple OTP verifications happen simultaneously
        const existingUser = await preparedQueries.users.findByEmail(email);
        if (existingUser) {
            logSecurityEvent('duplicate_registration_after_otp', {
                email,
                existing_user_id: existingUser.id,
                stage: 'post_otp_verification'
            }, null, clientIp);

            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email was already created. Please login instead.',
                timestamp: new Date().toISOString()
            });
        }

        // Check phone number again (after OTP verification)
        const [phoneCheck] = await db.execute(
            'SELECT id FROM users WHERE phone = ?',
            [phone]
        );
        if (phoneCheck.length > 0) {
            return res.status(409).json({
                error: 'Phone number already exists',
                message: 'An account with this phone number already exists',
                timestamp: new Date().toISOString()
            });
        }

        // Hash password using bcrypt directly
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ✅ NEW: Create user and user_profile in transaction
        const userId = await withTransaction(async (connection) => {
            const safeLocation = (location === undefined) ? null : location;
            
            // Create user
            const [userResult] = await connection.execute(
                'INSERT INTO users (name, email, phone, password, location) VALUES (?, ?, ?, ?, ?)',
                [name, email, phone, hashedPassword, safeLocation]
            );

            const newUserId = userResult.insertId;

            // ✅ NEW: Auto-create user_profile with customer_unique_id
            try {
                const customerUniqueId = `CUST-${uuidv4().substring(0, 12).toUpperCase()}`;
                
                await connection.execute(
                    `INSERT INTO user_profiles 
                     (user_id, full_name, email_verified, mobile_verified, customer_unique_id)
                     VALUES (?, ?, ?, ?, ?)`,
                    [newUserId, name, 1, 0, customerUniqueId]
                );
                
                logAuthEvent('user_profile_created', newUserId, clientIp, {
                    customer_unique_id: customerUniqueId
                });
            } catch (profileError) {
                logError(profileError, {
                    context: 'create_user_profile_failed',
                    user_id: newUserId
                });
                // Continue anyway - user is created
            }

            return newUserId;
        });

        // ✅ Generate BOTH access and refresh tokens
        const user = await preparedQueries.users.findById(userId);
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        // Calculate refresh token expiry (7 days)
        const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // ✅ Store refresh token in database
        try {
            await storeRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);
        } catch (e) {
            logError(e, { context: 'store_refresh_token_failed_registration', user_id: userId });
            // Continue anyway - auth will still work with session
        }

        // Create session
        let sessionId = null;
        try {
            sessionId = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await db.execute(
                `INSERT INTO user_sessions 
                 (session_id, user_id, ip_address, user_agent, device_fingerprint, device_info, expires_at, last_activity) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    sessionId,
                    userId,
                    clientIp,
                    req.get('User-Agent') || '',
                    deviceInfo.fingerprint || 'unknown',
                    JSON.stringify(deviceInfo || {}),
                    expiresAt
                ]
            );
        } catch (e) {
            logError(e, { context: 'create_registration_session_failed', user_id: userId });
        }

        // Log successful registration
        logAuthEvent('user_registered', userId, clientIp, {
            email,
            name,
            phone,
            location,
            device_fingerprint: deviceInfo.fingerprint,
            email_verified_via_otp: true
        });

        logAuditTrail('CREATE', 'user', userId, null, {
            name, email, phone, location
        });

        // ✅ Return both tokens with new format
        return res.status(201).json({
            message: 'User registered successfully',
            accessToken,          // ✅ Short-lived access token
            refreshToken,         // ✅ Long-lived refresh token
            sessionId,            // ✅ Keep for backward compatibility
            expiresIn: 900,       // ✅ 15 minutes in seconds
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'user_registration',
            email,
            ip: clientIp
        });

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Duplicate entry',
                message: 'Email or phone number already exists',
                timestamp: new Date().toISOString()
            });
        }

        return res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration',
            timestamp: new Date().toISOString()
        });
    }
};

// User login
export const login = async (req, res) => {
    const loginData = req.validatedData || req.body || {};
    const { email, password } = loginData;
    const clientIp = req.ip;
    const deviceInfo = req.deviceInfo || { fingerprint: 'unknown' };

    if (!email || !password) {
        return res.status(400).json({
            error: 'Missing credentials',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const user = await preparedQueries.users.findByEmail(email);
        if (!user) {
            logSecurityEvent('login_attempt_invalid_email', { email }, null, clientIp);
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
                timestamp: new Date().toISOString()
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logSecurityEvent('login_attempt_invalid_password', { 
                email,
                user_id: user.id 
            }, user.id, clientIp);
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
                timestamp: new Date().toISOString()
            });
        }

        // ✅ Generate BOTH access and refresh tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Calculate refresh token expiry
        const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Store refresh token in database
        await storeRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

        // Create session record
        let sessionId = null;
        try {
            sessionId = req.headers['x-session-id'] || crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await db.execute(
                `INSERT INTO user_sessions 
                 (session_id, user_id, ip_address, user_agent, device_fingerprint, device_info, expires_at, last_activity) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE 
                 last_activity = NOW(), 
                 is_active = 1,
                 logout_at = NULL,
                 logout_reason = NULL`,
                [
                    sessionId,
                    user.id,
                    clientIp,
                    req.get('User-Agent') || '',
                    deviceInfo.fingerprint || 'unknown',
                    JSON.stringify(deviceInfo || {}),
                    expiresAt
                ]
            );
            res.setHeader('x-session-id', sessionId);
        } catch (e) {
            logError(e, { context: 'create_login_session_failed', user_id: user.id });
        }

        // Cache user data
        userCache.set(user.id, {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            location: user.location
        }, 1800);

        logAuthEvent('user_login_success', user.id, clientIp, {
            email,
            device_fingerprint: deviceInfo.fingerprint,
            device_info: deviceInfo
        });

        const response = {
            message: 'Login successful',
            accessToken,      // ✅ Short-lived token
            refreshToken,      // ✅ Long-lived token
            sessionId,
            expiresIn: 900,    // 15 minutes in seconds
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                location: user.location
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        logError(error, {
            operation: 'user_login',
            email,
            ip: clientIp
        });

        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login',
            timestamp: new Date().toISOString()
        });
    }
};

// User logout
export const logout = async (req, res) => {
    const userId = req.user.id;
    let sessionId = req.sessionId || req.headers['x-session-id'];
    const clientIp = req.ip;

    try {
        // Revoke refresh token
        await db.execute(
            'DELETE FROM refresh_tokens WHERE user_id = ?',
            [userId]
        );

        // Invalidate session
        if (sessionId) {
            await db.execute(
                'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = "manual" WHERE session_id = ?',
                [sessionId]
            );
        }

        userCache.invalidate(userId);

        logAuthEvent('user_logout', userId, clientIp, {
            session_id: sessionId || 'unresolved'
        });

        res.json({
            message: 'Logout successful',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'user_logout',
            user_id: userId,
            ip: clientIp
        });

        res.status(500).json({
            error: 'Logout failed',
            message: 'An error occurred during logout',
            timestamp: new Date().toISOString()
        });
    }
};

// Get user profile
export const getProfile = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await preparedQueries.users.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            user: {
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
            error: 'Failed to fetch profile',
            timestamp: new Date().toISOString()
        });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const updateData = req.validatedData || req.body;
    const clientIp = req.ip;

    try {
        // Check if any valid fields are provided
        const allowedFields = ['name', 'phone', 'location'];
        const providedFields = Object.keys(updateData).filter(field => allowedFields.includes(field));
        
        if (providedFields.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                message: 'Provide at least one field to update: name, phone, location',
                timestamp: new Date().toISOString()
            });
        }

        // Use updateData directly since validation middleware only passes valid fields
        const filteredUpdateData = updateData;

        // Get current user data for audit trail
        const currentUser = await preparedQueries.users.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        // Update user
        const updated = await preparedQueries.users.updateById(userId, filteredUpdateData, userId);
        if (!updated) {
            return res.status(404).json({
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        // Clear cache
        userCache.invalidate(userId);

        // Log profile update
        logAuthEvent('profile_updated', userId, clientIp, {
            updated_fields: Object.keys(filteredUpdateData)
        });

        logAuditTrail('UPDATE', 'user', userId, currentUser, filteredUpdateData);

        res.json({
            message: 'Profile updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_user_profile',
            user_id: userId,
            update_data: filteredUpdateData || updateData
        });

        res.status(500).json({
            error: 'Failed to update profile',
            timestamp: new Date().toISOString()
        });
    }
};

// Forgot Password: creates and emails OTP for password reset
// Accepts email OR phone number
export const forgotPassword = async (req, res) => {
    const { email, phone, identifier } = req.validatedData || req.body || {};
    const clientIp = req.ip;

    // Accept email, phone, or identifier field
    const userIdentifier = identifier || email || phone;

    if (!userIdentifier) {
        return res.status(400).json({ 
            error: 'Email or phone number is required', 
            timestamp: new Date().toISOString() 
        });
    }

    try {
        let user = null;
        let userEmail = null;
        let lookupType = null;

        // Determine if identifier is email or phone
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[6-9]\d{9}$/;

        if (emailRegex.test(userIdentifier)) {
            // Lookup by email
            const emailValidation = validateEmail(userIdentifier);
            if (!emailValidation.isValid) {
                return res.status(400).json({ 
                    error: emailValidation.error, 
                    timestamp: new Date().toISOString() 
                });
            }
            user = await preparedQueries.users.findByEmail(emailValidation.sanitized);
            userEmail = emailValidation.sanitized;
            lookupType = 'email';
        } else if (phoneRegex.test(userIdentifier.replace(/\D/g, ''))) {
            // Lookup by phone
            const phoneValidation = validatePhone(userIdentifier);
            if (!phoneValidation.isValid) {
                return res.status(400).json({ 
                    error: phoneValidation.error, 
                    timestamp: new Date().toISOString() 
                });
            }
            
            // Find user by phone
            const [phoneUsers] = await db.execute(
                'SELECT * FROM users WHERE phone = ?',
                [phoneValidation.sanitized]
            );
            
            if (phoneUsers.length > 0) {
                user = phoneUsers[0];
                userEmail = user.email; // Use email from user record
                lookupType = 'phone';
            }
        } else {
            return res.status(400).json({ 
                error: 'Invalid email or phone number format', 
                timestamp: new Date().toISOString() 
            });
        }

        // Always return same response to prevent user enumeration
        const standardResponse = {
            message: 'If an account exists with this email or phone number, a password reset OTP has been sent to the registered email address',
            timestamp: new Date().toISOString()
        };

        // If user not found, log but return success
        if (!user) {
            logSecurityEvent('forgot_password_unknown_identifier', {
                identifier: userIdentifier,
                lookup_type: lookupType
            }, null, clientIp);
            
            // Return success to prevent enumeration
            return res.json(standardResponse);
        }

        // User found - send OTP to their email
        const result = await otpService.createOTP(
            userEmail, 
            user.phone, 
            'forgot_password', 
            user.id, 
            10
        );

        if (!result.success) {
            // Even on failure, return generic success message
            logError(new Error('Failed to send password reset OTP'), {
                user_id: user.id,
                email: userEmail,
                lookup_type: lookupType
            });
            return res.json(standardResponse);
        }

        logAuthEvent('forgot_password_otp_created', user.id, clientIp, {
            lookup_type: lookupType,
            expires_at: result.expiresAt
        });

        // Return generic success message (no expires_at to prevent enumeration)
        return res.json(standardResponse);

    } catch (error) {
        logError(error, {
            operation: 'forgot_password',
            identifier: userIdentifier
        });
        
        // Return generic message even on error
        return res.json({
            message: 'If an account exists with this email or phone number, a password reset OTP has been sent to the registered email address',
            timestamp: new Date().toISOString()
        });
    }
};

// Verify OTP (accepts email OR phone, marks as verified)
export const verifyOTP = async (req, res) => {
    const { email, phone, identifier, otp, otp_code, otpType, otp_type } = req.validatedData || req.body || {};
    const code = otp || otp_code;
    const type = otp_type || otpType || 'forgot_password';
    
    let lookupIdentifier = email || phone || identifier;

    if (!lookupIdentifier || !code) {
        return res.status(400).json({ 
            error: 'Identifier (email/phone) and OTP are required', 
            timestamp: new Date().toISOString() 
        });
    }

    try {
        const phoneRegex = /^[6-9]\d{9}$/;
        const isPhone = phoneRegex.test(lookupIdentifier.replace(/\s+/g, ''));
        
        // Find OTP record by phone or email
        const [otpRows] = await db.execute(
            `SELECT * FROM otp_verifications 
             WHERE ${isPhone ? 'phone' : 'email'} = ? 
             AND otp_code = ? 
             AND otp_type = ? 
             AND expires_at > NOW() 
             AND is_verified = 0
             LIMIT 1`,
            [isPhone ? lookupIdentifier.replace(/\s+/g, '') : lookupIdentifier, code, type]
        );

        if (otpRows.length === 0) {
            logSecurityEvent('otp_verification_failed', {
                identifier: lookupIdentifier,
                otp_type: type,
                reason: 'invalid_or_expired'
            }, null, req.ip);

            return res.status(400).json({ 
                error: 'Invalid or expired OTP', 
                timestamp: new Date().toISOString() 
            });
        }

        const otpRecord = otpRows[0];

        // Check max attempts
        if (otpRecord.attempts >= 5) {
            logSecurityEvent('otp_max_attempts_exceeded', {
                otp_type: type,
                attempts: otpRecord.attempts
            }, otpRecord.user_id, req.ip);

            await db.execute('DELETE FROM otp_verifications WHERE id = ?', [otpRecord.id]);

            return res.status(400).json({ 
                error: 'Maximum OTP attempts exceeded. Please request a new OTP.', 
                timestamp: new Date().toISOString() 
            });
        }

        // ✅ Mark as verified (keep record for 30 minutes)
        await db.execute(
            `UPDATE otp_verifications 
             SET is_verified = 1, verified_at = NOW() 
             WHERE id = ?`,
            [otpRecord.id]
        );

        logAuthEvent('otp_verified', otpRecord.user_id, req.ip, {
            identifier_type: isPhone ? 'phone' : 'email',
            otp_type: type
        });

        return res.json({ 
            message: 'OTP verified successfully', 
            otp_type: type,
            verified: true,
            timestamp: new Date().toISOString() 
        });

    } catch (error) {
        logError(error, { operation: 'verify_otp', identifier: lookupIdentifier, otp_type: type });
        return res.status(500).json({ 
            error: 'OTP verification failed', 
            timestamp: new Date().toISOString() 
        });
    }
};

// Reset Password (verifies OTP again before resetting)
export const resetPassword = async (req, res) => {
    const { email, phone, identifier, otp, otp_code, new_password, newPassword } = req.validatedData || req.body || {};
    const lookupIdentifier = identifier || email || phone;
    const code = otp || otp_code;
    const newPass = new_password || newPassword;

    if (!lookupIdentifier || !code || !newPass) {
        return res.status(400).json({ 
            error: 'Identifier, OTP, and new password are required', 
            timestamp: new Date().toISOString() 
        });
    }

    try {
        // Validate password strength
        const pwdCheck = await validatePasswordSecurity(newPass);
        if (!pwdCheck.isValid) {
            return res.status(400).json({ 
                error: pwdCheck.error || 'Weak password',
                timestamp: new Date().toISOString() 
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        const isPhone = phoneRegex.test(lookupIdentifier.replace(/\s+/g, ''));

        // ✅ Find VERIFIED OTP (within 30 minutes)
        const [otpRows] = await db.execute(
            `SELECT * FROM otp_verifications 
             WHERE ${isPhone ? 'phone' : 'email'} = ? 
             AND otp_code = ?
             AND otp_type = 'forgot_password'
             AND is_verified = 1 
             AND verified_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
             ORDER BY verified_at DESC
             LIMIT 1`,
            [isPhone ? lookupIdentifier.replace(/\s+/g, '') : lookupIdentifier, code]
        );

        if (otpRows.length === 0) {
            logSecurityEvent('password_reset_invalid_otp', {
                identifier: lookupIdentifier,
                reason: 'otp_not_verified_or_expired'
            }, null, req.ip);

            return res.status(400).json({ 
                error: 'Invalid or expired OTP. Verification must be completed within 30 minutes.',
                timestamp: new Date().toISOString() 
            });
        }

        const otpRecord = otpRows[0];
        const { user_id, email: userEmail } = otpRecord;

        // ✅ Verify user_id matches the email/phone
        const [users] = await db.execute(
            `SELECT id FROM users WHERE id = ? AND ${isPhone ? 'phone' : 'email'} = ? LIMIT 1`,
            [user_id, isPhone ? lookupIdentifier.replace(/\s+/g, '') : lookupIdentifier]
        );

        if (users.length === 0) {
            logSecurityEvent('password_reset_user_mismatch', {
                identifier: lookupIdentifier,
                user_id: user_id
            }, user_id, req.ip);

            return res.status(400).json({ 
                error: 'User verification failed',
                timestamp: new Date().toISOString() 
            });
        }

        // Hash new password
        const { success, hash, error } = await hashPassword(newPass);
        if (!success) {
            return res.status(500).json({ 
                error: error || 'Failed to hash password', 
                timestamp: new Date().toISOString() 
            });
        }

        // Update password
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hash, user_id]);

        // ✅ NOW delete the used OTP
        await db.execute('DELETE FROM otp_verifications WHERE id = ?', [otpRecord.id]);

        // Invalidate all active sessions
        await db.execute(
            'UPDATE user_sessions SET is_active = 0, logout_at = NOW(), logout_reason = "security" WHERE user_id = ? AND is_active = 1',
            [user_id]
        );
        userCache.invalidate(user_id);

        logAuthEvent('password_reset_success', user_id, req.ip, { 
            email: userEmail,
            identifier_type: isPhone ? 'phone' : 'email'
        });

        return res.json({ 
            message: 'Password has been reset successfully', 
            timestamp: new Date().toISOString() 
        });

    } catch (error) {
        logError(error, { operation: 'reset_password', identifier: lookupIdentifier });
        return res.status(500).json({ 
            error: 'Failed to reset password', 
            timestamp: new Date().toISOString() 
        });
    }
};

// Resend OTP
export const resendOTP = async (req, res) => {
    const { email, otpType, otp_type } = req.validatedData || req.body || {};
    const type = otp_type || otpType || 'forgot_password';

    if (!email) {
        return res.status(400).json({ error: 'Email is required', timestamp: new Date().toISOString() });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        return res.status(400).json({ error: emailValidation.error, timestamp: new Date().toISOString() });
    }

    try {
        const user = await preparedQueries.users.findByEmail(emailValidation.sanitized);
        if (!user) {
            // Avoid enumeration
            return res.json({ message: 'If the account exists, an OTP has been sent', timestamp: new Date().toISOString() });
        }

        const result = await otpService.createOTP(emailValidation.sanitized, null, type, user.id, 10);
        if (!result.success) {
            return res.status(500).json({ error: 'Failed to send OTP', timestamp: new Date().toISOString() });
        }

        logAuthEvent('otp_resent', user.id, req.ip, { email: emailValidation.sanitized, otp_type: type });
        return res.json({ message: 'OTP sent', expires_at: result.expiresAt, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'resend_otp', email, otp_type: type });
        return res.status(500).json({ error: 'Failed to resend OTP', timestamp: new Date().toISOString() });
    }
};
