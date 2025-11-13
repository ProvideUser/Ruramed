import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { 
    validateAdminData,
    validatePagination,
    validateDateRange,
    validatePrescriptionUpload
} from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Rate limiting for admin operations
const adminRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    maxPerDevice: 50,
    endpoint: 'admin'
});

// Admin login (no auth required)
router.post('/login', 
    adminRateLimit,
    asyncHandler(adminController.adminLogin)
);

// All other admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);
router.use(adminRateLimit);

// Dashboard and analytics
router.get('/dashboard', 
    asyncHandler(adminController.getDashboard)
);

router.get('/analytics/overview', 
    validateDateRange,
    asyncHandler(adminController.getAnalyticsOverview)
);

router.get('/analytics/users', 
    validateDateRange,
    asyncHandler(adminController.getUserAnalytics)
);

router.get('/analytics/sales', 
    validateDateRange,
    asyncHandler(adminController.getSalesAnalytics)
);

// User management
router.get('/users', 
    validatePagination,
    asyncHandler(adminController.getAllUsers)
);

router.get('/users/:id', 
    asyncHandler(adminController.getUserDetails)
);

router.patch('/users/:id/status', 
    asyncHandler(adminController.updateUserStatus)
);

router.delete('/users/:id', 
    asyncHandler(adminController.deleteUser)
);

// Order management
router.get('/orders', 
    validatePagination,
    validateDateRange,
    asyncHandler(adminController.getAllOrders)
);

router.patch('/orders/:id/status', 
    asyncHandler(adminController.updateOrderStatus)
);

// Prescription management
router.get('/prescriptions', 
    validatePagination,
    asyncHandler(adminController.getAllPrescriptions)
);

router.get('/prescriptions/pending', 
    validatePagination,
    asyncHandler(adminController.getPendingPrescriptions)
);

router.patch('/prescriptions/:id/approve', 
    asyncHandler(adminController.approvePrescription)
);

router.patch('/prescriptions/:id/reject', 
    asyncHandler(adminController.rejectPrescription)
);

// Security and audit
router.get('/security/events', 
    validatePagination,
    validateDateRange,
    asyncHandler(adminController.getSecurityEvents)
);

router.get('/audit/logs', 
    validatePagination,
    validateDateRange,
    asyncHandler(adminController.getAuditLogs)
);

router.get('/sessions/active', 
    validatePagination,
    asyncHandler(adminController.getActiveSessions)
);

router.delete('/sessions/:sessionId', 
    asyncHandler(adminController.revokeSession)
);

// System management
router.get('/system/health', 
    asyncHandler(adminController.getSystemHealth)
);

router.get('/system/logs', 
    validatePagination,
    asyncHandler(adminController.getSystemLogs)
);

router.post('/system/cache/clear', 
    asyncHandler(adminController.clearCache)
);

// Admin management
router.post('/admins', 
    validateAdminData,
    asyncHandler(adminController.createAdmin)
);

router.get('/admins', 
    validatePagination,
    asyncHandler(adminController.getAllAdmins)
);

router.delete('/admins/:id', 
    asyncHandler(adminController.deleteAdmin)
);

export default router;
