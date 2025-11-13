import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import MulterGoogleCloudStorage from 'multer-cloud-storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { logger } from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const bucketName = process.env.GCS_BUCKET_NAME;

// Initialize GCS client
let storage;
let bucket;

if (isProduction && bucketName) {
  storage = new Storage();
  bucket = storage.bucket(bucketName);
  logger.info('Cloud Storage initialized', { bucket: bucketName });
}

// Multer configuration
export const uploadMiddleware = multer({
  storage: isProduction && bucketName
    ? new MulterGoogleCloudStorage({
        bucket: bucketName,
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: process.env.GCS_KEYFILE,
        destination: (req, file, cb) => {
          const folder = file.fieldname || 'uploads';
          const filename = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, filename);
        },
        filename: (req, file, cb) => {
          cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
        }
      })
    : multer.diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
        }
      }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Helper to get public URL
export const getPublicUrl = (filename) => {
  if (isProduction && bucketName) {
    return `https://storage.googleapis.com/${bucketName}/${filename}`;
  }
  return `${process.env.BASE_URL}/uploads/${filename}`;
};

// Helper to delete file
export const deleteFile = async (filename) => {
  try {
    if (isProduction && bucketName) {
      await bucket.file(filename).delete();
      logger.info('File deleted from GCS', { filename });
    } else {
      // Local file deletion logic
      const fs = await import('fs/promises');
      await fs.unlink(`./uploads/${filename}`);
      logger.info('Local file deleted', { filename });
    }
  } catch (error) {
    logger.error('File deletion failed', { filename, error: error.message });
    throw error;
  }
};
