import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewData {
  authorName: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  product: Types.ObjectId | null;
  status: ReviewStatus;
  adminNote: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<ReviewData>;

const reviewSchema = new Schema<ReviewData>(
  {
    authorName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, select: false },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5' },
    },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    adminNote: { type: String, default: '', maxlength: 500 },
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

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

// Idempotent registration: test workers may re-evaluate this module.
export const Review =
  (mongoose.models.Review as Model<ReviewData> | undefined) ?? model<ReviewData>("Review", reviewSchema);
