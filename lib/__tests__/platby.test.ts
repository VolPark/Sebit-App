import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn()
    }
}));

import { insertPayment, getPaymentsByMonth, Platba } from '../platby';
import { supabase } from '@/lib/supabase';

describe('Platby', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('insertPayment', () => {
        it('should insert payment with all fields', async () => {
            const mockResult = { data: [{ id: 1 }], error: null };
            vi.mocked(supabase.from).mockReturnValue({
                insert: vi.fn().mockReturnValue(mockResult)
            } as any);

            const payment: Platba = {
                dodavatel_id: 5,
                mesic: '2024-01-01',
                hodiny: 160,
                sazba: 300,
                castka: 48000,
                zaplaceno: false
            };

            await insertPayment(payment);

            expect(supabase.from).toHaveBeenCalledWith('platby');
        });

        it('should default zaplaceno to true when not provided', async () => {
            const insertFn = vi.fn().mockReturnValue({ data: null, error: null });
            vi.mocked(supabase.from).mockReturnValue({
                insert: insertFn
            } as any);

            const payment: Platba = {
                dodavatel_id: 5,
                mesic: '2024-01-01',
                hodiny: 160,
                sazba: 300,
                castka: 48000
            };

            await insertPayment(payment);

            expect(insertFn).toHaveBeenCalledWith([
                expect.objectContaining({ zaplaceno: true })
            ]);
        });

        it('should pass zaplaceno=false when explicitly set', async () => {
            const insertFn = vi.fn().mockReturnValue({ data: null, error: null });
            vi.mocked(supabase.from).mockReturnValue({
                insert: insertFn
            } as any);

            const payment: Platba = {
                dodavatel_id: 5,
                mesic: '2024-01-01',
                hodiny: 160,
                sazba: 300,
                castka: 48000,
                zaplaceno: false
            };

            await insertPayment(payment);

            expect(insertFn).toHaveBeenCalledWith([
                expect.objectContaining({ zaplaceno: false })
            ]);
        });
    });

    describe('getPaymentsByMonth', () => {
        it('should calculate correct date range for a given month', async () => {
            const orderFn = vi.fn().mockReturnValue({ data: [], error: null });
            const lteFn = vi.fn().mockReturnValue({ order: orderFn });
            const gteFn = vi.fn().mockReturnValue({ lte: lteFn });
            const selectFn = vi.fn().mockReturnValue({ gte: gteFn });
            vi.mocked(supabase.from).mockReturnValue({
                select: selectFn
            } as any);

            await getPaymentsByMonth('2024-01');

            expect(supabase.from).toHaveBeenCalledWith('platby');
            expect(selectFn).toHaveBeenCalledWith('*');
            expect(gteFn).toHaveBeenCalledWith('mesic', '2024-01-01');
            expect(lteFn).toHaveBeenCalledWith('mesic', '2024-01-31');
        });

        it('should handle February correctly', async () => {
            const orderFn = vi.fn().mockReturnValue({ data: [], error: null });
            const lteFn = vi.fn().mockReturnValue({ order: orderFn });
            const gteFn = vi.fn().mockReturnValue({ lte: lteFn });
            const selectFn = vi.fn().mockReturnValue({ gte: gteFn });
            vi.mocked(supabase.from).mockReturnValue({
                select: selectFn
            } as any);

            await getPaymentsByMonth('2024-02');

            expect(gteFn).toHaveBeenCalledWith('mesic', '2024-02-01');
            expect(lteFn).toHaveBeenCalledWith('mesic', '2024-02-29'); // 2024 is leap year
        });

        it('should handle December correctly', async () => {
            const orderFn = vi.fn().mockReturnValue({ data: [], error: null });
            const lteFn = vi.fn().mockReturnValue({ order: orderFn });
            const gteFn = vi.fn().mockReturnValue({ lte: lteFn });
            const selectFn = vi.fn().mockReturnValue({ gte: gteFn });
            vi.mocked(supabase.from).mockReturnValue({
                select: selectFn
            } as any);

            await getPaymentsByMonth('2024-12');

            expect(gteFn).toHaveBeenCalledWith('mesic', '2024-12-01');
            expect(lteFn).toHaveBeenCalledWith('mesic', '2024-12-31');
        });

        it('should order by mesic ascending', async () => {
            const orderFn = vi.fn().mockReturnValue({ data: [], error: null });
            const lteFn = vi.fn().mockReturnValue({ order: orderFn });
            const gteFn = vi.fn().mockReturnValue({ lte: lteFn });
            const selectFn = vi.fn().mockReturnValue({ gte: gteFn });
            vi.mocked(supabase.from).mockReturnValue({
                select: selectFn
            } as any);

            await getPaymentsByMonth('2024-06');

            expect(orderFn).toHaveBeenCalledWith('mesic', { ascending: true });
        });
    });
});
