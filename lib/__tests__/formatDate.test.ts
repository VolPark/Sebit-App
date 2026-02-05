import { describe, it, expect } from 'vitest'
import { formatDate } from '../formatDate'

describe('formatDate', () => {
  it('returns dash for null value', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns dash for undefined value', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns dash for empty string', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formats ISO date string to dd.mm.yyyy', () => {
    expect(formatDate('2024-01-15')).toBe('15.01.2024')
  })

  it('formats ISO datetime string to dd.mm.yyyy', () => {
    expect(formatDate('2024-06-20T14:30:00Z')).toBe('20.06.2024')
  })

  it('pads single-digit days with leading zero', () => {
    expect(formatDate('2024-03-05')).toBe('05.03.2024')
  })

  it('pads single-digit months with leading zero', () => {
    expect(formatDate('2024-01-15')).toBe('15.01.2024')
  })

  it('returns original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('handles dates at start of year', () => {
    expect(formatDate('2024-01-01')).toBe('01.01.2024')
  })

  it('handles dates at end of year', () => {
    expect(formatDate('2024-12-31')).toBe('31.12.2024')
  })

  it('handles leap year date', () => {
    expect(formatDate('2024-02-29')).toBe('29.02.2024')
  })

  it('handles date with timezone offset', () => {
    // Note: Result may vary based on timezone, but should be valid format
    const result = formatDate('2024-06-15T23:59:59+02:00')
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
  })
})
