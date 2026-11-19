import { Types } from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { pageMeta } from '../utils/pagination.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegExp, slugify } from '../utils/slug.js';
import { parseId, parseQuery } from '../middleware/validate.js';
import { adminProductQuerySchema, productInputSchema, productQuerySchema, } from '../validation/schemas.js';
import { toAdminProduct, toPublicProduct } from '../services/serializers.js';
import { cleanupDetachedImages } from '../services/mediaCleanup.js';
const PUBLIC_SORT = {
    featured: { featured: -1, displayOrder: 1, createdAt: -1 },
    newest: { createdAt: -1 },
    'price-asc': { price: 1, displayOrder: 1 },
    'price-desc': { price: -1, displayOrder: 1 },
    name: { name: 1 },
};
function isPopulatedCategory(value) {
    return typeof value === 'object' && value !== null && 'name' in value;
}
async function findCategoryIdBySlug(slug) {
    const category = await Category.findOne({ slug, isActive: true }).select('_id');
    return category ? category._id : null;
}
export async function listProducts(req, res) {
    const query = parseQuery(productQuerySchema, req.query);
    const filter = { archivedAt: null };
    if (query.featured)
        filter.featured = query.featured === 'true';
    if (query.bestseller)
        filter.bestseller = query.bestseller === 'true';
    if (query.category && query.category !== 'all') {
        const categoryId = await findCategoryIdBySlug(query.category);
        if (!categoryId) {
            res.json({ data: [], meta: pageMeta(1, query.limit, 0) });
            return;
        }
        filter.category = categoryId;
    }
    if (query.search) {
        const pattern = new RegExp(escapeRegExp(query.search), 'i');
        filter.$or = [{ name: pattern }, { shortDescription: pattern }, { sku: pattern }];
    }
    if (query.inStock === 'true') {
        filter.$and = [
            {
                $or: [
                    { 'variants.stockQuantity': { $gt: 0 } },
                    { variants: { $size: 0 }, stockQuantity: { $gt: 0 } },
                ],
            },
        ];
    }
    else if (query.inStock === 'false') {
        filter.$and = [
            {
                $nor: [
                    { 'variants.stockQuantity': { $gt: 0 } },
                    { variants: { $size: 0 }, stockQuantity: { $gt: 0 } },
                ],
            },
        ];
    }
    const skip = (query.page - 1) * query.limit;
    const [total, products] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
            .populate('category', 'name slug')
            .sort(PUBLIC_SORT[query.sort] ?? PUBLIC_SORT.featured)
            .skip(skip)
            .limit(query.limit),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({
        data: products.map((product) => toPublicProduct(product)),
        meta: pageMeta(query.page, query.limit, total),
    });
}
async function findPublicProduct(slug) {
    const product = await Product.findOne({ slug, archivedAt: null }).populate('category', 'name slug');
    if (!product)
        throw AppError.notFound('product_not_found', 'This product could not be found.');
    return product;
}
export async function getProduct(req, res) {
    const product = await findPublicProduct(String(req.params.slug));
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({ data: toPublicProduct(product) });
}
export async function getRelatedProducts(req, res) {
    const product = await findPublicProduct(String(req.params.slug));
    const categoryId = isPopulatedCategory(product.category)
        ? product.category._id
        : product.category;
    const related = await Product.find({
        _id: { $ne: product._id },
        category: categoryId,
        archivedAt: null,
    })
        .populate('category', 'name slug')
        .sort({ featured: -1, displayOrder: 1, createdAt: -1 })
        .limit(4);
    if (related.length < 4) {
        const fillers = await Product.find({
            _id: { $ne: product._id, $nin: related.map((item) => item._id) },
            archivedAt: null,
        })
            .populate('category', 'name slug')
            .sort({ bestseller: -1, createdAt: -1 })
            .limit(4 - related.length);
        related.push(...fillers);
    }
    res.json({
        data: related.map((item) => toPublicProduct(item)),
    });
}
export async function listAdminProducts(req, res) {
    const query = parseQuery(adminProductQuerySchema, req.query);
    const filter = {};
    if (query.status === 'active')
        filter.archivedAt = null;
    if (query.status === 'archived')
        filter.archivedAt = { $ne: null };
    if (query.category && query.category !== 'all') {
        if (Types.ObjectId.isValid(query.category)) {
            filter.category = new Types.ObjectId(query.category);
        }
        else {
            const category = await Category.findOne({ slug: query.category }).select('_id');
            filter.category = category ? category._id : new Types.ObjectId();
        }
    }
    if (query.search) {
        const pattern = new RegExp(escapeRegExp(query.search), 'i');
        filter.$or = [{ name: pattern }, { slug: pattern }, { sku: pattern }];
    }
    const skip = (query.page - 1) * query.limit;
    const [total, products] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
            .populate('category', 'name slug')
            .sort({ archivedAt: 1, displayOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(query.limit),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
        data: products.map((product) => toAdminProduct(product)),
        meta: pageMeta(query.page, query.limit, total),
    });
}
export async function getAdminProduct(req, res) {
    const id = parseId(req.params.id);
    const product = await Product.findById(id).populate('category', 'name slug');
    if (!product)
        throw AppError.notFound('product_not_found', 'Product not found.');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: toAdminProduct(product) });
}
async function ensureCategoryExists(categoryId) {
    const exists = await Category.exists({ _id: categoryId });
    if (!exists) {
        throw new AppError(422, 'validation_failed', 'Some fields need attention.', [
            { field: 'category', message: 'Choose an existing category.' },
        ]);
    }
}
export async function createProduct(req, res) {
    const input = req.body;
    await ensureCategoryExists(input.category);
    const slug = input.slug ?? slugify(input.name);
    if (await Product.exists({ slug })) {
        throw AppError.conflict('duplicate_slug', 'A product with that slug already exists.');
    }
    const product = await Product.create({ ...input, slug });
    await product.populate('category', 'name slug');
    res.status(201).json({
        data: toAdminProduct(product),
    });
}
export async function updateProduct(req, res) {
    const id = parseId(req.params.id);
    const patch = req.body;
    const product = await Product.findById(id);
    if (!product)
        throw AppError.notFound('product_not_found', 'Product not found.');
    const previousImages = product.images.map((image) => ({ publicId: image.publicId, url: image.url }));
    const merged = {
        name: patch.name ?? product.name,
        slug: patch.slug ?? product.slug,
        shortDescription: patch.shortDescription ?? product.shortDescription,
        description: patch.description ?? product.description,
        category: patch.category ?? String(product.category),
        price: patch.price ?? product.price,
        compareAtPrice: patch.compareAtPrice === undefined ? product.compareAtPrice : patch.compareAtPrice,
        sku: patch.sku === undefined ? product.sku : patch.sku,
        variants: patch.variants ??
            product.variants.map((variant) => ({
                label: variant.label,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                stockQuantity: variant.stockQuantity,
                sku: variant.sku,
            })),
        stockQuantity: patch.stockQuantity ?? product.stockQuantity,
        images: patch.images ??
            product.images.map((image) => ({
                url: image.url,
                publicId: image.publicId,
                alt: image.alt,
                width: image.width ?? null,
                height: image.height ?? null,
            })),
        ingredients: patch.ingredients ?? product.ingredients,
        benefits: patch.benefits ?? [...product.benefits],
        directions: patch.directions ?? product.directions,
        warnings: patch.warnings ?? product.warnings,
        featured: patch.featured ?? product.featured,
        bestseller: patch.bestseller ?? product.bestseller,
        displayOrder: patch.displayOrder ?? product.displayOrder,
        seoTitle: patch.seoTitle ?? product.seoTitle,
        seoDescription: patch.seoDescription ?? product.seoDescription,
        sampleData: patch.sampleData ?? product.sampleData,
        adminNotes: patch.adminNotes ?? product.adminNotes,
    };
    const validated = productInputSchema.parse(merged);
    await ensureCategoryExists(validated.category);
    Object.assign(product, validated);
    await product.save();
    await product.populate('category', 'name slug');
    const retainedIds = new Set(product.images.map((image) => image.publicId).filter(Boolean));
    const removed = previousImages.filter((image) => image.publicId && !retainedIds.has(image.publicId));
    if (removed.length > 0)
        void cleanupDetachedImages(removed);
    res.json({
        data: toAdminProduct(product),
    });
}
export async function archiveProduct(req, res) {
    const id = parseId(req.params.id);
    const product = await Product.findByIdAndUpdate(id, { $set: { archivedAt: new Date() } }, { new: true }).populate('category', 'name slug');
    if (!product)
        throw AppError.notFound('product_not_found', 'Product not found.');
    res.json({ data: toAdminProduct(product) });
}
export async function restoreProduct(req, res) {
    const id = parseId(req.params.id);
    const product = await Product.findByIdAndUpdate(id, { $set: { archivedAt: null } }, { new: true }).populate('category', 'name slug');
    if (!product)
        throw AppError.notFound('product_not_found', 'Product not found.');
    res.json({ data: toAdminProduct(product) });
}
export async function reorderProducts(req, res) {
    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } }).select('_id');
    if (products.length !== ids.length) {
        throw AppError.badRequest('unknown_product', 'One or more products no longer exist.');
    }
    await Product.bulkWrite(ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { displayOrder: index } } },
    })));
    res.json({ data: { message: 'Product order updated.' } });
}
//# sourceMappingURL=productController.js.map