/**
 * Error handling utilities for type-safe error processing
 */

/**
 * Safely extracts error message from unknown error type
 * @param error - Unknown error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}

/**
 * Converts unknown error to Error instance
 * @param error - Unknown error object
 * @returns Error instance
 */
export function toError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }
    return new Error(getErrorMessage(error));
}
