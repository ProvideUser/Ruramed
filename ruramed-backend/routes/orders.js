import express from 'express';
import { authenticateToken, requireOwnership, isAdmin } from '../middleware/auth.js';
import { 
    validateOrder, 
    validatePagination, 
    validateDateRange 
} from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as orderController from '../controllers/orderController.js';

const router = express.Router();

// Rate limiting for order operations
const orderRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    maxPerDevice: 15,
    endpoint: 'orders'
});

// All order routes require authentication
router.use(authenticateToken);
router.use(orderRateLimit);

// User order routes
router.get('/', 
    validatePagination,
    validateDateRange,
    asyncHandler(orderController.getUserOrders)
);

router.post('/', 
    validateOrder,
    asyncHandler(orderController.createOrder)
);

router.get('/:id', 
    requireOwnership('id', 'orders'),
    asyncHandler(orderController.getOrderById)
);

router.patch('/:id/cancel', 
    requireOwnership('id', 'orders'),
    asyncHandler(orderController.cancelOrder)
);

// Order tracking
router.get('/:id/tracking', 
    requireOwnership('id', 'orders'),
    asyncHandler(orderController.getOrderTracking)
);

// Order receipt/invoice
router.get('/:id/receipt', 
    requireOwnership('id', 'orders'),
    asyncHandler(orderController.getOrderReceipt)
);

// Reorder functionality
router.post('/:id/reorder', 
    requireOwnership('id', 'orders'),
    asyncHandler(orderController.reorderFromPrevious)
);

// Admin order management routes
const adminOrderRoutes = express.Router();
adminOrderRoutes.use(isAdmin);

adminOrderRoutes.get('/admin/all', 
    validatePagination,
    validateDateRange,
    asyncHandler(orderController.getAllOrdersAdmin)
);

adminOrderRoutes.patch('/admin/:id/status', 
    asyncHandler(orderController.updateOrderStatus)
);

adminOrderRoutes.patch('/admin/:id/approve', 
    asyncHandler(orderController.approveOrder)
);

adminOrderRoutes.patch('/admin/:id/reject', 
    asyncHandler(orderController.rejectOrder)
);

adminOrderRoutes.get('/admin/analytics', 
    validateDateRange,
    asyncHandler(orderController.getOrderAnalytics)
);

adminOrderRoutes.get('/admin/pending', 
    validatePagination,
    asyncHandler(orderController.getPendingOrders)
);

// Mount admin routes
router.use(adminOrderRoutes);

export default router;
