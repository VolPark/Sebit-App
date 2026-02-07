import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Supabase mock setup ----

const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
const mockSingle = vi.fn()
const mockEqChain = {
    eq: vi.fn(),
    single: mockSingle,
    upsert: mockUpsert,
}
// Each .eq() call returns the chain so they can be chained
mockEqChain.eq.mockReturnValue(mockEqChain)

const mockSelect = vi.fn().mockReturnValue(mockEqChain)
const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'currency_rates') {
        return {
            select: mockSelect,
            upsert: mockUpsert,
        }
    }
    return { select: mockSelect, upsert: mockUpsert }
})

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        currency: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
    },
}))

// ---- Fetch mock ----

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---- Sample CNB response ----

const SAMPLE_CNB_RESPONSE = [
    '06.02.2024 #026',
    'zem\u011b|m\u011bna|mno\u017estv\u00ed|k\u00f3d|kurz',
    'Austr\u00e1lie|dolar|1|AUD|15,055',
    'EMU|euro|1|EUR|24,810',
    'Japonsko|jen|100|JPY|15,234',
    'USA|dolar|1|USD|22,567',
].join('\n')

// ---- Import module under test (after mocks) ----

import { getExchangeRate } from '../currency'

describe('currency - getExchangeRate', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default: cache miss
        mockSingle.mockResolvedValue({ data: null, error: null })
        // Default: fetch returns sample CNB data
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => SAMPLE_CNB_RESPONSE,
        })
    })

    // ------------------------------------------------------------------
    // 1. CZK returns 1 immediately
    // ------------------------------------------------------------------
    it('returns 1 immediately for CZK without calling DB or fetch', async () => {
        const rate = await getExchangeRate('2024-02-06', 'CZK')

        expect(rate).toBe(1)
        expect(mockFrom).not.toHaveBeenCalled()
        expect(mockFetch).not.toHaveBeenCalled()
    })

    // ------------------------------------------------------------------
    // 2. Cache hit - returns cached rate from DB
    // ------------------------------------------------------------------
    it('returns cached rate from database when available', async () => {
        mockSingle.mockResolvedValue({ data: { rate: 24.81 }, error: null })

        const rate = await getExchangeRate('2024-02-06', 'EUR')

        expect(rate).toBe(24.81)
        expect(mockFrom).toHaveBeenCalledWith('currency_rates')
        expect(mockFetch).not.toHaveBeenCalled()
    })

    // ------------------------------------------------------------------
    // 3. Cache miss - fetches from CNB and returns correct unit rate
    // ------------------------------------------------------------------
    it('fetches from CNB on cache miss and returns unit rate', async () => {
        const rate = await getExchangeRate('2024-02-06', 'EUR')

        expect(rate).toBe(24.81)
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('date=06.02.2024')
        )
    })

    // ------------------------------------------------------------------
    // 4. CNB response parsing - AUD with amount=1
    // ------------------------------------------------------------------
    it('parses AUD correctly from CNB response (amount=1)', async () => {
        const rate = await getExchangeRate('2024-02-06', 'AUD')

        expect(rate).toBe(15.055)
    })

    // ------------------------------------------------------------------
    // 5. Unit rate calculation - JPY (amount=100)
    // ------------------------------------------------------------------
    it('calculates unit rate correctly for JPY (amount=100, rate=15.234)', async () => {
        const rate = await getExchangeRate('2024-02-06', 'JPY')

        // 15.234 / 100 = 0.15234
        expect(rate).toBeCloseTo(0.15234, 5)
    })

    // ------------------------------------------------------------------
    // 6. Unit rate calculation - EUR (amount=1)
    // ------------------------------------------------------------------
    it('calculates unit rate correctly for EUR (amount=1, rate=24.810)', async () => {
        const rate = await getExchangeRate('2024-02-06', 'EUR')

        // 24.810 / 1 = 24.810
        expect(rate).toBe(24.81)
    })

    // ------------------------------------------------------------------
    // 7. Upserts rate to currency_rates table after successful fetch
    // ------------------------------------------------------------------
    it('upserts the calculated unit rate into currency_rates table', async () => {
        await getExchangeRate('2024-02-06', 'JPY')

        expect(mockUpsert).toHaveBeenCalledWith({
            date: '2024-02-06',
            currency: 'JPY',
            rate: 15.234 / 100,
            amount: 100,
        })
    })

    // ------------------------------------------------------------------
    // 8. Currency not found in CNB list
    // ------------------------------------------------------------------
    it('returns 0 when currency is not found in CNB response', async () => {
        const rate = await getExchangeRate('2024-02-06', 'XYZ')

        expect(rate).toBe(0)
        // Should not upsert anything
        expect(mockUpsert).not.toHaveBeenCalled()
    })

    // ------------------------------------------------------------------
    // 9. Network error (fetch throws)
    // ------------------------------------------------------------------
    it('returns 0 when fetch throws a network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network failure'))

        const rate = await getExchangeRate('2024-02-06', 'EUR')

        expect(rate).toBe(0)
    })

    // ------------------------------------------------------------------
    // 10. Fetch returns non-ok response
    // ------------------------------------------------------------------
    it('returns 0 when fetch returns a non-ok response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        })

        const rate = await getExchangeRate('2024-02-06', 'EUR')

        expect(rate).toBe(0)
    })

    // ------------------------------------------------------------------
    // Bonus: date formatting
    // ------------------------------------------------------------------
    it('formats date correctly for CNB API (DD.MM.YYYY)', async () => {
        await getExchangeRate('2024-12-25', 'EUR')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('date=25.12.2024')
        )
    })
})
