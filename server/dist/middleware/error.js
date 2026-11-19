import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
function send(res, status, body) {
    res.status(status).json(body);
}
export function notFoundHandler(req, res) {
    send(res, 404, {
        error: {
            code: 'not_found',
            message: `No API route matches ${req.method} ${req.path}`,
            requestId: req.requestId,
        },
    });
}
export function errorHandler(error, req, res, _next) {
    if (res.headersSent)
        return;
    if (error instanceof ZodError) {
        send(res, 422, {
            error: {
                code: 'validation_failed',
                message: 'Some fields need attention.',
                details: error.issues.map((issue) => ({
                    field: issue.path.join('.') || 'body',
                    message: issue.message,
                })),
                requestId: req.requestId,
            },
        });
        return;
    }
    if (error instanceof AppError) {
        send(res, error.statusCode, {
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
                requestId: req.requestId,
            },
        });
        return;
    }
    if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        const tooMany = error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE';
        send(res, tooLarge ? 413 : 400, {
            error: {
                code: tooLarge ? 'file_too_large' : tooMany ? 'too_many_files' : 'upload_failed',
                message: tooLarge
                    ? `Each image must be smaller than ${Math.round(config.uploads.maxBytes / (1024 * 1024))} MB.`
                    : tooMany
                        ? `Upload at most ${config.uploads.maxFiles} images at a time.`
                        : 'The upload could not be processed.',
                requestId: req.requestId,
            },
        });
        return;
    }
    if (error instanceof mongoose.Error.ValidationError) {
        send(res, 422, {
            error: {
                code: 'validation_failed',
                message: 'Some fields need attention.',
                details: Object.values(error.errors).map((issue) => ({
                    field: issue.path,
                    message: issue.message,
                })),
                requestId: req.requestId,
            },
        });
        return;
    }
    if (error instanceof mongoose.Error.CastError) {
        send(res, 400, {
            error: { code: 'invalid_identifier', message: 'Invalid identifier.', requestId: req.requestId },
        });
        return;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        send(res, 409, {
            error: {
                code: 'duplicate_key',
                message: 'A record with that unique value already exists.',
                requestId: req.requestId,
            },
        });
        return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
        send(res, 400, {
            error: { code: 'malformed_json', message: 'The request body is not valid JSON.', requestId: req.requestId },
        });
        return;
    }
    const err = error;
    if (err?.type === 'entity.too.large') {
        send(res, 413, {
            error: { code: 'payload_too_large', message: 'The request body is too large.', requestId: req.requestId },
        });
        return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[error] ${req.requestId ?? '-'} ${req.method} ${req.originalUrl}: ${message}`, {
        stack: config.isProduction ? undefined : stack,
    });
    send(res, 500, {
        error: {
            code: 'internal_error',
            message: 'Something went wrong on our side. Please try again.',
            requestId: req.requestId,
        },
    });
}
//# sourceMappingURL=error.js.map