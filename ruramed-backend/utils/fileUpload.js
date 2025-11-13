import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Storage configuration for different file types
const createStorage = (subfolder = '') => {
    const destinationPath = subfolder ? path.join(uploadsDir, subfolder) : uploadsDir;

    if (subfolder && !fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
        console.log(`📁 Created uploads/${subfolder} directory`);
    }

    return multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, destinationPath);
        },
        filename: function (req, file, cb) {
            let finalName;
            let filePath;

            do {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const extension = path.extname(file.originalname);
                const baseName = path.basename(file.originalname, extension);
                const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
                finalName = `${cleanBaseName}_${uniqueSuffix}${extension}`;
                filePath = path.join(destinationPath, finalName);
            } while (fs.existsSync(filePath)); // Ensure uniqueness

            cb(null, finalName);
        }
    });
};

// File filter functions
const fileFilters = {
    prescriptions: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

        if (mimetype && extname) {
            console.log('✅ Prescription file accepted:', file.originalname);
            return cb(null, true);
        } else {
            console.log('❌ Prescription file rejected:', file.originalname);
            cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed for prescriptions!'));
        }
    },

    images: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            console.log('✅ Image file accepted:', file.originalname);
            return cb(null, true);
        } else {
            console.log('❌ Image file rejected:', file.originalname);
            cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
        }
    },

    documents: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /pdf|msword|officedocument/.test(file.mimetype);

        if (mimetype && extname) {
            console.log('✅ Document file accepted:', file.originalname);
            return cb(null, true);
        } else {
            console.log('❌ Document file rejected:', file.originalname);
            cb(new Error('Only document files (PDF, DOC, DOCX) are allowed!'));
        }
    }
};

// Pre-configured upload handlers
export const uploadHandlers = {
    prescriptions: multer({
        storage: createStorage('prescriptions'),
        limits: {
            fileSize: 5 * 1024 * 1024,
            files: 5
        },
        fileFilter: fileFilters.prescriptions
    }),

    medicineImages: multer({
        storage: createStorage('medicines'),
        limits: {
            fileSize: 2 * 1024 * 1024,
            files: 3
        },
        fileFilter: fileFilters.images
    }),

    profilePictures: multer({
        storage: createStorage('profiles'),
        limits: {
            fileSize: 1 * 1024 * 1024,
            files: 1
        },
        fileFilter: fileFilters.images
    }),

    documents: multer({
        storage: createStorage('documents'),
        limits: {
            fileSize: 10 * 1024 * 1024,
            files: 10
        },
        fileFilter: fileFilters.documents
    })
};

// File validation utilities
export const fileUtils = {
    fileExists: (filePath) => {
        try {
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    },

    deleteFile: (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('🗑️ File deleted:', filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ File deletion error:', error.message);
            return false;
        }
    },

    getFileInfo: (filePath) => {
        try {
            if (!fs.existsSync(filePath)) return null;

            const stats = fs.statSync(filePath);
            return {
                size: stats.size,
                sizeFormatted: formatFileSize(stats.size),
                created: stats.birthtime,
                modified: stats.mtime,
                extension: path.extname(filePath),
                name: path.basename(filePath)
            };
        } catch (error) {
            console.error('❌ File info error:', error.message);
            return null;
        }
    },

    getFileUrl: (filename, subfolder = '') => {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const folderPath = subfolder ? `${subfolder}/` : '';
        return `${baseUrl}/uploads/${folderPath}${filename}`;
    }
};

// Error handler for multer
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('❌ Multer error:', error.message);

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ error: 'File too large', details: 'Please choose a smaller file' });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ error: 'Too many files', details: 'Maximum number of files exceeded' });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ error: 'Unexpected file field', details: 'Invalid file field name' });
            default:
                return res.status(400).json({ error: 'File upload error', details: error.message });
        }
    } else if (error) {
        console.error('❌ Upload error:', error.message);
        return res.status(400).json({ error: 'File upload failed', details: error.message });
    }

    next();
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default uploadHandlers.prescriptions;
