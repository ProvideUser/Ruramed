import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { 
    validateMedicine, 
    validatePagination, 
    validateSearchQuery 
} from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as medicineController from '../controllers/medicineController.js';

const router = express.Router();

// Rate limiting for medicine operations
const medicineRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    maxPerDevice: 60,
    endpoint: 'medicines'
});

router.use(medicineRateLimit);

// Public medicine routes (no auth required)
router.get('/', 
    validatePagination,
    asyncHandler(medicineController.getAllMedicines)
);

router.get('/search', 
    validateSearchQuery,
    validatePagination,
    asyncHandler(medicineController.searchMedicines)
);

router.get('/categories', 
    asyncHandler(medicineController.getMedicineCategories)
);

router.get('/forms', 
    asyncHandler(medicineController.getMedicineForms)
);

router.get('/popular', 
    validatePagination,
    asyncHandler(medicineController.getPopularMedicines)
);

router.get('/:id', 
    asyncHandler(medicineController.getMedicineById)
);

// Admin-only medicine management routes
router.use(authenticateToken);
router.use(isAdmin);

router.post('/', 
    validateMedicine,
    asyncHandler(medicineController.createMedicine)
);

router.put('/:id', 
    validateMedicine,
    asyncHandler(medicineController.updateMedicine)
);

router.delete('/:id', 
    asyncHandler(medicineController.deleteMedicine)
);

router.patch('/:id/status', 
    asyncHandler(medicineController.updateMedicineStatus)
);

// Bulk operations for admin
router.post('/bulk/import', 
    asyncHandler(medicineController.bulkImportMedicines)
);

router.patch('/bulk/update-prices', 
    asyncHandler(medicineController.bulkUpdatePrices)
);

// Medicine analytics for admin
router.get('/analytics/inventory', 
    asyncHandler(medicineController.getInventoryAnalytics)
);

router.get('/analytics/popular', 
    validatePagination,
    asyncHandler(medicineController.getPopularityAnalytics)
);

export default router;
