import { 
    validateEmail, 
    validatePhone, 
    validateName, 
    validatePassword,
    validateMedicineData,
    validateCoordinates,
    validatePrescriptionFile,
    sanitizeMedicalData,
    sanitizeField,
    formatValidationResult
} from '../utils/validation.js';
import { logSecurityEvent, logError } from '../utils/logger.js';

// Generic validation middleware factory
export const createValidationMiddleware = (validationRules) => {
    return (req, res, next) => {
        const results = {};
        const errors = [];

        // Apply validation rules
        Object.keys(validationRules).forEach(field => {
            const rule = validationRules[field];
            const value = req.body[field];

            if (rule.required && (value === undefined || value === null || value.toString().trim() === '')) {
                errors.push(`${field} is required`);
                return;
            }

            if (value !== undefined && value !== null && rule.validator) {
                const result = rule.validator(value);
                results[field] = result;
                
                if (!result.isValid) {
                    errors.push(`${field}: ${result.error}`);
                }
            }
        });

        if (errors.length > 0) {
            logSecurityEvent('validation_failed', { 
                errors, 
                endpoint: req.originalUrl,
                method: req.method 
            }, req.user?.id, req.ip);

            return res.status(400).json({
                error: 'Validation failed',
                details: errors,
                timestamp: new Date().toISOString()
            });
        }

        // Add sanitized data to request (only for fields present in request body)
        req.validatedData = {};
        Object.keys(req.body).forEach(field => {
            if (validationRules[field]) {
                const result = results[field];
                if (result) {
                    req.validatedData[field] = result.sanitized !== undefined ? result.sanitized : req.body[field];
                } else {
                    // Field has validation rule but wasn't validated (e.g., optional field that passed)
                    req.validatedData[field] = req.body[field];
                }
            } else {
                // Field doesn't have validation rule but is in request body
                req.validatedData[field] = req.body[field];
            }
        });

        next();
    };
};

// User registration validation
export const validateUserRegistration = createValidationMiddleware({
    name: {
        required: true,
        validator: validateName
    },
    email: {
        required: true,
        validator: validateEmail
    },
    phone: {
        required: true,
        validator: validatePhone
    },
    password: {
        required: true,
        validator: validatePassword
    },
    location: {
        required: false,
        validator: (value) => {
            const sanitized = sanitizeField(value, 255);
            return { isValid: true, sanitized };
        }
    }
});

// User profile update validation (optional fields)
export const validateUserProfileUpdate = createValidationMiddleware({
    name: {
        required: false,
        validator: validateName
    },
    phone: {
        required: false,
        validator: validatePhone
    },
    location: {
        required: false,
        validator: (value) => {
            const sanitized = sanitizeField(value, 255);
            return { isValid: true, sanitized };
        }
    }
});

// User login validation
export const validateUserLogin = createValidationMiddleware({
    email: {
        required: true,
        validator: validateEmail
    },
    password: {
        required: true,
        validator: (password) => {
            if (!password || password.length === 0) {
                return { isValid: false, error: 'Password is required' };
            }
            return { isValid: true };
        }
    }
});

// Doctor registration validation
export const validateDoctorRegistration = createValidationMiddleware({
    name: {
        required: true,
        validator: validateName
    },
    email: {
        required: true,
        validator: validateEmail
    },
    specialty: {
        required: true,
        validator: (value) => {
            const sanitized = sanitizeField(value, 100);
            if (sanitized.length < 2) {
                return { isValid: false, error: 'Specialty must be at least 2 characters' };
            }
            return { isValid: true, sanitized };
        }
    },
    location: {
        required: true,
        validator: (value) => {
            const sanitized = sanitizeField(value, 255);
            if (sanitized.length < 2) {
                return { isValid: false, error: 'Location must be at least 2 characters' };
            }
            return { isValid: true, sanitized };
        }
    },
    experience: {
        required: false,
        validator: (value) => {
            const experience = parseInt(value);
            if (isNaN(experience) || experience < 0 || experience > 70) {
                return { isValid: false, error: 'Experience must be between 0 and 70 years' };
            }
            return { isValid: true, sanitized: experience };
        }
    },
    consultation_fee: {
        required: false,
        validator: (value) => {
            const fee = parseFloat(value);
            if (isNaN(fee) || fee < 0 || fee > 50000) {
                return { isValid: false, error: 'Consultation fee must be between 0 and 50000' };
            }
            return { isValid: true, sanitized: fee };
        }
    },
    phone: {
        required: false,
        validator: validatePhone
    }
});

// Medicine validation middleware
export const validateMedicine = (req, res, next) => {
    try {
        const result = validateMedicineData(req.body);
        
        if (!result.isValid) {
            logSecurityEvent('medicine_validation_failed', { 
                errors: result.errors,
                medicine_data: req.body.name || 'unknown'
            }, req.user?.id, req.ip);

            return res.status(400).json({
                error: 'Medicine validation failed',
                details: result.errors,
                timestamp: new Date().toISOString()
            });
        }

        req.validatedData = result.sanitized;
        next();
    } catch (error) {
        logError(error, { middleware: 'validateMedicine' });
        return res.status(500).json({
            error: 'Validation error',
            message: 'Internal server error during validation'
        });
    }
};

// Address validation
export const validateAddress = createValidationMiddleware({
    address_line1: {
        required: true,
        validator: (value) => {
            const sanitized = sanitizeField(value, 255);
            if (sanitized.length < 5) {
                return { isValid: false, error: 'Address line 1 must be at least 5 characters' };
            }
            return { isValid: true, sanitized };
        }
    },
    city: {
        required: true,
        validator: (value) => {
            const sanitized = sanitizeField(value, 100);
            if (sanitized.length < 2) {
                return { isValid: false, error: 'City must be at least 2 characters' };
            }
            return { isValid: true, sanitized };
        }
    },
    state: {
        required: true,
        validator: (value) => {
            const sanitized = sanitizeField(value, 100);
            if (sanitized.length < 2) {
                return { isValid: false, error: 'State must be at least 2 characters' };
            }
            return { isValid: true, sanitized };
        }
    },
    postal_code: {
        required: true,
        validator: (value) => {
            const postalCode = value.toString().trim();
            // Indian postal code validation (6 digits)
            if (!/^\d{6}$/.test(postalCode)) {
                return { isValid: false, error: 'Postal code must be 6 digits' };
            }
            return { isValid: true, sanitized: postalCode };
        }
    },
    latitude: {
        required: false,
        validator: (value) => {
            if (!value) return { isValid: true };
            const result = validateCoordinates(value, 0);
            return result.isValid ? 
                { isValid: true, sanitized: result.sanitized.lat } : 
                { isValid: false, error: result.error };
        }
    },
    longitude: {
        required: false,
        validator: (value) => {
            if (!value) return { isValid: true };
            const result = validateCoordinates(0, value);
            return result.isValid ? 
                { isValid: true, sanitized: result.sanitized.lng } : 
                { isValid: false, error: result.error };
        }
    }
});

// Prescription file validation middleware
export const validatePrescriptionUpload = (req, res, next) => {
    try {
        if (!req.files || !req.files.prescription) {
            return res.status(400).json({
                error: 'Prescription file required',
                message: 'Please upload a prescription file'
            });
        }

        const files = Array.isArray(req.files.prescription) ? 
            req.files.prescription : [req.files.prescription];

        const errors = [];
        const validFiles = [];

        files.forEach((file, index) => {
            const result = validatePrescriptionFile(file);
            if (!result.isValid) {
                errors.push(`File ${index + 1}: ${result.error}`);
            } else {
                validFiles.push(file);
            }
        });

        if (errors.length > 0) {
            logSecurityEvent('prescription_upload_validation_failed', { 
                errors,
                file_count: files.length
            }, req.user?.id, req.ip);

            return res.status(400).json({
                error: 'Prescription file validation failed',
                details: errors,
                timestamp: new Date().toISOString()
            });
        }

        req.validatedFiles = validFiles;
        next();
    } catch (error) {
        logError(error, { middleware: 'validatePrescriptionUpload' });
        return res.status(500).json({
            error: 'File validation error',
            message: 'Internal server error during file validation'
        });
    }
};

// Order validation
export const validateOrder = createValidationMiddleware({
    medicines: {
        required: true,
        validator: (value) => {
            try {
                const medicines = typeof value === 'string' ? JSON.parse(value) : value;
                
                if (!Array.isArray(medicines) || medicines.length === 0) {
                    return { isValid: false, error: 'At least one medicine is required' };
                }

                // Validate each medicine in the order
                const errors = [];
                medicines.forEach((medicine, index) => {
                    if (!medicine.id || !medicine.quantity) {
                        errors.push(`Medicine ${index + 1}: ID and quantity required`);
                    }
                    
                    const quantity = parseInt(medicine.quantity);
                    if (isNaN(quantity) || quantity <= 0 || quantity > 100) {
                        errors.push(`Medicine ${index + 1}: Quantity must be between 1 and 100`);
                    }
                });

                if (errors.length > 0) {
                    return { isValid: false, error: errors.join(', ') };
                }

                return { isValid: true, sanitized: medicines };
            } catch (error) {
                return { isValid: false, error: 'Invalid medicines format' };
            }
        }
    },
    address_id: {
        required: true,
        validator: (value) => {
            const addressId = parseInt(value);
            if (isNaN(addressId) || addressId <= 0) {
                return { isValid: false, error: 'Valid address ID required' };
            }
            return { isValid: true, sanitized: addressId };
        }
    }
});

// Coordinate validation middleware
export const validateCoordinatesMiddleware = (req, res, next) => {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({
            error: 'Missing coordinates',
            message: 'Both latitude and longitude are required'
        });
    }

    const result = validateCoordinates(lat, lng);
    if (!result.isValid) {
        return res.status(400).json({
            error: 'Invalid coordinates',
            message: result.error
        });
    }

    req.coordinates = result.sanitized;
    next();
};

// Search query validation
export const validateSearchQuery = (req, res, next) => {
    const { q, category, location } = req.query;
    
    // Allow either q or location (or category) to be present
    if ((!q || q.trim().length < 2) && !location && !category) {
        return res.status(400).json({
            error: 'Invalid search query',
            message: 'Provide a search term (min 2 chars) or a location/category'
        });
    }

    // Sanitize search parameters
    req.sanitizedQuery = {
        q: q ? sanitizeField(q, 100) : null,
        category: category ? sanitizeField(category, 50) : null,
        location: location ? sanitizeField(location, 100) : null
    };

    next();
};

// Admin validation middleware
export const validateAdminData = createValidationMiddleware({
    name: {
        required: true,
        validator: validateName
    },
    email: {
        required: true,
        validator: validateEmail
    },
    password: {
        required: true,
        validator: validatePassword
    }
});

// Pagination validation middleware
export const validatePagination = (req, res, next) => {
    // ✅ FIX: Use Number() constructor for mysql2 compatibility
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    if (page < 1 || !Number.isInteger(page)) {
        return res.status(400).json({
            error: 'Invalid page number',
            message: 'Page number must be a positive integer'
        });
    }
    
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
        return res.status(400).json({
            error: 'Invalid limit',
            message: 'Limit must be an integer between 1 and 100'
        });
    }
    
    // ✅ CRITICAL: Store as actual Number primitives, not just integers
    req.pagination = {
        page: Number(page),
        limit: Number(limit),
        offset: Number((page - 1) * limit)
    };
    
    next();
};

// Date range validation middleware
export const validateDateRange = (req, res, next) => {
    const { start_date, end_date } = req.query;
    
    if (start_date || end_date) {
        const startDate = start_date ? new Date(start_date) : null;
        const endDate = end_date ? new Date(end_date) : null;
        
        if (start_date && isNaN(startDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid start date',
                message: 'Start date must be in valid format'
            });
        }
        
        if (end_date && isNaN(endDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid end date',
                message: 'End date must be in valid format'
            });
        }
        
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                error: 'Invalid date range',
                message: 'Start date must be before end date'
            });
        }
        
        req.dateRange = { startDate, endDate };
    }
    
    next();
};

export default {
    createValidationMiddleware,
    validateUserRegistration,
    validateUserProfileUpdate,
    validateUserLogin,
    validateDoctorRegistration,
    validateMedicine,
    validateAddress,
    validatePrescriptionUpload,
    validateOrder,
    validateCoordinatesMiddleware,
    validateSearchQuery,
    validateAdminData,
    validatePagination,
    validateDateRange
};
