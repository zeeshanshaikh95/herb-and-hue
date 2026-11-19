import mongoose, { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { imageRefSchema, type ImageRef } from './shared.js';

export interface GalleryItemData {
  title: string;
  caption: string;
  image: ImageRef;
  linkUrl: string;
  displayOrder: number;
  isActive: boolean;
  sampleData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type GalleryItemDocument = HydratedDocument<GalleryItemData>;

const galleryItemSchema = new Schema<GalleryItemData>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    caption: { type: String, default: '', trim: true, maxlength: 400 },
    image: { type: imageRefSchema, required: true },
    linkUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    displayOrder: { type: Number, default: 0, min: 0, max: 100_000 },
    isActive: { type: Boolean, default: true, index: true },
    sampleData: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

galleryItemSchema.index({ isActive: 1, displayOrder: 1 });

// Idempotent registration: test workers may re-evaluate this module.
export const GalleryItem =
  (mongoose.models.GalleryItem as Model<GalleryItemData> | undefined) ?? model<GalleryItemData>("GalleryItem", galleryItemSchema);
