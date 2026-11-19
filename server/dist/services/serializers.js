export function publicImage(image) {
    return {
        url: image.url,
        alt: image.alt,
        width: image.width ?? null,
        height: image.height ?? null,
    };
}
function publicCategoryRef(category) {
    if (category && typeof category === 'object' && 'name' in category) {
        return { id: String(category._id), name: category.name, slug: category.slug };
    }
    return category ? { id: String(category), name: '', slug: '' } : null;
}
export function productStock(product) {
    if (product.variants.length > 0) {
        return product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);
    }
    return product.stockQuantity;
}
export function toPublicProduct(product) {
    const stock = productStock(product);
    return {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        category: publicCategoryRef(product.category),
        images: product.images.map(publicImage),
        variants: product.variants.map((variant) => ({
            id: variant._id ? String(variant._id) : null,
            label: variant.label,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stockQuantity: variant.stockQuantity,
            sku: variant.sku,
        })),
        inStock: stock > 0,
        stockQuantity: stock,
        ingredients: product.ingredients,
        benefits: [...product.benefits],
        directions: product.directions,
        warnings: product.warnings,
        featured: product.featured,
        bestseller: product.bestseller,
        displayOrder: product.displayOrder,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        sampleData: product.sampleData,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}
export function toAdminProduct(product) {
    return {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        category: publicCategoryRef(product.category),
        categoryId: product.category && typeof product.category === 'object' && '_id' in product.category
            ? String(product.category._id)
            : String(product.category),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        sku: product.sku,
        variants: product.variants.map((variant) => ({
            id: variant._id ? String(variant._id) : null,
            label: variant.label,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stockQuantity: variant.stockQuantity,
            sku: variant.sku,
        })),
        stockQuantity: product.stockQuantity,
        inStock: productStock(product) > 0,
        images: product.images.map((image) => ({
            url: image.url,
            publicId: image.publicId ?? null,
            alt: image.alt,
            width: image.width ?? null,
            height: image.height ?? null,
        })),
        ingredients: product.ingredients,
        benefits: [...product.benefits],
        directions: product.directions,
        warnings: product.warnings,
        featured: product.featured,
        bestseller: product.bestseller,
        displayOrder: product.displayOrder,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        archivedAt: product.archivedAt,
        sampleData: product.sampleData,
        adminNotes: product.adminNotes,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}
export function toPublicCategory(category) {
    return {
        id: String(category._id),
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image ? publicImage(category.image) : null,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        productCount: category.productCount ?? 0,
    };
}
export function toAdminCategory(category) {
    return {
        ...toPublicCategory(category),
        image: category.image
            ? { ...publicImage(category.image), publicId: category.image.publicId ?? null }
            : null,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
    };
}
export function toPublicReview(review) {
    const productRef = review.product;
    return {
        id: String(review._id),
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        product: productRef && typeof productRef === 'object' && 'name' in productRef
            ? { name: productRef.name, slug: productRef.slug }
            : null,
        createdAt: review.createdAt,
    };
}
export function toAdminReview(review) {
    const productRef = review.product;
    return {
        id: String(review._id),
        authorName: review.authorName,
        email: review.email ?? '',
        rating: review.rating,
        title: review.title,
        body: review.body,
        product: productRef && typeof productRef === 'object' && 'name' in productRef
            ? { name: productRef.name, slug: productRef.slug }
            : null,
        status: review.status,
        adminNote: review.adminNote,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
    };
}
export function toPublicGalleryItem(item) {
    return {
        id: String(item._id),
        title: item.title,
        caption: item.caption,
        image: publicImage(item.image),
        linkUrl: item.linkUrl,
        displayOrder: item.displayOrder,
        sampleData: item.sampleData,
    };
}
export function toAdminGalleryItem(item) {
    return {
        ...toPublicGalleryItem(item),
        isActive: item.isActive,
        image: { ...publicImage(item.image), publicId: item.image.publicId ?? null },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
//# sourceMappingURL=serializers.js.map