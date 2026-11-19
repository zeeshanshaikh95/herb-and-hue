import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface MediaAssetData {
  publicId: string;
  url: string;
  secureUrl: string;
  provider: 'cloudinary' | 'local';
  folder: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  uploadedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MediaAssetDocument = HydratedDocument<MediaAssetData>;

const mediaAssetSchema = new Schema<MediaAssetData>(
  {
    publicId: { type: String, required: true, unique: true, maxlength: 300 },
    url: { type: String, required: true, maxlength: 2048 },
    secureUrl: { type: String, required: true, maxlength: 2048 },
    provider: { type: String, enum: ['cloudinary', 'local'], required: true },
    folder: { type: String, default: '', maxlength: 200 },
    format: { type: String, required: true, maxlength: 20 },
    bytes: { type: Number, required: true, min: 0 },
    width: { type: Number, default: null, min: 1 },
    height: { type: Number, default: null, min: 1 },
    alt: { type: String, default: '', maxlength: 200 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, versionKey: false },
);

mediaAssetSchema.index({ createdAt: -1 });

// Idempotent registration: test workers may re-evaluate this module.
export const MediaAsset =
  (mongoose.models.MediaAsset as Model<MediaAssetData> | undefined) ?? model<MediaAssetData>("MediaAsset", mediaAssetSchema);
