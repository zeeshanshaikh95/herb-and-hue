import path from 'node:path';
import multer from 'multer';
import { config } from '../config/env.js';
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME } from '../utils/imageSignature.js';
import { AppError } from '../utils/AppError.js';

/**
 * Memory storage only: bytes are verified and then streamed to Cloudinary (or
 * the explicit local development fallback) by the backend. Nothing is written
 * to a publicly served directory before validation.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxBytes,
    files: config.uploads.maxFiles,
    fields: 10,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_UPLOAD_MIME.has(file.mimetype) || !ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      callback(
        AppError.badRequest(
          'unsupported_file_type',
          'Only JPG, PNG and WebP images are accepted.',
        ),
      );
      return;
    }
    callback(null, true);
  },
});
