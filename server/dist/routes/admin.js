import { Router } from 'express';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { adminWriteLimiter, loginLimiter, publicWriteLimiter } from '../middleware/rateLimit.js';
import { imageUpload } from '../middleware/upload.js';
import { changePassword, login, logout, me } from '../controllers/authController.js';
import { archiveProduct, createProduct, getAdminProduct, listAdminProducts, reorderProducts, restoreProduct, updateProduct, } from '../controllers/productController.js';
import { createCategory, deleteCategory, listAdminCategories, reorderCategories, updateCategory, } from '../controllers/categoryController.js';
import { deleteReview, listAdminReviews, moderateReview, } from '../controllers/reviewController.js';
import { createGalleryItem, deleteGalleryItem, listAdminGallery, reorderGallery, updateGalleryItem, } from '../controllers/galleryController.js';
import { getAdminSettings, updateSettings } from '../controllers/settingsController.js';
import { deleteMedia, listMedia, uploadImages } from '../controllers/uploadController.js';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { categoryInputSchema, categoryPatchSchema, changePasswordSchema, galleryInputSchema, galleryPatchSchema, loginSchema, orderSchema, productInputSchema, productPatchSchema, reviewModerationSchema, settingsInputSchema, } from '../validation/schemas.js';
export const adminRouter = Router();
/* ------------------------------ auth ------------------------------ */
adminRouter.post('/auth/login', loginLimiter, validateBody(loginSchema), asyncHandler(login));
adminRouter.use(authenticateAdmin);
adminRouter.get('/auth/me', asyncHandler(me));
adminRouter.post('/auth/change-password', publicWriteLimiter, validateBody(changePasswordSchema), asyncHandler(changePassword));
adminRouter.post('/auth/logout', asyncHandler(logout));
/* --------------------------- write limiting --------------------------- */
const isReadRequest = (req) => req.method === 'GET' || req.method === 'HEAD';
adminRouter.use((req, res, next) => {
    if (isReadRequest(req))
        return next();
    return adminWriteLimiter(req, res, next);
});
/* ----------------------------- products ----------------------------- */
adminRouter.get('/products', asyncHandler(listAdminProducts));
adminRouter.post('/products', validateBody(productInputSchema), asyncHandler(createProduct));
adminRouter.patch('/products/order', validateBody(orderSchema), asyncHandler(reorderProducts));
adminRouter.get('/products/:id', asyncHandler(getAdminProduct));
adminRouter.patch('/products/:id', validateBody(productPatchSchema), asyncHandler(updateProduct));
adminRouter.post('/products/:id/archive', asyncHandler(archiveProduct));
adminRouter.post('/products/:id/restore', asyncHandler(restoreProduct));
// Deletion is intentionally soft: catalogue records are archived, not destroyed,
// so reviews, orders and media references stay intact.
adminRouter.delete('/products/:id', asyncHandler(archiveProduct));
/* ---------------------------- categories ---------------------------- */
adminRouter.get('/categories', asyncHandler(listAdminCategories));
adminRouter.post('/categories', validateBody(categoryInputSchema), asyncHandler(createCategory));
adminRouter.patch('/categories/order', validateBody(orderSchema), asyncHandler(reorderCategories));
adminRouter.patch('/categories/:id', validateBody(categoryPatchSchema), asyncHandler(updateCategory));
adminRouter.delete('/categories/:id', asyncHandler(deleteCategory));
/* ------------------------------ reviews ------------------------------ */
adminRouter.get('/reviews', asyncHandler(listAdminReviews));
adminRouter.patch('/reviews/:id', validateBody(reviewModerationSchema), asyncHandler(moderateReview));
adminRouter.delete('/reviews/:id', asyncHandler(deleteReview));
/* ------------------------------ gallery ------------------------------ */
adminRouter.get('/gallery', asyncHandler(listAdminGallery));
adminRouter.post('/gallery', validateBody(galleryInputSchema), asyncHandler(createGalleryItem));
adminRouter.patch('/gallery/order', validateBody(orderSchema), asyncHandler(reorderGallery));
adminRouter.patch('/gallery/:id', validateBody(galleryPatchSchema), asyncHandler(updateGalleryItem));
adminRouter.delete('/gallery/:id', asyncHandler(deleteGalleryItem));
/* ----------------------------- settings ----------------------------- */
adminRouter.get('/settings', asyncHandler(getAdminSettings));
adminRouter.put('/settings', validateBody(settingsInputSchema), asyncHandler(updateSettings));
/* ------------------------------ media ------------------------------ */
adminRouter.post('/uploads', imageUpload.array('images', config.uploads.maxFiles), asyncHandler(uploadImages));
adminRouter.get('/media', asyncHandler(listMedia));
adminRouter.delete('/media', asyncHandler(deleteMedia));
/* ----------------------------- analytics ----------------------------- */
adminRouter.get('/analytics/summary', asyncHandler(getAnalyticsSummary));
//# sourceMappingURL=admin.js.map