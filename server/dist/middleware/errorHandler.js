import { ZodError } from 'zod';
import { NODE_ENV } from '../config.js';
export class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 500, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
export function errorHandler(err, req, res, _next) {
    console.error('[Error caught in handler]:', err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    // Generic fallback without exposing internal stack traces or server paths
    const message = NODE_ENV === 'development' && err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({
        success: false,
        message,
    });
}
