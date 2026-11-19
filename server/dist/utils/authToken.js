import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './AppError.js';
export const JWT_ALGORITHM = 'HS256';
const ISSUER = 'herb-and-hue';
const AUDIENCE = 'herb-and-hue-admin';
export function signAdminToken(admin) {
    const options = {
        algorithm: JWT_ALGORITHM,
        expiresIn: config.jwtExpiresIn,
        issuer: ISSUER,
        audience: AUDIENCE,
    };
    const token = jwt.sign({ tv: admin.tokenVersion, role: admin.role }, config.jwtSecret, { ...options, subject: admin.id });
    return { token, expiresIn: config.jwtExpiresIn };
}
export function verifyAdminToken(token) {
    try {
        const decoded = jwt.verify(token, config.jwtSecret, {
            algorithms: [JWT_ALGORITHM],
            issuer: ISSUER,
            audience: AUDIENCE,
        });
        if (typeof decoded === 'string' || !decoded.sub) {
            throw AppError.unauthorized('invalid_token', 'Invalid session token.');
        }
        const tv = decoded.tv;
        if (typeof tv !== 'number') {
            throw AppError.unauthorized('invalid_token', 'Invalid session token.');
        }
        return {
            sub: String(decoded.sub),
            tv,
            role: String(decoded.role ?? 'admin'),
        };
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        if (error instanceof jwt.TokenExpiredError) {
            throw AppError.unauthorized('token_expired', 'Your session has expired. Please sign in again.');
        }
        throw AppError.unauthorized('invalid_token', 'Invalid session token.');
    }
}
//# sourceMappingURL=authToken.js.map