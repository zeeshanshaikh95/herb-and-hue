import mongoose, { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export type AdminRole = 'owner' | 'editor';

export interface AdminData {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  tokenVersion: number;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminDocument = HydratedDocument<AdminData>;

const adminSchema = new Schema<AdminData>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, default: 'Store owner' },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'editor'], default: 'owner' },
    tokenVersion: { type: Number, default: 0, min: 0 },
    mustChangePassword: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// Idempotent registration: test workers may re-evaluate this module.
export const Admin =
  (mongoose.models.Admin as Model<AdminData> | undefined) ?? model<AdminData>("Admin", adminSchema);
