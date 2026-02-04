import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRateUnit, formatRateValue, formatRate } from '../formatting'

describe('formatting', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getRateUnit', () => {
    it('returns hourly rate unit by default', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = 'Kč'

      expect(getRateUnit()).toBe('Kč/h')
    })

    it('returns man-day rate unit when mode is MANDAY', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'MANDAY'
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = 'Kč'

      expect(getRateUnit()).toBe('Kč/MD')
    })

    it('uses default currency when not specified', () => {
      delete process.env.NEXT_PUBLIC_CURRENCY_SYMBOL
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      expect(getRateUnit()).toBe('Kč/h')
    })

    it('works with different currency symbols', () => {
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = '€'
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      expect(getRateUnit()).toBe('€/h')
    })
  })

  describe('formatRateValue', () => {
    it('returns hourly rate unchanged in HOURLY mode', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      expect(formatRateValue(500)).toBe('500')
    })

    it('multiplies hourly rate by 8 in MANDAY mode', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'MANDAY'

      // Czech locale uses non-breaking space (\u00A0) as thousands separator
      expect(formatRateValue(500)).toBe('4\u00A0000') // 500 * 8 = 4000
    })

    it('formats large numbers with thousands separator', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      // Czech locale uses non-breaking space (\u00A0) as thousands separator
      expect(formatRateValue(1500)).toBe('1\u00A0500')
    })

    it('rounds decimal values', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      expect(formatRateValue(499.7)).toBe('500')
    })

    it('handles zero value', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'

      expect(formatRateValue(0)).toBe('0')
    })

    it('defaults to HOURLY mode when not specified', () => {
      delete process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE

      expect(formatRateValue(500)).toBe('500')
    })
  })

  describe('formatRate', () => {
    it('combines value and unit in HOURLY mode', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = 'Kč'

      expect(formatRate(500)).toBe('500 Kč/h')
    })

    it('combines value and unit in MANDAY mode', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'MANDAY'
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = 'Kč'

      // Czech locale uses non-breaking space (\u00A0) as thousands separator
      expect(formatRate(500)).toBe('4\u00A0000 Kč/MD')
    })

    it('formats with euro currency', () => {
      process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE = 'HOURLY'
      process.env.NEXT_PUBLIC_CURRENCY_SYMBOL = '€'

      expect(formatRate(50)).toBe('50 €/h')
    })
  })
})
