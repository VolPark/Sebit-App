import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncDocumentCurrency } from '@/lib/currency-sync';
import { supabase } from '@/lib/supabase';
import { getExchangeRate } from '@/lib/currency';

// ---- Mocks ----

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('@/lib/currency', () => ({
    getExchangeRate: vi.fn(),
}));

const mockedFrom = vi.mocked(supabase.from);
const mockedGetExchangeRate = vi.mocked(getExchangeRate);

// Helper: build a chainable mock that records calls and resolves with the
// given result at the terminal method (.single() or the last .eq()).
//
// The Supabase query builder uses a fluent API:
//   supabase.from('t').select('...').eq('col', val).single()   -- fetch
//   supabase.from('t').update({...}).eq('col', val)             -- update
//   supabase.from('t').select('...').eq('col', val)             -- list
//
// We need to track which table + operation was called so assertions can
// inspect the right call.

interface CallRecord {
    table: string;
    operation: 'select' | 'update';
    selectColumns?: string;
    updatePayload?: Record<string, unknown>;
    eqCalls: Array<{ column: string; value: unknown }>;
    resolvedValue: unknown;
}

let callLog: CallRecord[] = [];

function createChain(record: CallRecord) {
    const chain: Record<string, unknown> = {};

    chain.select = vi.fn((columns?: string) => {
        record.operation = 'select';
        record.selectColumns = columns;
        return chain;
    });

    chain.update = vi.fn((payload: Record<string, unknown>) => {
        record.operation = 'update';
        record.updatePayload = payload;
        return chain;
    });

    chain.eq = vi.fn((_col: string, _val: unknown) => {
        record.eqCalls.push({ column: _col, value: _val });
        return chain;
    });

    chain.single = vi.fn(() => {
        return Promise.resolve(record.resolvedValue);
    });

    // When the chain is awaited without .single() (e.g. update().eq()), the
    // runtime calls .then() on the returned object. We make the chain
    // thenable so it resolves to the recorded value.
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        return Promise.resolve(record.resolvedValue).then(resolve, reject);
    };

    return chain;
}

// Configure what each successive .from() call returns.
let fromResponses: Array<{ resolvedValue: unknown }> = [];

function setupFromResponses(responses: Array<{ resolvedValue: unknown }>) {
    fromResponses = [...responses];
    callLog = [];
    let callIndex = 0;

    mockedFrom.mockImplementation((table: string) => {
        const resp = fromResponses[callIndex] ?? { resolvedValue: { data: null, error: null } };
        callIndex++;
        const record: CallRecord = {
            table,
            operation: 'select',
            eqCalls: [],
            resolvedValue: resp.resolvedValue,
        };
        callLog.push(record);
        return createChain(record) as ReturnType<typeof supabase.from>;
    });
}

// ---- Tests ----

beforeEach(() => {
    vi.clearAllMocks();
    callLog = [];
    fromResponses = [];
});

describe('syncDocumentCurrency', () => {
    // ---------------------------------------------------------------
    // 1. Missing document (error from DB) -> returns early, no updates
    // ---------------------------------------------------------------
    it('returns early when the document fetch returns an error', async () => {
        setupFromResponses([
            { resolvedValue: { data: null, error: { message: 'not found' } } },
        ]);

        await syncDocumentCurrency(999);

        // Only one .from() call (the initial fetch), no update calls
        expect(callLog).toHaveLength(1);
        expect(callLog[0].table).toBe('accounting_documents');
        expect(mockedGetExchangeRate).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // 2. CZK document -> amount_czk = amount, exchange_rate = 1
    // ---------------------------------------------------------------
    it('sets amount_czk equal to amount and exchange_rate to 1 for CZK documents', async () => {
        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 1, issue_date: '2025-01-15', currency: 'CZK', amount: 5000 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings (empty)
            { resolvedValue: { data: [], error: null } },
        ]);

        await syncDocumentCurrency(1);

        // Document update (second from() call)
        expect(callLog[1].table).toBe('accounting_documents');
        expect(callLog[1].updatePayload).toEqual({ amount_czk: 5000, exchange_rate: 1 });

        // getExchangeRate should NOT be called for CZK
        expect(mockedGetExchangeRate).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // 3. Foreign currency (EUR) with rate 25
    // ---------------------------------------------------------------
    it('calculates amount_czk using the exchange rate for foreign currency', async () => {
        mockedGetExchangeRate.mockResolvedValue(25);

        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 2, issue_date: '2025-03-10', currency: 'EUR', amount: 1000 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings (empty)
            { resolvedValue: { data: [], error: null } },
        ]);

        await syncDocumentCurrency(2);

        expect(mockedGetExchangeRate).toHaveBeenCalledWith('2025-03-10', 'EUR');
        expect(callLog[1].table).toBe('accounting_documents');
        expect(callLog[1].updatePayload).toEqual({ amount_czk: 25000, exchange_rate: 25 });
    });

    // ---------------------------------------------------------------
    // 4. Exchange rate returns 0 -> returns early, no document update
    // ---------------------------------------------------------------
    it('returns early when getExchangeRate returns 0', async () => {
        mockedGetExchangeRate.mockResolvedValue(0);

        setupFromResponses([
            {
                resolvedValue: {
                    data: { id: 3, issue_date: '2025-06-01', currency: 'USD', amount: 200 },
                    error: null,
                },
            },
        ]);

        await syncDocumentCurrency(3);

        // Only the initial fetch; no update or mapping calls
        expect(callLog).toHaveLength(1);
        expect(mockedGetExchangeRate).toHaveBeenCalledWith('2025-06-01', 'USD');
    });

    // ---------------------------------------------------------------
    // 5. CZK document with mappings -> each mapping amount_czk = amount * 1
    // ---------------------------------------------------------------
    it('updates each mapping with amount_czk = amount * 1 for CZK documents', async () => {
        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 4, issue_date: '2025-02-20', currency: 'CZK', amount: 3000 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings
            {
                resolvedValue: {
                    data: [
                        { id: 10, amount: 1500 },
                        { id: 11, amount: 1500 },
                    ],
                    error: null,
                },
            },
            // update mapping 10
            { resolvedValue: { data: null, error: null } },
            // update mapping 11
            { resolvedValue: { data: null, error: null } },
        ]);

        await syncDocumentCurrency(4);

        // mapping update calls (indices 3 and 4)
        expect(callLog[3].table).toBe('accounting_mappings');
        expect(callLog[3].updatePayload).toEqual({ amount_czk: 1500 });
        expect(callLog[3].eqCalls).toContainEqual({ column: 'id', value: 10 });

        expect(callLog[4].table).toBe('accounting_mappings');
        expect(callLog[4].updatePayload).toEqual({ amount_czk: 1500 });
        expect(callLog[4].eqCalls).toContainEqual({ column: 'id', value: 11 });
    });

    // ---------------------------------------------------------------
    // 6. Foreign currency with multiple mappings
    // ---------------------------------------------------------------
    it('updates multiple mappings with correct amount_czk for foreign currency', async () => {
        mockedGetExchangeRate.mockResolvedValue(24.5);

        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 5, issue_date: '2025-04-15', currency: 'EUR', amount: 2000 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings
            {
                resolvedValue: {
                    data: [
                        { id: 20, amount: 800 },
                        { id: 21, amount: 700 },
                        { id: 22, amount: 500 },
                    ],
                    error: null,
                },
            },
            // update mapping 20
            { resolvedValue: { data: null, error: null } },
            // update mapping 21
            { resolvedValue: { data: null, error: null } },
            // update mapping 22
            { resolvedValue: { data: null, error: null } },
        ]);

        await syncDocumentCurrency(5);

        // Document update
        expect(callLog[1].updatePayload).toEqual({ amount_czk: 49000, exchange_rate: 24.5 });

        // Mapping updates
        expect(callLog[3].updatePayload).toEqual({ amount_czk: 800 * 24.5 });
        expect(callLog[4].updatePayload).toEqual({ amount_czk: 700 * 24.5 });
        expect(callLog[5].updatePayload).toEqual({ amount_czk: 500 * 24.5 });
    });

    // ---------------------------------------------------------------
    // 7. No mappings exist -> document is updated, no mapping updates
    // ---------------------------------------------------------------
    it('does not attempt mapping updates when no mappings exist', async () => {
        mockedGetExchangeRate.mockResolvedValue(23);

        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 6, issue_date: '2025-05-01', currency: 'GBP', amount: 100 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings (empty)
            { resolvedValue: { data: [], error: null } },
        ]);

        await syncDocumentCurrency(6);

        // 3 calls total: fetch doc, update doc, fetch mappings (no mapping updates)
        expect(callLog).toHaveLength(3);
        expect(callLog[1].updatePayload).toEqual({ amount_czk: 2300, exchange_rate: 23 });
        expect(callLog[2].table).toBe('accounting_mappings');
        expect(callLog[2].operation).toBe('select');
    });

    // ---------------------------------------------------------------
    // 8. Verify correct supabase call chain (from, select, eq, update)
    // ---------------------------------------------------------------
    it('calls supabase with the correct table names, columns, and eq filters', async () => {
        mockedGetExchangeRate.mockResolvedValue(26);

        setupFromResponses([
            // fetch doc
            {
                resolvedValue: {
                    data: { id: 7, issue_date: '2025-07-01', currency: 'EUR', amount: 500 },
                    error: null,
                },
            },
            // update document
            { resolvedValue: { data: null, error: null } },
            // fetch mappings
            {
                resolvedValue: {
                    data: [{ id: 30, amount: 500 }],
                    error: null,
                },
            },
            // update mapping 30
            { resolvedValue: { data: null, error: null } },
        ]);

        await syncDocumentCurrency(7);

        // Call 0: SELECT on accounting_documents with eq('id', 7)
        expect(callLog[0].table).toBe('accounting_documents');
        expect(callLog[0].operation).toBe('select');
        expect(callLog[0].selectColumns).toBe('id, issue_date, currency, amount');
        expect(callLog[0].eqCalls).toContainEqual({ column: 'id', value: 7 });

        // Call 1: UPDATE on accounting_documents with eq('id', 7)
        expect(callLog[1].table).toBe('accounting_documents');
        expect(callLog[1].operation).toBe('update');
        expect(callLog[1].updatePayload).toEqual({ amount_czk: 13000, exchange_rate: 26 });
        expect(callLog[1].eqCalls).toContainEqual({ column: 'id', value: 7 });

        // Call 2: SELECT on accounting_mappings with eq('document_id', 7)
        expect(callLog[2].table).toBe('accounting_mappings');
        expect(callLog[2].operation).toBe('select');
        expect(callLog[2].selectColumns).toBe('id, amount');
        expect(callLog[2].eqCalls).toContainEqual({ column: 'document_id', value: 7 });

        // Call 3: UPDATE on accounting_mappings with eq('id', 30)
        expect(callLog[3].table).toBe('accounting_mappings');
        expect(callLog[3].operation).toBe('update');
        expect(callLog[3].updatePayload).toEqual({ amount_czk: 13000 });
        expect(callLog[3].eqCalls).toContainEqual({ column: 'id', value: 30 });
    });
});
