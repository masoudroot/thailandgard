import { Logger } from './logger';
import { Response } from 'express';

/**
 * Centralized error handler for API responses.
 * All errors are logged via Logger and never printed directly to console.
 */
export class ApiErrorHandler {
    /**
     * Handle general API errors and return JSON response.
     * @param err - The error object (can be any type).
     * @param res - Express response object.
     */
    public static handleError(err: any, res: Response): void {
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal Server Error';

        Logger.error(
            `API Error [${statusCode}]: ${message}`,
            {
                statusCode,
                error: err,
                stack: err.stack || new Error().stack,
            }
        );

        res.status(statusCode).json({
            error: {
                code: statusCode,
                message: message,
            },
        });
    }

    /**
     * Handle validation errors (HTTP 400).
     * @param errors - Array of validation error details.
     * @param res - Express response object.
     */
    public static handleValidationError(errors: any[], res: Response): void {
        Logger.warn(
            'Validation Error',
            {
                errorsCount: errors.length,
                errors,
            }
        );

        res.status(400).json({
            error: {
                code: 400,
                message: 'Validation failed',
                details: errors,
            },
        });
    }

    /**
     * Handle not found errors (HTTP 404).
     * @param message - Optional custom message (default: 'Resource not found').
     * @param res - Express response object.
     */
    public static handleNotFound(
        res: Response,
        message: string = 'Resource not found',
    ): void {
        Logger.warn(
            'Not Found',
            { message }
        );

        res.status(404).json({
            error: {
                code: 404,
                message: message,
            },
        });
    }
}
