import { describe, it, expect } from 'vitest';
import { formatValue, parseMultilineValue, parseDalsiZaznamy } from '../RsvDataGrid';

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

describe('RsvDataGrid: parseMultilineValue', () => {
  it('should split semicolon-newline separated values', () => {
    const input = 'Value 1;\nValue 2;\nValue 3';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['Value 1', 'Value 2', 'Value 3']);
  });

  it('should handle trailing semicolon', () => {
    const input = 'Value 1;\nValue 2;';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['Value 1', 'Value 2']);
  });

  it('should filter out empty lines', () => {
    const input = 'Value 1;\n;\nValue 2;\n';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['Value 1', 'Value 2']);
  });

  it('should filter out "/" placeholder', () => {
    const input = 'Value 1;\n/;\nValue 2';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['Value 1', 'Value 2']);
  });

  it('should trim whitespace from each value', () => {
    const input = '  Value 1  ;\n  Value 2  ';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['Value 1', 'Value 2']);
  });

  it('should return empty array for empty string', () => {
    expect(parseMultilineValue('')).toEqual([]);
  });

  it('should handle single value without semicolon', () => {
    const result = parseMultilineValue('Single Value');
    expect(result).toEqual(['Single Value']);
  });

  it('should handle real RSV tire data', () => {
    const input = '*N.1/N.2|245/45 R 19 102 V;\n*O.1/O.2|245/45 R 19 102 V';
    const result = parseMultilineValue(input);
    expect(result).toEqual(['*N.1/N.2|245/45 R 19 102 V', '*O.1/O.2|245/45 R 19 102 V']);
  });
});

describe('RsvDataGrid: parseDalsiZaznamy', () => {
  it('should parse pipe-separated records', () => {
    const input = 'Rozchod: 1570-1620 mm | Hmotnost: 2000 kg';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual(['Rozchod: 1570-1620 mm', 'Hmotnost: 2000 kg']);
  });

  it('should handle records with *X.N: pattern', () => {
    const input = '*F.2: hodnota1 | *U.1: hodnota2';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual(['*F.2: hodnota1', '*U.1: hodnota2']);
  });

  it('should join pipe-separated fragments within values', () => {
    const input = '*N.1/N.2|245/45 R 19 102 V | *O.1/O.2|245/45 R 19 102 V';
    const result = parseDalsiZaznamy(input);
    // Internal pipes become spaces since fragments are joined
    expect(result).toEqual(['*N.1/N.2 245/45 R 19 102 V', '*O.1/O.2 245/45 R 19 102 V']);
  });

  it('should handle Czech characters in keys', () => {
    const input = 'Variabilní provedení: Ano | Rozchod: 1570 mm';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual(['Variabilní provedení: Ano', 'Rozchod: 1570 mm']);
  });

  it('should return empty array for null', () => {
    expect(parseDalsiZaznamy(null as unknown as string)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(parseDalsiZaznamy('')).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    expect(parseDalsiZaznamy('   ')).toEqual([]);
  });

  it('should handle single record without pipe', () => {
    const result = parseDalsiZaznamy('Rozchod: 1570 mm');
    expect(result).toEqual(['Rozchod: 1570 mm']);
  });

  it('should filter out empty fragments', () => {
    const input = 'Rozchod: 1570 mm | | Hmotnost: 2000 kg';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual(['Rozchod: 1570 mm', 'Hmotnost: 2000 kg']);
  });

  it('should handle complex real-world RSV data', () => {
    const input = 'Rozchod: 1570-1620 mm | *F.2: 2510-2590 kg | *N.1/N.2|245/45 R 19 102 V | Variabilní provedení: Ano';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual([
      'Rozchod: 1570-1620 mm',
      '*F.2: 2510-2590 kg',
      '*N.1/N.2 245/45 R 19 102 V',
      'Variabilní provedení: Ano',
    ]);
  });

  it('should handle multi-word keys before colon', () => {
    const input = 'Multi Word Key: value | Another Key: value2';
    const result = parseDalsiZaznamy(input);
    expect(result).toEqual(['Multi Word Key: value', 'Another Key: value2']);
  });
});
