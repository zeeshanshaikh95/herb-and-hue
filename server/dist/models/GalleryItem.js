import mongoose, { Schema, model } from 'mongoose';
import { imageRefSchema } from './shared.js';
const galleryItemSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 120 },
    caption: { type: String, default: '', trim: true, maxlength: 400 },
    image: { type: imageRefSchema, required: true },
    linkUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    displayOrder: { type: Number, default: 0, min: 0, max: 100_000 },
    isActive: { type: Boolean, default: true, index: true },
    sampleData: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
galleryItemSchema.index({ isActive: 1, displayOrder: 1 });
// Idempotent registration: test workers may re-evaluate this module.
export const GalleryItem = mongoose.models.GalleryItem ?? model("GalleryItem", galleryItemSchema);
//# sourceMappingURL=GalleryItem.js.map