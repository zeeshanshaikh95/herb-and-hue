import { destroyImage, findImageReferences } from './uploadService.js';
/**
 * After a record drops an image, delete the underlying asset only when nothing
 * else references it. Failures are logged and never block the content change.
 */
export async function cleanupDetachedImages(images) {
    const seen = new Set();
    for (const image of images) {
        const publicId = image.publicId;
        if (!publicId || seen.has(publicId))
            continue;
        seen.add(publicId);
        try {
            const { references } = await findImageReferences(publicId, image.url);
            if (references.length > 0)
                continue;
            await destroyImage(publicId);
        }
        catch (error) {
            console.warn(`[media] Could not clean up detached image ${publicId}:`, error instanceof Error ? error.message : error);
        }
    }
}
//# sourceMappingURL=mediaCleanup.js.map