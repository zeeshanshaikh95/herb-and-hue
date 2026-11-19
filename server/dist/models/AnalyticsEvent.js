import mongoose, { Schema, model } from 'mongoose';
export const ANALYTICS_EVENT_TYPES = [
    'page_view',
    'product_view',
    'whatsapp_click',
    'add_to_cart',
];
const analyticsEventSchema = new Schema({
    type: { type: String, enum: ANALYTICS_EVENT_TYPES, required: true, index: true },
    path: { type: String, default: '', maxlength: 300 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    productSlug: { type: String, default: '', maxlength: 80 },
    referrerHost: { type: String, default: '', maxlength: 200 },
    createdAt: { type: Date, default: Date.now },
}, { versionKey: false });
// Retain 90 days of aggregate-friendly events, then expire automatically.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
analyticsEventSchema.index({ type: 1, createdAt: -1 });
analyticsEventSchema.index({ productSlug: 1, createdAt: -1 });
// Idempotent registration: test workers may re-evaluate this module.
export const AnalyticsEvent = mongoose.models.AnalyticsEvent ?? model("AnalyticsEvent", analyticsEventSchema);
//# sourceMappingURL=AnalyticsEvent.js.map