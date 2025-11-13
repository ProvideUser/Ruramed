import express from 'express';
import { validateCoordinatesMiddleware } from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as geocodingController from '../controllers/geocodingController.js';

const router = express.Router();

// Rate limiting for geocoding operations
const geocodingRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
    maxPerDevice: 100,
    endpoint: 'geocoding'
});

router.use(geocodingRateLimit);

// Forward geocoding - address to coordinates
router.get('/forward', 
    asyncHandler(geocodingController.geocodeAddress)
);

// Legacy route (root path)
router.get('/', 
    asyncHandler(geocodingController.geocodeAddress)
);

// Reverse geocoding - coordinates to address
router.get('/reverse', 
    validateCoordinatesMiddleware,
    asyncHandler(geocodingController.reverseGeocode)
);

// Distance calculation between two points
router.get('/distance', 
    asyncHandler(geocodingController.calculateDistance)
);

// Find places nearby (hospitals, pharmacies, etc.)
router.get('/nearby', 
    validateCoordinatesMiddleware,
    asyncHandler(geocodingController.findNearbyPlaces)
);

// Get address suggestions/autocomplete
router.get('/autocomplete', 
    asyncHandler(geocodingController.getAddressSuggestions)
);

// Validate address format
router.post('/validate', 
    asyncHandler(geocodingController.validateAddressFormat)
);

// Get postal code information
router.get('/postal/:code', 
    asyncHandler(geocodingController.getPostalCodeInfo)
);

// Get city/state information
router.get('/city/:name', 
    asyncHandler(geocodingController.getCityInfo)
);

export default router;
