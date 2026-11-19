import { Schema } from 'mongoose';

export interface ImageRef {
  url: string;
  publicId: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
}

/** Accepts absolute http(s) URLs or in-app paths such as /images/hero.svg. */
export function isSafeImageUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const imageRefSchema = new Schema<ImageRef>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value: string) => isSafeImageUrl(value),
        message: 'Image URL must be an http(s) URL or an absolute in-app path',
      },
    },
    publicId: { type: String, default: null, maxlength: 300 },
    alt: { type: String, required: true, trim: true, maxlength: 200 },
    width: { type: Number, default: null, min: 1, max: 20_000 },
    height: { type: Number, default: null, min: 1, max: 20_000 },
  },
  { _id: false },
);
