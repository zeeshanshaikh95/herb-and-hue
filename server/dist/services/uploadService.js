import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { config, serverRoot } from '../config/env.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { AppError } from '../utils/AppError.js';
import { detectImage } from '../utils/imageSignature.js';
const LOCAL_UPLOAD_DIR = path.join(serverRoot, 'uploads');
const LOCAL_PUBLIC_PREFIX = '/uploads';
if (config.cloudinary) {
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true,
    });
}
export function cloudinaryConfigured() {
    return config.cloudinary !== null;
}
function uploadToCloudinary(buffer, detected, folder) {
    return new Promise((resolve, reject) => {
        if (!config.cloudinary) {
            reject(AppError.unavailable('cloudinary_unconfigured', 'Cloudinary is not configured.'));
            return;
        }
        const stream = cloudinary.uploader.upload_stream({
            folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'png', 'webp'],
            use_filename: false,
            unique_filename: true,
            overwrite: false,
            timeout: 40_000,
            // Store a sensible master size; delivery URLs request smaller widths.
            transformation: [{ width: 2400, height: 2400, crop: 'limit' }],
            context: { format: detected.format },
        }, (error, result) => {
            if (error || !result) {
                reject(AppError.unavailable('upload_failed', 'The image could not be stored. Please try again.'));
                return;
            }
            resolve(result);
        });
        stream.end(buffer);
    });
}
/** Verify bytes first, then persist. Rejects before any storage call. */
export async function storeImage(file, adminId, alt = '') {
    if (!file.buffer || file.buffer.length === 0) {
        throw AppError.badRequest('empty_file', 'The uploaded file is empty.');
    }
    if (file.buffer.length > config.uploads.maxBytes) {
        throw AppError.tooLarge('file_too_large', `Images must be smaller than ${Math.round(config.uploads.maxBytes / (1024 * 1024))} MB.`);
    }
    const detected = detectImage(file.buffer);
    if (!detected) {
        throw AppError.badRequest('unsupported_file_type', 'Only genuine JPG, PNG and WebP images are accepted.');
    }
    let stored;
    if (config.cloudinary) {
        const result = await uploadToCloudinary(file.buffer, detected, config.cloudinary.folder);
        stored = {
            url: result.secure_url,
            publicId: result.public_id,
            alt,
            width: result.width ?? null,
            height: result.height ?? null,
            provider: 'cloudinary',
            bytes: result.bytes ?? file.buffer.length,
            format: result.format ?? detected.format,
        };
    }
    else if (!config.isProduction) {
        // Explicit development fallback: files live on the API host and are clearly
        // surfaced as local (never used in production, where Cloudinary is required).
        await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
        const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${detected.extension}`;
        await writeFile(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
        const publicId = `local/${filename}`;
        stored = {
            url: `${config.publicApiUrl}${LOCAL_PUBLIC_PREFIX}/${filename}`,
            publicId,
            alt,
            width: null,
            height: null,
            provider: 'local',
            bytes: file.buffer.length,
            format: detected.format,
        };
    }
    else {
        throw AppError.unavailable('upload_unavailable', 'Image storage is not configured. Set the Cloudinary credentials on the server.');
    }
    await MediaAsset.create({
        publicId: stored.publicId,
        url: stored.url,
        secureUrl: stored.url,
        provider: stored.provider,
        folder: stored.provider === 'cloudinary' ? (config.cloudinary?.folder ?? '') : 'local',
        format: stored.format,
        bytes: stored.bytes,
        width: stored.width,
        height: stored.height,
        alt: stored.alt,
        uploadedBy: adminId ?? null,
    });
    return stored;
}
export async function destroyImage(publicId) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_./-]{0,299}$/.test(publicId) || publicId.includes('..')) {
        throw AppError.badRequest('invalid_public_id', 'Invalid image identifier.');
    }
    if (publicId.startsWith('local/')) {
        const filename = path.basename(publicId);
        try {
            await unlink(path.join(LOCAL_UPLOAD_DIR, filename));
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
    else if (config.cloudinary) {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true,
        });
        if (result.result !== 'ok' && result.result !== 'not found') {
            throw AppError.unavailable('delete_failed', 'The image could not be deleted from storage.');
        }
    }
    else {
        throw AppError.unavailable('cloudinary_unconfigured', 'Image storage is not configured.');
    }
    await MediaAsset.deleteOne({ publicId });
}
/** Refuses deletion while any content record still points at the asset. */
export async function findImageReferences(publicId, url) {
    const { Product } = await import('../models/Product.js');
    const { Category } = await import('../models/Category.js');
    const { GalleryItem } = await import('../models/GalleryItem.js');
    const { SiteSettings } = await import('../models/SiteSettings.js');
    const [productCount, categoryCount, galleryCount, settingsCount] = await Promise.all([
        Product.countDocuments({ 'images.publicId': publicId }),
        Category.countDocuments({ 'image.publicId': publicId }),
        GalleryItem.countDocuments({ 'image.publicId': publicId }),
        SiteSettings.countDocuments({
            $or: [
                { logoUrl: url },
                { 'homepage.heroImage': url },
                { 'homepage.philosophyImage': url },
                { 'homepage.ritualImage': url },
                { 'about.image': url },
                { 'seo.ogImage': url },
            ],
        }),
    ]);
    const references = [];
    if (productCount > 0)
        references.push(`${productCount} product${productCount === 1 ? '' : 's'}`);
    if (categoryCount > 0)
        references.push(`${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`);
    if (galleryCount > 0)
        references.push(`${galleryCount} gallery item${galleryCount === 1 ? '' : 's'}`);
    if (settingsCount > 0)
        references.push('site settings');
    return { references };
}
export { LOCAL_UPLOAD_DIR, LOCAL_PUBLIC_PREFIX };
//# sourceMappingURL=uploadService.js.map