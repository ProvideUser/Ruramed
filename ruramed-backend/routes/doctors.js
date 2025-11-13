import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { 
    validateDoctorRegistration, 
    validatePagination, 
    validateSearchQuery,
    validateCoordinatesMiddleware 
} from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as doctorController from '../controllers/doctorController.js';

const router = express.Router();

// Rate limiting for doctor operations
const doctorRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    maxPerDevice: 30,
    endpoint: 'doctors'
});

router.use(doctorRateLimit);

// Public doctor routes (no auth required)
router.get('/', 
    validatePagination,
    asyncHandler(doctorController.getAllDoctors)
);

router.get('/search', 
    // validateSearchQuery, // Commented out - validation done in controller
    validatePagination,
    asyncHandler(doctorController.searchDoctors)
);

router.get('/specialties', 
    asyncHandler(doctorController.getDoctorSpecialties)
);

router.get('/nearby', 
    validateCoordinatesMiddleware,
    validatePagination,
    asyncHandler(doctorController.getNearbyDoctors)
);

router.get('/:id', 
    asyncHandler(doctorController.getDoctorById)
);

router.get('/:id/availability', 
    asyncHandler(doctorController.getDoctorAvailability)
);

// User routes (require authentication)
router.use(authenticateToken);

router.post('/:id/consultation', 
    asyncHandler(doctorController.bookConsultation)
);

router.get('/:id/reviews', 
    validatePagination,
    asyncHandler(doctorController.getDoctorReviews)
);

router.post('/:id/review', 
    asyncHandler(doctorController.addDoctorReview)
);

// Admin-only doctor management routes
const adminDoctorRoutes = express.Router();
adminDoctorRoutes.use(isAdmin);

adminDoctorRoutes.post('/', 
    validateDoctorRegistration,
    asyncHandler(doctorController.createDoctor)
);

adminDoctorRoutes.put('/:id', 
    validateDoctorRegistration,
    asyncHandler(doctorController.updateDoctor)
);

adminDoctorRoutes.delete('/:id', 
    asyncHandler(doctorController.deleteDoctor)
);

adminDoctorRoutes.patch('/:id/status', 
    asyncHandler(doctorController.updateDoctorStatus)
);

adminDoctorRoutes.get('/admin/pending', 
    validatePagination,
    asyncHandler(doctorController.getPendingDoctors)
);

adminDoctorRoutes.get('/admin/analytics', 
    asyncHandler(doctorController.getDoctorAnalytics)
);

// Mount admin routes
router.use(adminDoctorRoutes);

export default router;
