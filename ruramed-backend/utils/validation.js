import validator from 'validator';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { logError, logSecurityEvent } from './logger.js';

// Simple built-in HTML sanitization function
const sanitizeHtml = (data) => {
    if (!data || typeof data !== 'string') {
        return '';
    }
    
    return data
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"&]/g, match => { // Escape dangerous characters
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                case '&': return '&amp;';
                default: return match;
            }
        });
};

// Email validation with healthcare domain preferences
export const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return { isValid: false, error: 'Email is required' };
    }

    // Basic email format validation
    if (!validator.isEmail(email)) {
        return { isValid: false, error: 'Invalid email format' };
    }

    // Length validation
    if (email.length > 254) {
        return { isValid: false, error: 'Email too long (max 254 characters)' };
    }

    // Healthcare domain validation (optional enhancement)
    const normalizedEmail = email.toLowerCase().trim();
    
    return { 
        isValid: true, 
        sanitized: normalizedEmail,
        error: null 
    };
};

// Phone number validation with Indian format support
export const validatePhone = (phone) => {
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Indian mobile number patterns
    const patterns = [
        /^[6-9]\d{9}$/, // 10-digit Indian mobile (starts with 6,7,8,9)
        /^91[6-9]\d{9}$/, // With country code 91
        /^(\+91)?[6-9]\d{9}$/ // With optional +91
    ];

    const isValid = patterns.some(pattern => pattern.test(cleanPhone));
    
    if (!isValid) {
        return { 
            isValid: false, 
            error: 'Invalid phone number format. Use Indian mobile format (10 digits starting with 6-9)' 
        };
    }

    // Normalize to 10-digit format
    const normalized = cleanPhone.length === 12 && cleanPhone.startsWith('91') 
        ? cleanPhone.substring(2) 
        : cleanPhone.replace(/^\+?91/, '');

    return { 
        isValid: true, 
        sanitized: normalized,
        error: null 
    };
};

// Medical data sanitization (updated with built-in approach)
export const sanitizeMedicalData = (data) => {
    if (!data || typeof data !== 'string') {
        return { sanitized: '', error: 'Invalid data format' };
    }

    // Remove HTML tags and escape dangerous characters
    let sanitized = sanitizeHtml(data);

    // Remove potential SQL injection patterns
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|\/\*|\*\/|;|'|"|`)/g,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
    ];

    sqlPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Length validation for medical fields
    if (sanitized.length > 5000) {
        return { 
            sanitized: sanitized.substring(0, 5000), 
            error: 'Medical data truncated to 5000 characters' 
        };
    }

    return { sanitized, error: null };
};

// Name validation for medical records
export const validateName = (name) => {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Name is required' };
    }

    const trimmedName = name.trim();
    
    // Length validation
    if (trimmedName.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }
    
    if (trimmedName.length > 100) {
        return { isValid: false, error: 'Name too long (max 100 characters)' };
    }

    // Pattern validation (letters, spaces, hyphens, apostrophes)
    const namePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (!namePattern.test(trimmedName)) {
        return { 
            isValid: false, 
            error: 'Name can only contain letters, spaces, hyphens, and apostrophes' 
        };
    }

    // Sanitize and normalize
    const sanitized = trimmedName
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-'\.]+|[\s\-'\.]+$/g, '');

    return { 
        isValid: true, 
        sanitized: sanitized,
        error: null 
    };
};

// Password strength validation
export const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { isValid: false, error: 'Password is required' };
    }

    const errors = [];
    
    if (password.length < 8) {
        errors.push('at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('one special character');
    }

    if (errors.length > 0) {
        return { 
            isValid: false, 
            error: `Password must contain ${errors.join(', ')}` 
        };
    }

    return { isValid: true, error: null };
};

// Prescription file validation
export const validatePrescriptionFile = (file) => {
    if (!file) {
        return { isValid: false, error: 'Prescription file is required' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    // MIME type validation
    if (!allowedTypes.includes(file.mimetype)) {
        return { 
            isValid: false, 
            error: 'Invalid file type. Only JPG, PNG, and PDF files are allowed' 
        };
    }

    // Extension validation
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        return { 
            isValid: false, 
            error: 'Invalid file extension. Only .jpg, .png, and .pdf files are allowed' 
        };
    }

    // Size validation
    if (file.size > maxSize) {
        return { 
            isValid: false, 
            error: 'File too large. Maximum size is 5MB' 
        };
    }

    // File magic number validation (basic)
    const magicNumbers = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/jpg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'application/pdf': [0x25, 0x50, 0x44, 0x46]
    };

    if (file.buffer && magicNumbers[file.mimetype]) {
        const expectedMagic = magicNumbers[file.mimetype];
        const fileMagic = Array.from(file.buffer.slice(0, expectedMagic.length));
        
        const isValidMagic = expectedMagic.every((byte, index) => byte === fileMagic[index]);
        if (!isValidMagic) {
            return { 
                isValid: false, 
                error: 'File content does not match file type' 
            };
        }
    }

    return { isValid: true, error: null };
};

// Medicine data validation
export const validateMedicineData = (medicineData) => {
    const errors = [];
    const sanitized = {};

    // Required fields validation
    const requiredFields = ['name', 'manufacturer', 'category', 'form', 'strength', 'price', 'mrp'];
    
    requiredFields.forEach(field => {
        if (!medicineData[field]) {
            errors.push(`${field} is required`);
        }
    });

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    // Name validation
    const nameValidation = validateName(medicineData.name);
    if (!nameValidation.isValid) {
        errors.push(`Medicine name: ${nameValidation.error}`);
    } else {
        sanitized.name = nameValidation.sanitized;
    }

    // Price validation
    const price = parseFloat(medicineData.price);
    const mrp = parseFloat(medicineData.mrp);
    
    if (isNaN(price) || price <= 0) {
        errors.push('Price must be a positive number');
    } else {
        sanitized.price = price;
    }
    
    if (isNaN(mrp) || mrp <= 0) {
        errors.push('MRP must be a positive number');
    } else {
        sanitized.mrp = mrp;
    }
    
    if (!isNaN(price) && !isNaN(mrp) && price > mrp) {
        errors.push('Price cannot be greater than MRP');
    }

    // Form validation
    const validForms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler'];
    if (!validForms.includes(medicineData.form)) {
        errors.push('Invalid medicine form');
    } else {
        sanitized.form = medicineData.form;
    }

    // Sanitize text fields
    ['manufacturer', 'category', 'strength', 'generic_name', 'short_description'].forEach(field => {
        if (medicineData[field]) {
            const sanitizedField = sanitizeMedicalData(medicineData[field]);
            sanitized[field] = sanitizedField.sanitized;
        }
    });

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    return { isValid: true, sanitized, errors: null };
};

// Coordinate validation
export const validateCoordinates = (lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
        return { isValid: false, error: 'Invalid coordinate format' };
    }
    
    if (latitude < -90 || latitude > 90) {
        return { isValid: false, error: 'Latitude must be between -90 and 90' };
    }
    
    if (longitude < -180 || longitude > 180) {
        return { isValid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { 
        isValid: true, 
        sanitized: { lat: latitude, lng: longitude },
        error: null 
    };
};

// Generic field sanitizer (updated)
export const sanitizeField = (value, maxLength = 255) => {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    const sanitized = sanitizeHtml(value);
    return sanitized.substring(0, maxLength);
};

// Validation result formatter
export const formatValidationResult = (results) => {
    const errors = [];
    const sanitizedData = {};
    
    Object.keys(results).forEach(field => {
        const result = results[field];
        if (result.isValid) {
            if (result.sanitized !== undefined) {
                sanitizedData[field] = result.sanitized;
            }
        } else {
            errors.push(`${field}: ${result.error}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitizedData
    };
};

// Hash password with salt
export const hashPassword = async (password) => {
    try {
        const saltRounds = 12; // Higher for better security
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return { success: true, hash: hashedPassword };
    } catch (error) {
        logError(error, { operation: 'password_hashing' });
        return { success: false, error: 'Password hashing failed' };
    }
};

// Verify password against hash
export const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        return { success: true, isValid };
    } catch (error) {
        logError(error, { operation: 'password_verification' });
        return { success: false, isValid: false, error: 'Password verification failed' };
    }
};

// Enhanced password validation with security checks
export const validatePasswordSecurity = async (password, userId = null) => {
    const validation = validatePassword(password);
    if (!validation.isValid) {
        return validation;
    }

    // Check against common passwords (you can expand this list)
    const commonPasswords = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
        logSecurityEvent('weak_password_attempt', {
            reason: 'common_password'
        }, userId);
        
        return { 
            isValid: false, 
            error: 'Password is too common. Please choose a more secure password.' 
        };
    }

    return { isValid: true };
};
