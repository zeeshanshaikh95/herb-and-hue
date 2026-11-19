import { AppError } from '../utils/AppError.js';
/**
 * Validates and replaces req.body with the parsed value. Unknown keys are
 * rejected by `.strict()` schemas, preventing mass assignment.
 */
export function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(result.error);
            return;
        }
        req.body = result.data;
        next();
    };
}
export function parseQuery(schema, query) {
    return schema.parse(query);
}
/** Ensures a route param is a Mongo ObjectId, returning 400 rather than a cast error. */
export function parseId(value) {
    if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw AppError.badRequest('invalid_identifier', 'Invalid identifier.');
    }
    return value;
}
export function requireAdmin(req) {
    if (!req.admin) {
        const error = new Error('Admin context missing after authentication');
        error.name = 'UnauthenticatedRequest';
        throw error;
    }
    return req.admin;
}
//# sourceMappingURL=validate.js.map