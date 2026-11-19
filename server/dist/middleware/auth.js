import { Admin } from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';
import { verifyAdminToken } from '../utils/authToken.js';
export const authenticateAdmin = async (req, _res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw AppError.unauthorized('unauthenticated', 'Sign in to continue.');
        }
        const token = header.slice('Bearer '.length).trim();
        if (!token || token.length > 4096) {
            throw AppError.unauthorized('invalid_token', 'Invalid session token.');
        }
        const payload = verifyAdminToken(token);
        const admin = await Admin.findById(payload.sub).select('+passwordHash');
        if (!admin) {
            throw AppError.unauthorized('account_missing', 'This account is no longer available.');
        }
        if (admin.tokenVersion !== payload.tv) {
            throw AppError.unauthorized('session_revoked', 'Your session was ended. Please sign in again.');
        }
        req.admin = admin;
        next();
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=auth.js.map