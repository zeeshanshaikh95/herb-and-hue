export function parsePagination(query, defaults = {}) {
    const maxLimit = defaults.maxLimit ?? 60;
    const rawPage = Number.parseInt(String(query.page ?? ''), 10);
    const rawLimit = Number.parseInt(String(query.limit ?? ''), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : defaults.page ?? 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, maxLimit)
        : defaults.limit ?? 12;
    return { page, limit, skip: (page - 1) * limit };
}
export function pageMeta(page, limit, total) {
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
    return {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
    };
}
//# sourceMappingURL=pagination.js.map