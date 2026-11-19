export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(code: string, message: string) {
    return new AppError(401, code, message);
  }

  static forbidden(code: string, message: string) {
    return new AppError(403, code, message);
  }

  static notFound(code: string, message: string) {
    return new AppError(404, code, message);
  }

  static conflict(code: string, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }

  static tooLarge(code: string, message: string) {
    return new AppError(413, code, message);
  }

  static unavailable(code: string, message: string) {
    return new AppError(503, code, message);
  }
}
