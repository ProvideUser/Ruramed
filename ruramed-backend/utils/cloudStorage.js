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

// Use multer memory storage to access file buffer
export const uploadMiddleware = multer({
  storage: multerStorageMemory(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
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
  },
});

// Upload file buffer to Supabase Storage
export const uploadFileToSupabase = async (fileBuffer, originalName, bucket = 'uploads', folder = '') => {
  try {
    const uniqueFileName = `${folder ? folder + '/' : ''}${uuidv4()}${path.extname(originalName)}`;
    const { data, error } = await supabase.storage.from(bucket).upload(uniqueFileName, fileBuffer, {
      cacheControl: '3600', // 1 hour cache
      upsert: false,
      contentType: null, // autodetect
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

// Get public URL for a file in Supabase Storage bucket
export const getPublicUrl = (filePath, bucket = 'uploads') => {
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
};

// Delete file from Supabase Storage bucket
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
