import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import multerStorageMemory from 'multer/memoryStorage.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { logger } from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service role key for server-side
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define per-bucket config for allowed MIME types and max file size (bytes)
const bucketConfigs = {
  'medicine-images': {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: /jpeg|jpg|png|webp/,
  },
  'prescriptions': {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: /jpeg|jpg|png|pdf/,
  },
  'user-profiles': {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: /jpeg|jpg|png|webp/,
  }
};

// Create multer upload middleware dynamically per bucket
export const createUploadMiddleware = (bucket) => {
  const config = bucketConfigs[bucket];
  if (!config) throw new Error(`Invalid bucket name: ${bucket}`);

  return multer({
    storage: multerStorageMemory(),
    limits: {
      fileSize: config.maxFileSize,
    },
    fileFilter: (req, file, cb) => {
      const extname = config.allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = config.allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type for ${bucket}`));
      }
    },
  });
};

// Generic function to upload file buffer to Supabase with folder support
export const uploadFileToSupabase = async (fileBuffer, originalName, bucket = 'uploads', folder = '') => {
  try {
    const uniqueFileName = `${folder ? folder + '/' : ''}${uuidv4()}${path.extname(originalName)}`;
    const { data, error } = await supabase.storage.from(bucket).upload(uniqueFileName, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: null,
    });

    if (error) {
      logger.error('Supabase upload error', { error });
      throw error;
    }

    logger.info('File uploaded to Supabase', { bucket, file: uniqueFileName });
    return uniqueFileName;
  } catch (error) {
    logger.error('File upload failed', { error, file: originalName });
    throw error;
  }
};

// Get public URL for a file in storage bucket
export const getPublicUrl = (filePath, bucket = 'uploads') => {
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
};

// Delete file from storage bucket
export const deleteFile = async (filePath, bucket = 'uploads') => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      logger.error('Failed to delete file from Supabase Storage', { filePath, error });
      throw error;
    }
    logger.info('File deleted from Supabase Storage', { filePath });
  } catch (error) {
    throw error;
  }
};

// Convenience upload functions for each bucket:
export const uploadMedicineImage = (fileBuffer, originalName) =>
  uploadFileToSupabase(fileBuffer, originalName, 'medicine-images');

export const uploadPrescription = (fileBuffer, originalName, userId) =>
  uploadFileToSupabase(fileBuffer, originalName, 'prescriptions', userId);

export const uploadUserProfilePicture = (fileBuffer, originalName, userId) =>
  uploadFileToSupabase(fileBuffer, originalName, 'user-profiles', userId);
