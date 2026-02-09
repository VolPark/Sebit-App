import { describe, it, expect } from 'vitest';
import { getErrorMessage, toError } from '../errors';

describe('Error Utilities', () => {
    describe('getErrorMessage', () => {
        it('should extract message from Error instance', () => {
            const error = new Error('Test error message');
            expect(getErrorMessage(error)).toBe('Test error message');
        });

        it('should handle string errors', () => {
            expect(getErrorMessage('String error')).toBe('String error');
        });

        it('should handle objects with message property', () => {
            const error = { message: 'Object error' };
            expect(getErrorMessage(error)).toBe('Object error');
        });

        it('should handle unknown error types', () => {
            expect(getErrorMessage(null)).toBe('An unknown error occurred');
            expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
            expect(getErrorMessage(123)).toBe('An unknown error occurred');
            expect(getErrorMessage({})).toBe('An unknown error occurred');
        });

        it('should handle TypeError', () => {
            const error = new TypeError('Type error occurred');
            expect(getErrorMessage(error)).toBe('Type error occurred');
        });

        it('should handle RangeError', () => {
            const error = new RangeError('Range error occurred');
            expect(getErrorMessage(error)).toBe('Range error occurred');
        });
    });

    describe('toError', () => {
        it('should return Error instance as-is', () => {
            const error = new Error('Test error');
            expect(toError(error)).toBe(error);
        });

        it('should convert string to Error', () => {
            const result = toError('String error');
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('String error');
        });

        it('should convert unknown to Error', () => {
            const result = toError(null);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('An unknown error occurred');
        });

        it('should convert object with message to Error', () => {
            const result = toError({ message: 'Object error' });
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('Object error');
        });
    });
});
