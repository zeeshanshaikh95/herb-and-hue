export type DetectedImageFormat = 'jpeg' | 'png' | 'webp';

export interface DetectedImage {
  format: DetectedImageFormat;
  mime: string;
  extension: 'jpg' | 'png' | 'webp';
}

/**
 * Verifies the actual bytes of an upload. MIME type and filename supplied by
 * the browser are never trusted on their own.
 */
export function detectImage(buffer: Buffer): DetectedImage | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpeg', mime: 'image/jpeg', extension: 'jpg' };
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, index) => buffer[index] === byte)) {
    return { format: 'png', mime: 'image/png', extension: 'png' };
  }

  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isWebp) {
    return { format: 'webp', mime: 'image/webp', extension: 'webp' };
  }

  return null;
}

export const ALLOWED_UPLOAD_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
