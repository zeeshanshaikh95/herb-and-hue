import mongoose, { Schema, model } from 'mongoose';
import { imageRefSchema } from './shared.js';
import { slugify } from '../utils/slug.js';
const variantSchema = new Schema({
    label: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0, max: 10_000_000, validate: Number.isInteger },
    compareAtPrice: {
        type: Number,
        default: null,
        min: 0,
        max: 10_000_000,
        validate: {
            validator(value) {
                if (value === null || value === undefined)
                    return true;
                return Number.isInteger(value) && value > this.price;
            },
            message: 'Compare-at price must be a whole amount higher than the selling price',
        },
    },
    stockQuantity: { type: Number, default: 0, min: 0, max: 1_000_000, validate: Number.isInteger },
    sku: { type: String, default: null, maxlength: 64, trim: true },
}, { _id: true });
const productSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 80,
        match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    shortDescription: { type: String, default: '', trim: true, maxlength: 260 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    price: {
        type: Number,
        required: true,
        min: 0,
        max: 10_000_000,
        validate: { validator: Number.isInteger, message: 'Price must be an integer amount in minor units' },
    },
    compareAtPrice: {
        type: Number,
        default: null,
        min: 0,
        max: 10_000_000,
        validate: {
            validator(value) {
                if (value === null || value === undefined)
                    return true;
                return Number.isInteger(value) && value > this.price;
            },
            message: 'Compare-at price must be a whole amount higher than the selling price',
        },
    },
    sku: { type: String, default: null, maxlength: 64, trim: true },
    variants: {
        type: [variantSchema],
        default: [],
        validate: { validator: (items) => items.length <= 10, message: 'At most 10 variants' },
    },
    stockQuantity: { type: Number, default: 0, min: 0, max: 1_000_000, validate: Number.isInteger },
    images: {
        type: [imageRefSchema],
        default: [],
        validate: { validator: (items) => items.length <= 8, message: 'At most 8 images' },
    },
    ingredients: { type: String, default: '', trim: true, maxlength: 5000 },
    benefits: {
        type: [String],
        default: [],
        validate: { validator: (items) => items.length <= 8, message: 'At most 8 benefits' },
    },
    directions: { type: String, default: '', trim: true, maxlength: 2000 },
    warnings: { type: String, default: '', trim: true, maxlength: 2000 },
    featured: { type: Boolean, default: false, index: true },
    bestseller: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, min: 0, max: 100_000 },
    seoTitle: { type: String, default: '', trim: true, maxlength: 70 },
    seoDescription: { type: String, default: '', trim: true, maxlength: 320 },
    archivedAt: { type: Date, default: null },
    sampleData: { type: Boolean, default: false },
    adminNotes: { type: String, default: '', maxlength: 2000 },
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
productSchema.pre('validate', function (next) {
    if (!this.slug && this.name)
        this.slug = slugify(this.name);
    next();
});
productSchema.index({ archivedAt: 1, displayOrder: 1, createdAt: -1 });
productSchema.index({ category: 1, archivedAt: 1 });
productSchema.index({ archivedAt: 1, featured: 1 });
productSchema.index({ archivedAt: 1, bestseller: 1 });
productSchema.index({ name: 1 });
productSchema.virtual('inStock').get(function () {
    if (this.variants.length > 0)
        return this.variants.some((variant) => variant.stockQuantity > 0);
    return this.stockQuantity > 0;
});
// Idempotent registration: test workers may re-evaluate this module.
export const Product = mongoose.models.Product ?? model("Product", productSchema);
//# sourceMappingURL=Product.js.map