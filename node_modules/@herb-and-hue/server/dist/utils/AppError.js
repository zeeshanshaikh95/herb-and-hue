export class AppError extends Error {
    statusCode;
    code;
    details;
    expose;
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.expose = statusCode < 500;
        Error.captureStackTrace?.(this, AppError);
    }
    static badRequest(code, message, details) {
        return new AppError(400, code, message, details);
    }
    static unauthorized(code, message) {
        return new AppError(401, code, message);
    }
    static forbidden(code, message) {
        return new AppError(403, code, message);
    }
    static notFound(code, message) {
        return new AppError(404, code, message);
    }
    static conflict(code, message, details) {
        return new AppError(409, code, message, details);
    }
    static tooLarge(code, message) {
        return new AppError(413, code, message);
    }
    static unavailable(code, message) {
        return new AppError(503, code, message);
    }
}
//# sourceMappingURL=AppError.js.map