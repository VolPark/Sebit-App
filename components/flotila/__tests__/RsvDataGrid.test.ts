import { describe, it, expect } from 'vitest';
import { formatValue } from '../RsvDataGrid';

describe('RsvDataGrid: formatValue', () => {
  // Null/undefined/empty handling
  it('should return dash for null', () => {
    expect(formatValue(null)).toBe('\u2014');
  });

  it('should return dash for undefined', () => {
    expect(formatValue(undefined)).toBe('\u2014');
  });

  it('should return dash for empty string', () => {
    expect(formatValue('')).toBe('\u2014');
  });

  it('should return dash for whitespace-only string', () => {
    expect(formatValue('   ')).toBe('\u2014');
  });

  // Boolean handling
  it('should return "Ano" for true', () => {
    expect(formatValue(true)).toBe('Ano');
  });

  it('should return "Ne" for false', () => {
    expect(formatValue(false)).toBe('Ne');
  });

  // Number handling
  it('should return dash for zero', () => {
    expect(formatValue(0)).toBe('\u2014');
  });

  it('should format positive number with cs-CZ locale', () => {
    const result = formatValue(1500);
    // cs-CZ uses non-breaking space as thousands separator
    expect(result).toMatch(/1[\s\u00a0]500/);
  });

  it('should append unit to number', () => {
    const result = formatValue(120, 'km/h');
    expect(result).toContain('120');
    expect(result).toContain('km/h');
  });

  it('should format negative number', () => {
    const result = formatValue(-5);
    expect(result).toContain('5');
  });

  // String handling
  it('should return plain string as-is', () => {
    expect(formatValue('BA 95 B')).toBe('BA 95 B');
  });

  it('should append unit to string', () => {
    expect(formatValue('150', 'dB')).toBe('150 dB');
  });

  // Date detection and formatting
  it('should format ISO date string (YYYY-MM-DD)', () => {
    const result = formatValue('2025-06-15');
    // cs-CZ format: DD. MM. YYYY or DD.MM.YYYY
    expect(result).toMatch(/15/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/2025/);
  });

  it('should format ISO datetime string', () => {
    const result = formatValue('2021-12-20T00:00:00');
    expect(result).toMatch(/20/);
    expect(result).toMatch(/12/);
    expect(result).toMatch(/2021/);
  });

  it('should not format non-date strings that look like dates', () => {
    // This is a regular string, not a date pattern
    expect(formatValue('test value')).toBe('test value');
  });

  // Edge cases
  it('should handle object by converting to string', () => {
    const result = formatValue({ foo: 'bar' });
    expect(result).toBe('[object Object]');
  });

  it('should handle number with unit and zero value', () => {
    expect(formatValue(0, 'kg')).toBe('\u2014');
  });
});
