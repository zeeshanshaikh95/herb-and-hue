import mongoose, { Schema, model } from 'mongoose';
const mediaAssetSchema = new Schema({
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
}, { timestamps: true, versionKey: false });
mediaAssetSchema.index({ createdAt: -1 });
// Idempotent registration: test workers may re-evaluate this module.
export const MediaAsset = mongoose.models.MediaAsset ?? model("MediaAsset", mediaAssetSchema);
//# sourceMappingURL=MediaAsset.js.map