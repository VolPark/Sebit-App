import { describe, it, expect } from 'vitest';
import {
    calculateNameScore,
    calculateDateScore,
    calculateCountryScore,
} from '../scoring';

describe('AML Scoring Utils', () => {
    describe('calculateNameScore', () => {
        it('returns 100 for exact match', () => {
            expect(calculateNameScore('John Doe', 'John Doe')).toBe(100);
        });

        it('returns 100 for case-insensitive match', () => {
            expect(calculateNameScore('John', 'john')).toBe(100);
            expect(calculateNameScore('ALICE', 'alice')).toBe(100);
        });

        it('returns 0 when either string is empty', () => {
            expect(calculateNameScore('', 'John')).toBe(0);
            expect(calculateNameScore('John', '')).toBe(0);
            expect(calculateNameScore('', '')).toBe(100); // both empty = exact match after trim
        });

        it('returns 100 after trimming whitespace', () => {
            expect(calculateNameScore('  test  ', 'test')).toBe(100);
            expect(calculateNameScore('test', '  test  ')).toBe(100);
        });

        it('returns a high score for similar names', () => {
            // "john" vs "jon" => distance 1, maxLength 4 => round((1 - 1/4) * 100) = 75
            const score = calculateNameScore('John', 'Jon');
            expect(score).toBe(75);
        });

        it('returns a low score for completely different names', () => {
            const score = calculateNameScore('Alice', 'Zbyněk');
            expect(score).toBeLessThan(30);
        });

        it('handles single character strings', () => {
            expect(calculateNameScore('a', 'a')).toBe(100);
            expect(calculateNameScore('a', 'b')).toBe(0); // distance 1, maxLength 1 => 0
        });
    });

    describe('calculateDateScore', () => {
        it('returns 100 for exact date match', () => {
            expect(calculateDateScore('2024-01-15', '2024-01-15')).toBe(100);
        });

        it('returns 50 for same year but different month/day', () => {
            expect(calculateDateScore('2024-01-15', '2024-06-20')).toBe(50);
            expect(calculateDateScore('2024-03-01', '2024-12-31')).toBe(50);
        });

        it('returns 0 for different years', () => {
            expect(calculateDateScore('2023-01-15', '2024-01-15')).toBe(0);
        });

        it('returns 0 when either date is null', () => {
            expect(calculateDateScore(null, '2024-01-01')).toBe(0);
            expect(calculateDateScore('2024-01-01', null)).toBe(0);
            expect(calculateDateScore(null, null)).toBe(0);
        });

        it('returns 0 for invalid date strings', () => {
            expect(calculateDateScore('not-a-date', '2024-01-01')).toBe(0);
            expect(calculateDateScore('2024-01-01', 'garbage')).toBe(0);
        });
    });

    describe('calculateCountryScore', () => {
        it('returns 100 for case-insensitive match', () => {
            expect(calculateCountryScore('cz', 'CZ')).toBe(100);
            expect(calculateCountryScore('DE', 'de')).toBe(100);
            expect(calculateCountryScore('US', 'US')).toBe(100);
        });

        it('returns 0 for different countries', () => {
            expect(calculateCountryScore('CZ', 'DE')).toBe(0);
        });

        it('returns 0 when either string is empty', () => {
            expect(calculateCountryScore('', 'CZ')).toBe(0);
            expect(calculateCountryScore('CZ', '')).toBe(0);
        });
    });
});
