import mongoose, { Schema, model } from 'mongoose';
const adminSchema = new Schema({
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
}, { timestamps: true, versionKey: false });
// Idempotent registration: test workers may re-evaluate this module.
export const Admin = mongoose.models.Admin ?? model("Admin", adminSchema);
//# sourceMappingURL=Admin.js.map