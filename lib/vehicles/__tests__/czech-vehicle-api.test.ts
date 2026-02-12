import { describe, it, expect } from 'vitest';
import { mapPalivoToTypPaliva, parseRsvDate } from '../czech-vehicle-api';

// =============================================================================
// mapPalivoToTypPaliva
// =============================================================================

describe('mapPalivoToTypPaliva', () => {
  // Electric flag takes priority
  it('should return "elektro" when VozidloElektricke is "ANO"', () => {
    expect(mapPalivoToTypPaliva('BA 95 B', 'ANO', 'NE')).toBe('elektro');
  });

  it('should return "elektro" for case-insensitive electric flag', () => {
    expect(mapPalivoToTypPaliva('NM', 'Ano')).toBe('elektro');
  });

  // Hybrid flag takes priority over fuel string
  it('should return "hybrid" when VozidloHybridni is "ANO"', () => {
    expect(mapPalivoToTypPaliva('BA 95 B', 'NE', 'ANO')).toBe('hybrid');
  });

  it('should return "hybrid" for case-insensitive hybrid flag', () => {
    expect(mapPalivoToTypPaliva('NM', undefined, 'ano')).toBe('hybrid');
  });

  // Benzin variants
  it('should return "benzin" for "BA 95 B"', () => {
    expect(mapPalivoToTypPaliva('BA 95 B')).toBe('benzin');
  });

  it('should return "benzin" for "BA 91"', () => {
    expect(mapPalivoToTypPaliva('BA 91')).toBe('benzin');
  });

  it('should return "benzin" for "BENZIN NATURAL"', () => {
    expect(mapPalivoToTypPaliva('BENZIN NATURAL')).toBe('benzin');
  });

  it('should return "benzin" for lowercase "ba 95"', () => {
    expect(mapPalivoToTypPaliva('ba 95')).toBe('benzin');
  });

  // Diesel variants
  it('should return "diesel" for "NM"', () => {
    expect(mapPalivoToTypPaliva('NM')).toBe('diesel');
  });

  it('should return "diesel" for "NAFTA MOTOROVÁ"', () => {
    expect(mapPalivoToTypPaliva('NAFTA MOTOROVÁ')).toBe('diesel');
  });

  it('should return "diesel" for "DIESEL"', () => {
    expect(mapPalivoToTypPaliva('DIESEL')).toBe('diesel');
  });

  // Electric via fuel string
  it('should return "elektro" for "ELEKTRICKÝ POHON"', () => {
    expect(mapPalivoToTypPaliva('ELEKTRICKÝ POHON')).toBe('elektro');
  });

  // CNG
  it('should return "cng" for "CNG"', () => {
    expect(mapPalivoToTypPaliva('CNG')).toBe('cng');
  });

  // LPG
  it('should return "lpg" for "LPG"', () => {
    expect(mapPalivoToTypPaliva('LPG')).toBe('lpg');
  });

  // Null/undefined/empty handling
  it('should return null for null palivo', () => {
    expect(mapPalivoToTypPaliva(null)).toBeNull();
  });

  it('should return null for undefined palivo', () => {
    expect(mapPalivoToTypPaliva(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(mapPalivoToTypPaliva('')).toBeNull();
  });

  // Unknown fuel type
  it('should return null for unknown fuel type', () => {
    expect(mapPalivoToTypPaliva('VODÍK')).toBeNull();
  });

  it('should return null for arbitrary string', () => {
    expect(mapPalivoToTypPaliva('XYZ123')).toBeNull();
  });

  // Electric flag overrides fuel string even when fuel is diesel
  it('electric flag should override diesel fuel string', () => {
    expect(mapPalivoToTypPaliva('NM', 'ANO')).toBe('elektro');
  });
});

// =============================================================================
// parseRsvDate
// =============================================================================

describe('parseRsvDate', () => {
  // Valid ISO date strings
  it('should parse ISO datetime to YYYY-MM-DD', () => {
    expect(parseRsvDate('2025-06-15T00:00:00')).toBe('2025-06-15');
  });

  it('should parse ISO datetime with timezone', () => {
    expect(parseRsvDate('2024-01-31T12:30:00Z')).toBe('2024-01-31');
  });

  it('should parse ISO datetime with offset', () => {
    expect(parseRsvDate('2023-12-01T08:00:00+01:00')).toBe('2023-12-01');
  });

  it('should parse date-only string', () => {
    expect(parseRsvDate('2026-03-20')).toBe('2026-03-20');
  });

  // Null/undefined handling
  it('should return null for null input', () => {
    expect(parseRsvDate(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseRsvDate(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseRsvDate('')).toBeNull();
  });

  // Invalid date strings
  it('should return null for invalid date string', () => {
    expect(parseRsvDate('not-a-date')).toBeNull();
  });

  it('should return null for "Invalid Date" producing strings', () => {
    expect(parseRsvDate('abc123')).toBeNull();
  });

  // Edge cases
  it('should handle date at year boundary', () => {
    expect(parseRsvDate('2025-01-01T00:00:00')).toBe('2025-01-01');
  });

  it('should handle leap year date', () => {
    expect(parseRsvDate('2024-02-29T00:00:00')).toBe('2024-02-29');
  });
});
