import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { logger, logError, logFileOperation } from './logger.js';

// ---------------------------------------------------------
// 📁 Path and Environment Setup
// ---------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const bucketName = process.env.GCS_BUCKET_NAME;

// ---------------------------------------------------------
// ☁️ Initialize Google Cloud Storage
// ---------------------------------------------------------
let storage;
let bucket;

if (isProduction && bucketName) {
  try {
    storage = new Storage(); // Uses Application Default Credentials in GCP
    bucket = storage.bucket(bucketName);
    logger.info('Google Cloud Storage initialized', {
      bucket: bucketName,
      category: 'storage',
    });
  } catch (error) {
    logError(error, { context: 'gcs_initialization' });
  }
}

// ---------------------------------------------------------
// 💾 Local Upload Directory (Development Only)
// ---------------------------------------------------------
const uploadsDir = path.join(__dirname, '../uploads');
if (!isProduction && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory', { path: uploadsDir });
}

// ---------------------------------------------------------
// 🗂️ Local Storage Creator
// ---------------------------------------------------------
const createLocalStorage = (subfolder = '') => {
  const destinationPath = subfolder ? path.join(uploadsDir, subfolder) : uploadsDir;

  if (subfolder && !fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
    logger.info('Created uploads subdirectory', { path: subfolder });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destinationPath),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `${cleanBaseName}_${uniqueSuffix}${extension}`);
    },
  });
};

// ---------------------------------------------------------
// 🔍 File Filter Functions
// ---------------------------------------------------------
const fileFilters = {
  prescriptions: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      logger.debug('Prescription file accepted', { filename: file.originalname });
      cb(null, true);
    } else {
      logger.warn('Prescription file rejected', {
        filename: file.originalname,
        mimetype: file.mimetype,
      });
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed for prescriptions!'));
    }
  },

  images: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      logger.debug('Image file accepted', { filename: file.originalname });
      cb(null, true);
    } else {
      logger.warn('Image file rejected', { filename: file.originalname, mimetype: file.mimetype });
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
    }
  },

  documents: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /pdf|msword|officedocument/.test(file.mimetype);

    if (mimetype && extname) {
      logger.debug('Document file accepted', { filename: file.originalname });
      cb(null, true);
    } else {
      logger.warn('Document file rejected', { filename: file.originalname, mimetype: file.mimetype });
      cb(new Error('Only document files (PDF, DOC, DOCX) are allowed!'));
    }
  },
};

// ---------------------------------------------------------
// ☁️ Upload File to Google Cloud Storage
// ---------------------------------------------------------
const uploadToGCS = async (file, subfolder = '', userId = null) => {
  try {
    const extension = path.extname(file.originalname);
    const filename = `${subfolder}/${uuidv4()}${extension}`;
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadDate: new Date().toISOString(),
          userId: userId || 'anonymous',
        },
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        logError(error, { context: 'gcs_upload_stream_error', filename, userId });
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

          logFileOperation('upload', filename, userId, {
            size: file.size,
            mimetype: file.mimetype,
            subfolder,
          });

          resolve({
            filename,
            url: publicUrl,
            size: file.size,
            mimetype: file.mimetype,
          });
        } catch (error) {
          logError(error, { context: 'gcs_make_public_error', filename, userId });
          reject(error);
        }
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    logError(error, { context: 'gcs_upload_error', userId });
    throw error;
  }
};

// ---------------------------------------------------------
// ⚙️ Multer Config Generator
// ---------------------------------------------------------
const createMulterConfig = (
  subfolder = '',
  maxSize = 5 * 1024 * 1024,
  maxFiles = 5,
  filterType = 'images'
) => ({
  storage: isProduction && bucketName ? multer.memoryStorage() : createLocalStorage(subfolder),
  limits: { fileSize: maxSize, files: maxFiles },
  fileFilter: fileFilters[filterType],
});

// ---------------------------------------------------------
// 📦 Pre-Configured Upload Handlers
// ---------------------------------------------------------
export const uploadHandlers = {
  prescriptions: multer(createMulterConfig('prescriptions', 5 * 1024 * 1024, 5, 'prescriptions')),
  medicineImages: multer(createMulterConfig('medicines', 2 * 1024 * 1024, 3, 'images')),
  profilePictures: multer(createMulterConfig('profiles', 1 * 1024 * 1024, 1, 'images')),
  documents: multer(createMulterConfig('documents', 10 * 1024 * 1024, 10, 'documents')),
};

// ---------------------------------------------------------
// 🔄 Middleware: Process Uploaded Files (Post-Multer)
// ---------------------------------------------------------
export const processUploadedFiles = (subfolder = '') => {
  return async (req, res, next) => {
    try {
      if (!req.file && !req.files) return next();

      const userId = req.user?.id || null;

      // Single file
      if (req.file && isProduction && bucketName) {
        const result = await uploadToGCS(req.file, subfolder, userId);
        req.file.gcsUrl = result.url;
        req.file.gcsFilename = result.filename;
        req.file.path = result.url; // backward compatibility
      }

      // Multiple files
      if (req.files && isProduction && bucketName) {
        const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        for (const file of filesArray) {
          const result = await uploadToGCS(file, subfolder, userId);
          file.gcsUrl = result.url;
          file.gcsFilename = result.filename;
          file.path = result.url;
        }
      }

      next();
    } catch (error) {
      logError(error, { context: 'file_upload_processing', subfolder, userId: req.user?.id });
      next(error);
    }
  };
};

// ---------------------------------------------------------
// 🖼️ Process and Upload Image
// ---------------------------------------------------------
export const processAndUploadImage = async (file, options = {}, userId = null) => {
  try {
    const { maxWidth = 1920, maxHeight = 1080, quality = 80, subfolder = 'images' } = options;

    const processedBuffer = await sharp(file.buffer)
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    const processedFile = {
      ...file,
      buffer: processedBuffer,
      originalname: file.originalname.replace(/\.[^/.]+$/, '.jpg'),
      mimetype: 'image/jpeg',
      size: processedBuffer.length,
    };

    if (isProduction && bucketName) {
      return await uploadToGCS(processedFile, subfolder, userId);
    }

    const filename = `${uuidv4()}.jpg`;
    const subdir = path.join(uploadsDir, subfolder);
    if (!fs.existsSync(subdir)) fs.mkdirSync(subdir, { recursive: true });

    const filepath = path.join(subdir, filename);
    await sharp(processedBuffer).toFile(filepath);

    logFileOperation('upload', filename, userId, {
      size: processedBuffer.length,
      subfolder,
      processed: true,
    });

    return {
      filename,
      url: fileUtils.getFileUrl(filename, subfolder),
      size: processedBuffer.length,
      mimetype: 'image/jpeg',
    };
  } catch (error) {
    logError(error, { context: 'image_processing_error', userId });
    throw error;
  }
};

// ---------------------------------------------------------
// 🧰 File Utilities
// ---------------------------------------------------------
export const fileUtils = {
  fileExists: async (filename) => {
    try {
      if (isProduction && bucketName) {
        const [exists] = await bucket.file(filename).exists();
        return exists;
      }
      return fs.existsSync(path.join(uploadsDir, filename));
    } catch (error) {
      logError(error, { context: 'file_exists_check', filename });
      return false;
    }
  },

  deleteFile: async (filename, userId = null) => {
    try {
      if (isProduction && bucketName) {
        await bucket.file(filename).delete();
        logFileOperation('delete', filename, userId, { source: 'gcs' });
        return true;
      }
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logFileOperation('delete', filename, userId, { source: 'local' });
        return true;
      }
      return false;
    } catch (error) {
      logError(error, { context: 'file_deletion_error', filename, userId });
      return false;
    }
  },

  getFileInfo: async (filename) => {
    try {
      if (isProduction && bucketName) {
        const [metadata] = await bucket.file(filename).getMetadata();
        return {
          size: parseInt(metadata.size),
          sizeFormatted: formatFileSize(parseInt(metadata.size)),
          created: new Date(metadata.timeCreated),
          modified: new Date(metadata.updated),
          extension: path.extname(filename),
          name: path.basename(filename),
          contentType: metadata.contentType,
        };
      }

      const filePath = path.join(uploadsDir, filename);
      if (!fs.existsSync(filePath)) return null;
      const stats = fs.statSync(filePath);

      return {
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath),
        name: path.basename(filePath),
      };
    } catch (error) {
      logError(error, { context: 'get_file_info_error', filename });
      return null;
    }
  },

  getFileUrl: (filename, subfolder = '') => {
    if (isProduction && bucketName) {
      const fullPath = subfolder ? `${subfolder}/${filename}` : filename;
      return `https://storage.googleapis.com/${bucketName}/${fullPath}`;
    }
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const folderPath = subfolder ? `${subfolder}/` : '';
    return `${baseUrl}/uploads/${folderPath}${filename}`;
  },

  copyFile: async (sourceFilename, destinationFilename, userId = null) => {
    try {
      if (isProduction && bucketName) {
        await bucket.file(sourceFilename).copy(bucket.file(destinationFilename));
        logFileOperation('copy', destinationFilename, userId, { source: sourceFilename });
        return true;
      }

      const sourcePath = path.join(uploadsDir, sourceFilename);
      const destPath = path.join(uploadsDir, destinationFilename);
      fs.copyFileSync(sourcePath, destPath);
      logFileOperation('copy', destinationFilename, userId, { source: sourceFilename });
      return true;
    } catch (error) {
      logError(error, {
        context: 'file_copy_error',
        source: sourceFilename,
        destination: destinationFilename,
        userId,
      });
      return false;
    }
  },
};

// ---------------------------------------------------------
// ⚠️ Multer Error Handler
// ---------------------------------------------------------
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logError(error, {
      context: 'multer_error',
      code: error.code,
      userId: req.user?.id,
    });

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res
          .status(400)
          .json({ error: 'File too large', details: 'Please choose a smaller file' });
      case 'LIMIT_FILE_COUNT':
        return res
          .status(400)
          .json({ error: 'Too many files', details: 'Maximum number of files exceeded' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res
          .status(400)
          .json({ error: 'Unexpected file field', details: 'Invalid file field name' });
      default:
        return res
          .status(400)
          .json({ error: 'File upload error', details: error.message });
    }
  }

  if (error) {
    logError(error, { context: 'upload_error', userId: req.user?.id });
    return res
      .status(400)
      .json({ error: 'File upload failed', details: error.message });
  }

  next();
};

// ---------------------------------------------------------
// 📏 File Size Formatter
// ---------------------------------------------------------
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// ---------------------------------------------------------
// 🚀 Default Export (Prescriptions Handler)
// ---------------------------------------------------------
export default uploadHandlers.prescriptions;
