import express from 'express';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import { validatePagination, validateDateRange } from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as userController from '../controllers/userController.js';
import { uploadHandlers, handleUploadError } from '../utils/fileUpload.js';

const router = express.Router();

const userRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 2000,
    maxPerDevice: 1000,
    endpoint: 'users'
});

// Create specific rate limiter for profile picture uploads
const profilePictureUploadRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,             // max 5 uploads per window
    maxPerDevice: 3,            // max per device
    endpoint: 'profile_picture_upload',
    message: 'Too many profile picture upload attempts. Please try again later.'
});

router.use(authenticateToken);
router.use(userRateLimit);

// Existing user profile routes remain unchanged
router.get('/profile', asyncHandler(userController.getUserProfile));
router.put('/profile', asyncHandler(userController.updateUserProfile));
router.delete('/profile', asyncHandler(userController.deleteUserAccount));

// User profile details routes remain unchanged
router.get('/profile/details', asyncHandler(userController.getUserProfileDetails));
router.put('/profile/details', asyncHandler(userController.updateUserProfileDetails));
router.delete('/profile/details/:field', asyncHandler(userController.deleteUserProfileField));
router.delete('/profile/details', asyncHandler(userController.deleteAllUserProfileFields));

// Profile picture upload route with specific rate limit
router.post(
    '/profile/picture',
    profilePictureUploadRateLimit,
    uploadHandlers.profilePictures.single('profilePicture'),
    handleUploadError,
    asyncHandler(userController.uploadProfilePicture)
);

router.delete(
    '/profile/picture',
    asyncHandler(userController.deleteProfilePicture)
);

// Profile picture retrieval route (ownership and auth enforced)
router.get(
    '/profile/picture/:filename',
    asyncHandler(userController.getProfilePicture)
);

// User orders and other routes unchanged
router.get('/orders', validatePagination, validateDateRange, asyncHandler(userController.getUserOrders));
router.get('/orders/:orderId', requireOwnership('orderId', 'orders'), asyncHandler(userController.getUserOrderById));
router.get('/addresses', asyncHandler(userController.getUserAddresses));
router.get('/prescriptions', validatePagination, asyncHandler(userController.getUserPrescriptions));
router.get('/prescriptions/:prescriptionId', requireOwnership('prescriptionId', 'prescriptions'), asyncHandler(userController.getUserPrescriptionById));
router.get('/consultations', validatePagination, validateDateRange, asyncHandler(userController.getUserConsultations));
router.get('/sessions', asyncHandler(userController.getUserSessions));
router.delete('/sessions/:sessionId', asyncHandler(userController.revokeUserSession));
router.delete('/sessions', asyncHandler(userController.revokeAllUserSessions));
router.get('/stats', asyncHandler(userController.getUserStats));

export default router;
