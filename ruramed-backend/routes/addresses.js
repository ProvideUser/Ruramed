import express from 'express';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';
import { validateAddress } from '../middleware/validation.js';
import { advancedRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as addressController from '../controllers/addressController.js';

const router = express.Router();

// Rate limiting for address operations
const addressRateLimit = advancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 30,
    maxPerDevice: 20,
    endpoint: 'addresses'
});

// All address routes require authentication
router.use(authenticateToken);
router.use(addressRateLimit);

// Address CRUD operations
router.get('/', 
    asyncHandler(addressController.getUserAddresses)
);

router.post('/', 
    validateAddress,
    asyncHandler(addressController.createAddress)
);

router.get('/:id', 
    requireOwnership('id', 'addresses'),
    asyncHandler(addressController.getAddressById)
);

router.put('/:id', 
    requireOwnership('id', 'addresses'),
    validateAddress,
    asyncHandler(addressController.updateAddress)
);

router.delete('/:id', 
    requireOwnership('id', 'addresses'),
    asyncHandler(addressController.deleteAddress)
);

// Address-specific operations
router.patch('/:id/set-default', 
    requireOwnership('id', 'addresses'),
    asyncHandler(addressController.setDefaultAddress)
);

router.get('/default/current', 
    asyncHandler(addressController.getDefaultAddress)
);

// Address validation and geocoding
router.post('/validate', 
    validateAddress,
    asyncHandler(addressController.validateAddress)
);

router.post('/geocode', 
    asyncHandler(addressController.geocodeAddress)
);

// Check service area coverage
router.get('/:id/service-check', 
    requireOwnership('id', 'addresses'),
    asyncHandler(addressController.checkServiceArea)
);

export default router;
