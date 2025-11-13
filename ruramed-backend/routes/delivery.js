import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { 
    validateCoordinatesMiddleware,
    validatePagination 
} from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as deliveryController from '../controllers/deliveryController.js';

const router = express.Router();

// Rate limiting for delivery operations (temporarily disabled for debugging)
// const deliveryRateLimit = advancedRateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     maxRequests: 100,
//     maxPerDevice: 60,
//     endpoint: 'delivery'
// });

// router.use(deliveryRateLimit);

// Public delivery routes (no auth required)
router.get('/check-service-area', 
    validateCoordinatesMiddleware,
    asyncHandler(deliveryController.checkServiceArea)
);

router.get('/service-areas', 
    asyncHandler(deliveryController.getServiceAreas)
);

router.get('/delivery-fee', 
    validateCoordinatesMiddleware,
    asyncHandler(deliveryController.calculateDeliveryFee)
);

router.get('/estimate-time', 
    validateCoordinatesMiddleware,
    asyncHandler(deliveryController.estimateDeliveryTime)
);

// User routes (require authentication)
router.use(authenticateToken);

router.get('/tracking/:orderId', 
    asyncHandler(deliveryController.trackDelivery)
);

router.post('/schedule', 
    asyncHandler(deliveryController.scheduleDelivery)
);

router.patch('/update-address/:orderId', 
    asyncHandler(deliveryController.updateDeliveryAddress)
);

// Admin-only delivery management routes
const adminDeliveryRoutes = express.Router();
adminDeliveryRoutes.use(isAdmin);

adminDeliveryRoutes.get('/admin/all', 
    validatePagination,
    asyncHandler(deliveryController.getAllDeliveries)
);

adminDeliveryRoutes.post('/admin/service-areas', 
    asyncHandler(deliveryController.createServiceArea)
);

adminDeliveryRoutes.put('/admin/service-areas/:id', 
    asyncHandler(deliveryController.updateServiceArea)
);

adminDeliveryRoutes.delete('/admin/service-areas/:id', 
    asyncHandler(deliveryController.deleteServiceArea)
);

adminDeliveryRoutes.patch('/admin/delivery/:id/status', 
    asyncHandler(deliveryController.updateDeliveryStatus)
);

adminDeliveryRoutes.get('/admin/analytics', 
    asyncHandler(deliveryController.getDeliveryAnalytics)
);

adminDeliveryRoutes.get('/admin/pending', 
    validatePagination,
    asyncHandler(deliveryController.getPendingDeliveries)
);

// Mount admin routes
router.use(adminDeliveryRoutes);

export default router;
