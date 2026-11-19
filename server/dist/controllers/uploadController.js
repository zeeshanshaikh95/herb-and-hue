import { MediaAsset } from '../models/MediaAsset.js';
import { AppError } from '../utils/AppError.js';
import { detectImage } from '../utils/imageSignature.js';
import { destroyImage, findImageReferences, storeImage } from '../services/uploadService.js';
import { requireAdmin } from '../middleware/validate.js';
export async function uploadImages(req, res) {
    const admin = requireAdmin(req);
    const files = req.files ?? [];
    if (files.length === 0) {
        throw AppError.badRequest('no_files', 'Choose at least one image to upload.');
    }
    if (files.length > 6) {
        throw AppError.badRequest('too_many_files', 'Upload at most 6 images at a time.');
    }
    // Verify every file signature before storing anything, so a batch is atomic
    // with respect to validation.
    for (const file of files) {
        if (!detectImage(file.buffer)) {
            throw AppError.badRequest('unsupported_file_type', `"${file.originalname}" is not a genuine JPG, PNG or WebP image.`);
        }
    }
    const altField = req.body?.alt;
    const alt = typeof altField === 'string' ? altField.trim().slice(0, 200) : '';
    const stored = await Promise.all(files.map((file) => storeImage(file, admin._id, alt)));
    res.status(201).json({
        data: stored.map((image) => ({
            url: image.url,
            publicId: image.publicId,
            alt: image.alt,
            width: image.width,
            height: image.height,
            provider: image.provider,
            bytes: image.bytes,
        })),
    });
}
export async function listMedia(req, res) {
    const limitRaw = Number.parseInt(String(req.query.limit ?? '40'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 40;
    const assets = await MediaAsset.find().sort({ createdAt: -1 }).limit(limit);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
        data: assets.map((asset) => ({
            publicId: asset.publicId,
            url: asset.url,
            format: asset.format,
            bytes: asset.bytes,
            width: asset.width,
            height: asset.height,
            provider: asset.provider,
            createdAt: asset.createdAt,
        })),
    });
}
export async function deleteMedia(req, res) {
    const publicId = String(req.query.publicId ?? '').trim();
    if (!publicId)
        throw AppError.badRequest('missing_public_id', 'A publicId query parameter is required.');
    const asset = await MediaAsset.findOne({ publicId });
    const url = asset?.url ?? String(req.query.url ?? '').trim();
    if (!url) {
        throw AppError.notFound('media_not_found', 'That media asset is not in the library.');
    }
    const { references } = await findImageReferences(publicId, url);
    if (references.length > 0) {
        throw AppError.conflict('image_in_use', `This image is still used by ${references.join(', ')}. Remove it from those records first.`);
    }
    await destroyImage(publicId);
    res.json({ data: { message: 'Image deleted.' } });
}
//# sourceMappingURL=uploadController.js.map