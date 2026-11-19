import mongoose, { Schema, model } from 'mongoose';
import { imageRefSchema } from './shared.js';
import { slugify } from '../utils/slug.js';
const categorySchema = new Schema({
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
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = String(ret._id);
            delete ret._id;
            return ret;
        },
    },
});
categorySchema.pre('validate', function (next) {
    if (!this.slug && this.name)
        this.slug = slugify(this.name);
    next();
});
categorySchema.index({ isActive: 1, displayOrder: 1 });
// Idempotent registration: test workers may re-evaluate this module.
export const Category = mongoose.models.Category ?? model("Category", categorySchema);
//# sourceMappingURL=Category.js.map