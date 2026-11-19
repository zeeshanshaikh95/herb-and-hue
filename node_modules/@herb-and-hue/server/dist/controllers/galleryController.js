import { GalleryItem } from '../models/GalleryItem.js';
import { parseId } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { cleanupDetachedImages } from '../services/mediaCleanup.js';
import { toAdminGalleryItem, toPublicGalleryItem } from '../services/serializers.js';
import { galleryInputSchema } from '../validation/schemas.js';
import { getSettings } from '../services/settingsService.js';
export async function listPublicGallery(_req, res) {
    const settings = await getSettings();
    if (!settings.features.galleryEnabled) {
        res.json({ data: [] });
        return;
    }
    const items = await GalleryItem.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ data: items.map((item) => toPublicGalleryItem(item)) });
}
export async function listAdminGallery(_req, res) {
    const items = await GalleryItem.find().sort({ displayOrder: 1, createdAt: -1 });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: items.map((item) => toAdminGalleryItem(item)) });
}
export async function createGalleryItem(req, res) {
    const item = await GalleryItem.create(req.body);
    res.status(201).json({ data: toAdminGalleryItem(item) });
}
export async function updateGalleryItem(req, res) {
    const id = parseId(req.params.id);
    const patch = req.body;
    const item = await GalleryItem.findById(id);
    if (!item)
        throw AppError.notFound('gallery_not_found', 'Gallery item not found.');
    const previousImage = { publicId: item.image.publicId, url: item.image.url };
    const merged = {
        title: patch.title ?? item.title,
        caption: patch.caption ?? item.caption,
        image: patch.image ??
            {
                url: item.image.url,
                publicId: item.image.publicId,
                alt: item.image.alt,
                width: item.image.width ?? null,
                height: item.image.height ?? null,
            },
        linkUrl: patch.linkUrl ?? item.linkUrl,
        displayOrder: patch.displayOrder ?? item.displayOrder,
        isActive: patch.isActive ?? item.isActive,
        sampleData: patch.sampleData ?? item.sampleData,
    };
    const validated = galleryInputSchema.parse(merged);
    Object.assign(item, validated);
    await item.save();
    if (previousImage.publicId && validated.image.publicId !== previousImage.publicId) {
        void cleanupDetachedImages([previousImage]);
    }
    res.json({ data: toAdminGalleryItem(item) });
}
export async function deleteGalleryItem(req, res) {
    const id = parseId(req.params.id);
    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item)
        throw AppError.notFound('gallery_not_found', 'Gallery item not found.');
    if (item.image.publicId) {
        void cleanupDetachedImages([{ publicId: item.image.publicId, url: item.image.url }]);
    }
    res.json({ data: { message: 'Gallery item deleted.' } });
}
export async function reorderGallery(req, res) {
    const { ids } = req.body;
    const found = await GalleryItem.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) {
        throw AppError.badRequest('unknown_gallery_item', 'One or more gallery items no longer exist.');
    }
    await GalleryItem.bulkWrite(ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { displayOrder: index } } },
    })));
    res.json({ data: { message: 'Gallery order updated.' } });
}
//# sourceMappingURL=galleryController.js.map