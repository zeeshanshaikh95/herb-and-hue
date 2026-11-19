import mongoose, { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { imageRefSchema, type ImageRef } from './shared.js';
import { slugify } from '../utils/slug.js';

export interface CategoryData {
  name: string;
  slug: string;
  description: string;
  image: ImageRef | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<CategoryData>;

const categorySchema = new Schema<CategoryData>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, default: '', trim: true, maxlength: 1200 },
    image: { type: imageRefSchema, default: null },
    displayOrder: { type: Number, default: 0, min: 0, max: 100_000 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

categorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

categorySchema.index({ isActive: 1, displayOrder: 1 });

// Idempotent registration: test workers may re-evaluate this module.
export const Category =
  (mongoose.models.Category as Model<CategoryData> | undefined) ?? model<CategoryData>("Category", categorySchema);
