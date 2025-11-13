import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
    validateUserRegistration, 
    validateUserProfileUpdate,
    validateUserLogin 
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as authController from '../controllers/authController.js';
import { rateLimitPresets } from '../middleware/rateLimiter.js';
import { refreshAccessToken } from '../controllers/authController.js';

const router = express.Router();

// Auth routes with specific rate limiters
router.post('/register', 
    rateLimitPresets.auth,
    validateUserRegistration,
    asyncHandler(authController.register)
);

router.post('/login', 
    rateLimitPresets.login,
    asyncHandler(authController.login)
);

router.post('/logout', 
    authenticateToken,
    asyncHandler(authController.logout)
);

router.get('/profile', 
    authenticateToken,
    asyncHandler(authController.getProfile)
);

router.put('/profile', 
    authenticateToken,
    validateUserProfileUpdate,
    asyncHandler(authController.updateProfile)
);

router.post('/forgot-password',
    rateLimitPresets.passwordReset,
    asyncHandler(authController.forgotPassword)
);

router.post('/reset-password',
    rateLimitPresets.auth,
    asyncHandler(authController.resetPassword)
);

router.post('/verify-otp',
    rateLimitPresets.otp,
    asyncHandler(authController.verifyOTP)
);

router.post('/resend-otp',
    rateLimitPresets.otp,
    asyncHandler(authController.resendOTP)
);

router.post('/refresh', refreshAccessToken); 

export default router;
