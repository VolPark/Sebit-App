import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted by vitest)
// ---------------------------------------------------------------------------

const CHAIN_METHODS = [
    'from', 'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gte', 'lte', 'lt', 'is', 'not', 'in',
    'or', 'order', 'limit', 'range',
];

// vi.hoisted ensures mockChain is available when vi.mock factories run
const { mockChain, resetChain } = vi.hoisted(() => {
    const chain: Record<string, any> = {};
    const methods = [
        'from', 'select', 'insert', 'update', 'upsert', 'delete',
        'eq', 'neq', 'gte', 'lte', 'lt', 'is', 'not', 'in',
        'or', 'order', 'limit', 'range',
    ];

    function reset() {
        methods.forEach(m => { chain[m] = vi.fn(() => chain); });
        chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
    }

    reset();
    return { mockChain: chain, resetChain: reset };
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockChain),
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        accounting: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
        sync: {
            child: vi.fn(() => ({
                info: vi.fn(),
                debug: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            })),
        },
    },
}));

// Import the module AFTER mocks are set up (vi.mock is hoisted)
import { AccountingService } from '../service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockUolClient() {
    return {
        getSalesInvoices: vi.fn(),
        getPurchaseInvoices: vi.fn(),
        getInvoiceDetail: vi.fn(),
        getContactDetail: vi.fn(),
        getBankAccounts: vi.fn(),
        getBankAccountDetail: vi.fn(),
        getBankMovements: vi.fn(),
        getAccountingRecords: vi.fn(),
        getReceivables: vi.fn(),
        getPayables: vi.fn(),
        getContacts: vi.fn(),
    };
}

type MockUolClient = ReturnType<typeof createMockUolClient>;

/** A far-future deadline so tests don't time-out */
const FAR_DEADLINE = Date.now() + 600_000;

/** A deadline already expired */
const EXPIRED_DEADLINE = Date.now() - 1;

function makePaginatedResponse(items: any[], hasNext = false) {
    return {
        items,
        _meta: {
            href: '/v1/test',
            pagination: hasNext
                ? { next: '/v1/test?page=2', first: '/v1/test?page=1', last: '/v1/test?page=2' }
                : { first: '/v1/test?page=1', last: '/v1/test?page=1' },
        },
    };
}

function makeSalesInvoiceItem(overrides: Partial<any> = {}) {
    return {
        invoice_id: 1001,
        variable_symbol: 2025000001,
        issue_date: '2025-06-01',
        due_date: '2025-07-01',
        total_amount: '12100',
        currency: { currency_id: 'CZK' },
        buyer: { _meta: { href: '/v1/contacts/10' } },
        text: 'Faktura za sluzby',
        items: [{ description: 'Polozka 1', total_price: '12100', quantity: '1', unit_price: '12100' }],
        _meta: { href: '/v1/sales_invoices/1001' },
        ...overrides,
    };
}

function makePurchaseInvoiceItem(overrides: Partial<any> = {}) {
    return {
        invoice_id: 2001,
        variable_symbol: 2025100001,
        issue_date: '2025-05-15',
        due_date: '2025-06-15',
        total_amount: '24200',
        currency: { currency_id: 'CZK' },
        seller: { _meta: { href: '/v1/contacts/20' } },
        description: 'Nakup materialu',
        items: [{ description: 'Material', total_price: '24200' }],
        _meta: { href: '/v1/purchase_invoices/2001' },
        ...overrides,
    };
}

function makeInvoiceDetail(overrides: Partial<any> = {}) {
    return {
        invoice_id: 1001,
        variable_symbol: 2025000001,
        total_amount: '12100',
        vat1_amount: '2100',
        vat2_amount: '0',
        vat3_amount: '0',
        issue_date: '2025-06-01',
        due_date: '2025-07-01',
        tax_payment_date: '2025-06-01',
        currency: { currency_id: 'CZK' },
        status: 'issued',
        description: 'Sluzby za cerven',
        type: 'standard',
        buyer: { _meta: { href: '/v1/contacts/10' } },
        seller: null,
        items: [{ description: 'Polozka 1' }],
        ...overrides,
    };
}

function makeContactDetail(overrides: Partial<any> = {}) {
    return {
        name: 'Firma s.r.o.',
        company_number: '12345678',
        vatin: 'CZ12345678',
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountingService', () => {
    let service: any;
    let mockUol: MockUolClient;

    beforeEach(() => {
        vi.clearAllMocks();
        resetChain();
        mockUol = createMockUolClient();
        service = new AccountingService(mockUol as any, 1);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ===================================================================
    // init()
    // ===================================================================
    describe('init()', () => {
        it('creates service when provider config is complete', async () => {
            mockChain.single.mockResolvedValueOnce({
                data: {
                    id: 42,
                    code: 'uol',
                    config: { baseUrl: 'https://api.uol.cz', email: 'a@b.cz', apiKey: 'key123' },
                },
                error: null,
            });

            const svc = await AccountingService.init();
            expect(svc).toBeDefined();
            expect(mockChain.from).toHaveBeenCalledWith('accounting_providers');
            expect(mockChain.eq).toHaveBeenCalledWith('code', 'uol');
        });

        it('throws when provider not found', async () => {
            mockChain.single.mockResolvedValueOnce({ data: null, error: null });

            await expect(AccountingService.init('uol')).rejects.toThrow('Provider uol not configured');
        });

        it('throws when config is missing required fields', async () => {
            mockChain.single.mockResolvedValueOnce({
                data: { id: 1, code: 'uol', config: { baseUrl: 'https://x' } },
                error: null,
            });

            await expect(AccountingService.init()).rejects.toThrow('Incomplete provider configuration');
        });

        it('uses default code "uol"', async () => {
            mockChain.single.mockResolvedValueOnce({ data: null, error: null });

            await expect(AccountingService.init()).rejects.toThrow();
            expect(mockChain.eq).toHaveBeenCalledWith('code', 'uol');
        });
    });

    // ===================================================================
    // startLog() / completeLog()
    // ===================================================================
    describe('startLog() / completeLog()', () => {
        it('inserts sync log and returns id', async () => {
            mockChain.single.mockResolvedValueOnce({ data: { id: 99 }, error: null });

            const id = await (service as any).startLog();
            expect(id).toBe(99);
            expect(mockChain.from).toHaveBeenCalledWith('accounting_sync_logs');
            expect(mockChain.insert).toHaveBeenCalledWith(
                expect.objectContaining({ provider_id: 1, status: 'running' })
            );
        });

        it('completeLog updates status and ended_at', async () => {
            await (service as any).completeLog(99, 'success', undefined);

            expect(mockChain.from).toHaveBeenCalledWith('accounting_sync_logs');
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'success', error_message: undefined })
            );
            expect(mockChain.eq).toHaveBeenCalledWith('id', 99);
        });

        it('startLog throws if insert fails', async () => {
            mockChain.single.mockResolvedValueOnce({
                data: null,
                error: { code: '42501', message: 'permission denied' },
            });

            await expect((service as any).startLog()).rejects.toEqual(
                expect.objectContaining({ code: '42501' })
            );
        });
    });

    // ===================================================================
    // syncAll()
    // ===================================================================
    describe('syncAll()', () => {
        function stubHappyPath() {
            // startLog
            mockChain.single.mockResolvedValueOnce({ data: { id: 1 }, error: null });

            // syncContacts
            mockUol.getContacts.mockResolvedValue(makePaginatedResponse([]));

            // syncSalesInvoices
            mockUol.getSalesInvoices.mockResolvedValue(makePaginatedResponse([]));

            // syncPurchaseInvoices
            mockUol.getPurchaseInvoices.mockResolvedValue(makePaginatedResponse([]));

            // syncBankMovements
            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse([]));

            // linkInvoices + payables + others - generic chain responses
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

            // syncAccountingJournal
            mockUol.getAccountingRecords.mockResolvedValue(makePaginatedResponse([]));

            // syncReceivables
            mockUol.getReceivables.mockResolvedValue(makePaginatedResponse([]));
        }

        it('calls sync methods and returns stats', async () => {
            stubHappyPath();

            const result = await service.syncAll();

            expect(result).toEqual(expect.objectContaining({
                sales: 0,
                purchase: 0,
                movements: 0,
                journal: 0,
                accounts: 0,
                receivables: 0,
                payables: 0,
                partial: false,
            }));
        });

        it('sets partial=true when deadline exceeded', async () => {
            stubHappyPath();

            const realNow = Date.now;
            let callCount = 0;
            vi.spyOn(Date, 'now').mockImplementation(() => {
                callCount++;
                if (callCount > 5) return realNow() + 300_000;
                return realNow();
            });

            const result = await service.syncAll();
            expect(result.partial).toBe(true);
        });

        it('calls completeLog with "error" on failure', async () => {
            // startLog succeeds
            mockChain.single.mockResolvedValueOnce({ data: { id: 7 }, error: null });

            // syncContacts throws
            mockUol.getContacts.mockRejectedValue(new Error('Network failure'));

            await expect(service.syncAll()).rejects.toThrow('Network failure');

            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'error', error_message: 'Network failure' })
            );
        });

        it('returns correct counts from sub-syncs', async () => {
            // startLog
            mockChain.single.mockResolvedValueOnce({ data: { id: 1 }, error: null });

            // syncContacts - 2 contacts
            const contacts = [
                { contact_id: '1', name: 'A', company_number: '111', vatin: 'CZ111' },
                { contact_id: '2', name: 'B', company_number: '222', vatin: 'CZ222' },
            ];
            mockUol.getContacts.mockResolvedValueOnce(makePaginatedResponse(contacts, false));

            // chain.then for upsert returns success
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

            // syncSalesInvoices - 1 item
            const salesItem = makeSalesInvoiceItem();
            mockUol.getSalesInvoices.mockResolvedValueOnce(makePaginatedResponse([salesItem], false));
            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());

            // For upsertDocument's single() call (check existence) - not found
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

            // syncPurchaseInvoices - empty
            mockUol.getPurchaseInvoices.mockResolvedValue(makePaginatedResponse([]));

            // syncBankMovements - empty
            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse([]));

            // syncAccountingJournal - empty
            mockUol.getAccountingRecords.mockResolvedValue(makePaginatedResponse([]));

            // syncReceivables - empty
            mockUol.getReceivables.mockResolvedValue(makePaginatedResponse([]));

            const result = await service.syncAll();
            expect(result.sales).toBe(1);
            expect(result.purchase).toBe(0);
            expect(result.movements).toBe(0);
        });

        it('skips later stages when deadline passed', async () => {
            stubHappyPath();

            const realNow = Date.now;
            let callCount = 0;
            vi.spyOn(Date, 'now').mockImplementation(() => {
                callCount++;
                if (callCount > 15) return realNow() + 300_000;
                return realNow();
            });

            const result = await service.syncAll();
            expect(result.partial).toBe(true);
            expect(result.journal).toBe(0);
            expect(result.receivables).toBe(0);
            expect(result.payables).toBe(0);
        });
    });

    // ===================================================================
    // syncSalesInvoices()
    // ===================================================================
    describe('syncSalesInvoices()', () => {
        it('processes items and calls upsertDocument for each', async () => {
            const item1 = makeSalesInvoiceItem({ invoice_id: 1 });
            const item2 = makeSalesInvoiceItem({ invoice_id: 2 });

            mockUol.getSalesInvoices.mockResolvedValueOnce(
                makePaginatedResponse([item1, item2], false)
            );
            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await (service as any).syncSalesInvoices(FAR_DEADLINE);
            expect(count).toBe(2);
            expect(mockUol.getInvoiceDetail).toHaveBeenCalledTimes(2);
        });

        it('stops on deadline exceeded', async () => {
            mockUol.getSalesInvoices.mockResolvedValue(
                makePaginatedResponse([makeSalesInvoiceItem()], true)
            );

            const count = await (service as any).syncSalesInvoices(EXPIRED_DEADLINE);
            expect(count).toBe(0);
        });

        it('returns total count across pages', async () => {
            mockUol.getSalesInvoices
                .mockResolvedValueOnce(makePaginatedResponse([makeSalesInvoiceItem({ invoice_id: 1 })], true))
                .mockResolvedValueOnce(makePaginatedResponse([makeSalesInvoiceItem({ invoice_id: 2 }), makeSalesInvoiceItem({ invoice_id: 3 })], false));

            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await (service as any).syncSalesInvoices(FAR_DEADLINE);
            expect(count).toBe(3);
            expect(mockUol.getSalesInvoices).toHaveBeenCalledTimes(2);
        });

        it('handles empty first page', async () => {
            mockUol.getSalesInvoices.mockResolvedValueOnce(makePaginatedResponse([]));

            const count = await (service as any).syncSalesInvoices(FAR_DEADLINE);
            expect(count).toBe(0);
            expect(mockUol.getInvoiceDetail).not.toHaveBeenCalled();
        });
    });

    // ===================================================================
    // syncPurchaseInvoices()
    // ===================================================================
    describe('syncPurchaseInvoices()', () => {
        it('processes items like sales invoices', async () => {
            const item = makePurchaseInvoiceItem();
            mockUol.getPurchaseInvoices.mockResolvedValueOnce(
                makePaginatedResponse([item], false)
            );
            mockUol.getInvoiceDetail.mockResolvedValue(
                makeInvoiceDetail({ seller: { _meta: { href: '/v1/contacts/20' } }, buyer: null })
            );
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail({ name: 'Dodavatel s.r.o.' }));
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await (service as any).syncPurchaseInvoices(FAR_DEADLINE);
            expect(count).toBe(1);
            expect(mockUol.getInvoiceDetail).toHaveBeenCalledWith('/v1/purchase_invoices/2001');
        });

        it('stops on deadline exceeded', async () => {
            mockUol.getPurchaseInvoices.mockResolvedValue(
                makePaginatedResponse([makePurchaseInvoiceItem()], true)
            );

            const count = await (service as any).syncPurchaseInvoices(EXPIRED_DEADLINE);
            expect(count).toBe(0);
        });
    });

    // ===================================================================
    // upsertDocument()
    // ===================================================================
    describe('upsertDocument()', () => {
        it('fetches invoice detail from href', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice');

            expect(mockUol.getInvoiceDetail).toHaveBeenCalledWith('/v1/sales_invoices/1001');
        });

        it('fetches buyer contact for sales_invoice', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(
                makeInvoiceDetail({ buyer: { _meta: { href: '/v1/contacts/10' } } })
            );
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice');

            expect(mockUol.getContactDetail).toHaveBeenCalledWith('/v1/contacts/10');
        });

        it('fetches seller contact for purchase_invoice', async () => {
            const item = makePurchaseInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(
                makeInvoiceDetail({ seller: { _meta: { href: '/v1/contacts/20' } }, buyer: null })
            );
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail({ name: 'Dodavatel' }));
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'purchase_invoice');

            expect(mockUol.getContactDetail).toHaveBeenCalledWith('/v1/contacts/20');
        });

        it('calculates amount without VAT correctly', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(
                makeInvoiceDetail({
                    total_amount: '12100',
                    vat1_amount: '2100',
                    vat2_amount: '0',
                    vat3_amount: '0',
                })
            );
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice');

            // 12100 - 2100 - 0 - 0 = 10000
            expect(mockChain.insert).toHaveBeenCalledWith(
                expect.objectContaining({ amount: 10000 })
            );
        });

        it('negates amount for corrective documents', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(
                makeInvoiceDetail({
                    type: 'corrective',
                    total_amount: '6050',
                    vat1_amount: '1050',
                    vat2_amount: '0',
                    vat3_amount: '0',
                })
            );
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice');

            // (6050 - 1050) * -1 = -5000
            expect(mockChain.insert).toHaveBeenCalledWith(
                expect.objectContaining({ amount: -5000 })
            );
        });

        it('inserts new document when not found in DB', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());
            // PGRST116 = not found
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice');

            expect(mockChain.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider_id: 1,
                    external_id: '1001',
                    type: 'sales_invoice',
                    number: '2025000001',
                    supplier_name: 'Firma s.r.o.',
                    supplier_ico: '12345678',
                    supplier_dic: 'CZ12345678',
                    currency: 'CZK',
                })
            );
        });

        it('skips paid_amount update for manually_paid documents', async () => {
            const item = makeSalesInvoiceItem();
            mockUol.getInvoiceDetail.mockResolvedValue(makeInvoiceDetail());
            mockUol.getContactDetail.mockResolvedValue(makeContactDetail());

            // Document exists AND is manually_paid
            mockChain.single.mockResolvedValue({
                data: { id: 55, manually_paid: true },
                error: null,
            });
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await (service as any).upsertDocument(item, 'sales_invoice', 5000);

            // update should NOT include paid_amount
            const updateCall = mockChain.update.mock.calls[0]?.[0];
            expect(updateCall).toBeDefined();
            expect(updateCall).not.toHaveProperty('paid_amount');
        });
    });

    // ===================================================================
    // syncBankMovements()
    // ===================================================================
    describe('syncBankMovements()', () => {
        const bankAccount = { bank_account_id: 'BA1', name: 'Hlavni ucet' };

        it('iterates over bank accounts', async () => {
            mockUol.getBankAccounts.mockResolvedValue(
                makePaginatedResponse([bankAccount, { bank_account_id: 'BA2', name: 'Druhy' }])
            );
            mockChain.single.mockResolvedValue({ data: null, error: null });
            mockUol.getBankMovements.mockResolvedValue(makePaginatedResponse([]));

            const count = await service.syncBankMovements(FAR_DEADLINE);

            expect(count).toBe(0);
            expect(mockUol.getBankMovements).toHaveBeenCalledTimes(2);
        });

        it('uses last synced date from DB', async () => {
            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse([bankAccount]));
            mockChain.single.mockResolvedValue({ data: { date: '2025-06-01' }, error: null });
            mockUol.getBankMovements.mockResolvedValue(makePaginatedResponse([]));

            await service.syncBankMovements(FAR_DEADLINE);

            expect(mockUol.getBankMovements).toHaveBeenCalledWith('BA1', expect.objectContaining({
                date_from: '2025-06-01',
            }));
        });

        it('upserts movements and returns count', async () => {
            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse([bankAccount]));
            mockChain.single.mockResolvedValue({ data: null, error: null });

            const movement = {
                bank_movement_id: 'M1',
                amount: -5000,
                bank_account_id: 'BA1',
                currency: { currency_id: 'CZK' },
                variable_symbol: '123456',
                note: 'Platba',
                items: [{ date: '2025-06-15', note: 'Detail' }],
            };

            mockUol.getBankMovements.mockResolvedValue(makePaginatedResponse([movement], false));
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await service.syncBankMovements(FAR_DEADLINE);
            expect(count).toBe(1);
            expect(mockChain.upsert).toHaveBeenCalledWith(
                expect.objectContaining({ movement_id: 'M1', amount: -5000 }),
                expect.objectContaining({ onConflict: 'movement_id' })
            );
        });

        it('stops on deadline exceeded', async () => {
            mockUol.getBankAccounts.mockResolvedValue(
                makePaginatedResponse([bankAccount])
            );

            const count = await service.syncBankMovements(EXPIRED_DEADLINE);
            expect(count).toBe(0);
        });
    });

    // ===================================================================
    // syncAccountingJournal()
    // ===================================================================
    describe('syncAccountingJournal()', () => {
        it('syncs from 2025 to current year', async () => {
            mockUol.getAccountingRecords.mockResolvedValue(makePaginatedResponse([]));

            await service.syncAccountingJournal(FAR_DEADLINE);

            const currentYear = new Date().getFullYear();
            const expectedCalls = currentYear - 2025 + 1;
            expect(mockUol.getAccountingRecords).toHaveBeenCalledTimes(expectedCalls);
        });

        it('extracts account from object format', async () => {
            const journalItem = {
                id: 'J1',
                date: '2025-01-15',
                account_md: { chart_of_account_id: '518' },
                account_d: { chart_of_account_id: '321' },
                accounting_amount: '15000',
                text: 'Sluzby',
                doc_number: 'FP-001',
            };

            mockUol.getAccountingRecords
                .mockResolvedValueOnce(makePaginatedResponse([journalItem], false))
                .mockResolvedValue(makePaginatedResponse([]));

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await service.syncAccountingJournal(FAR_DEADLINE);

            expect(mockChain.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        uol_id: 'J1',
                        account_md: '518',
                        account_d: '321',
                        amount: 15000,
                        text: 'Sluzby | DOC:FP-001',
                    }),
                ]),
                expect.objectContaining({ onConflict: 'uol_id' })
            );
        });

        it('upserts journal entries', async () => {
            const items = [
                { id: 'J1', date: '2025-03-01', account_md: '501', account_d: '211', amount: '1000', text: 'Test' },
                { id: 'J2', date: '2025-03-02', account_md: '518', account_d: '321', amount: '2000', text: 'Test2' },
            ];

            mockUol.getAccountingRecords
                .mockResolvedValueOnce(makePaginatedResponse(items, false))
                .mockResolvedValue(makePaginatedResponse([]));

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await service.syncAccountingJournal(FAR_DEADLINE);
            expect(count).toBe(2);
            expect(mockChain.from).toHaveBeenCalledWith('accounting_journal');
        });

        it('deletes stale entries for year', async () => {
            const items = [{ id: 'J1', date: '2025-01-01', account_md: '501', account_d: '211', amount: '100', text: 'Entry' }];

            mockUol.getAccountingRecords
                .mockResolvedValueOnce(makePaginatedResponse(items, false))
                .mockResolvedValue(makePaginatedResponse([]));

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await service.syncAccountingJournal(FAR_DEADLINE);

            expect(mockChain.delete).toHaveBeenCalled();
            expect(mockChain.not).toHaveBeenCalledWith('uol_id', 'in', '(J1)');
        });
    });

    // ===================================================================
    // syncContacts()
    // ===================================================================
    describe('syncContacts()', () => {
        it('paginates through contacts', async () => {
            const page1 = [{ contact_id: '1', name: 'A', company_number: '111', vatin: 'CZ111' }];
            const page2 = [{ contact_id: '2', name: 'B', company_number: '222', vatin: 'CZ222' }];

            mockUol.getContacts
                .mockResolvedValueOnce(makePaginatedResponse(page1, true))
                .mockResolvedValueOnce(makePaginatedResponse(page2, false));

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await service.syncContacts(FAR_DEADLINE);
            expect(count).toBe(2);
            expect(mockUol.getContacts).toHaveBeenCalledTimes(2);
        });

        it('upserts contacts to DB', async () => {
            const contacts = [{
                contact_id: '10',
                name: 'Klient Praha',
                company_number: '99887766',
                vatin: 'CZ99887766',
                addresses: [{ city: 'Praha', street: 'Hlavni 1', postal_code: '11000' }],
                bank_accounts: [{ iban: 'CZ1234567890' }],
            }];

            mockUol.getContacts.mockResolvedValueOnce(makePaginatedResponse(contacts, false));
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            await service.syncContacts(FAR_DEADLINE);

            expect(mockChain.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '10',
                        name: 'Klient Praha',
                        company_number: '99887766',
                        city: 'Praha',
                        account_number: 'CZ1234567890',
                    }),
                ]),
                expect.objectContaining({ onConflict: 'id' })
            );
        });

        it('returns total count', async () => {
            mockUol.getContacts.mockResolvedValueOnce(makePaginatedResponse([], false));

            const count = await service.syncContacts(FAR_DEADLINE);
            expect(count).toBe(0);
        });
    });

    // ===================================================================
    // syncReceivables()
    // ===================================================================
    describe('syncReceivables()', () => {
        it('updates paid_amount on matching documents', async () => {
            const receivables = [
                { invoice_public_id: '2025000001', paid_amount: '12100' },
            ];

            mockUol.getReceivables.mockResolvedValueOnce(makePaginatedResponse(receivables, false));
            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await service.syncReceivables(FAR_DEADLINE);
            expect(count).toBe(1);
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({ paid_amount: 12100 })
            );
            expect(mockChain.eq).toHaveBeenCalledWith('type', 'sales_invoice');
            expect(mockChain.eq).toHaveBeenCalledWith('number', '2025000001');
        });

        it('paginates through pages', async () => {
            mockUol.getReceivables
                .mockResolvedValueOnce(makePaginatedResponse(
                    [{ invoice_public_id: '1', paid_amount: '100' }], true
                ))
                .mockResolvedValueOnce(makePaginatedResponse(
                    [{ invoice_public_id: '2', paid_amount: '200' }], false
                ));

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const count = await service.syncReceivables(FAR_DEADLINE);
            expect(count).toBe(2);
            expect(mockUol.getReceivables).toHaveBeenCalledTimes(2);
        });

        it('breaks on error', async () => {
            mockUol.getReceivables.mockRejectedValueOnce(new Error('API down'));

            const count = await service.syncReceivables(FAR_DEADLINE);
            expect(count).toBe(0);
        });
    });

    // ===================================================================
    // syncPayables()
    // ===================================================================
    describe('syncPayables()', () => {
        function setupPayablesChain(invoices: any[], movements: any[]) {
            let thenCallCount = 0;
            mockChain.then.mockImplementation((resolve: any) => {
                thenCallCount++;
                if (thenCallCount === 1) return resolve({ data: invoices, error: null });
                if (thenCallCount === 2) return resolve({ data: movements, error: null });
                return resolve({ data: null, error: null });
            });
        }

        it('PASS 1: matches via linked_doc_number', async () => {
            const invoices = [
                { id: 1, number: '100', external_id: '5001', amount: 10000, paid_amount: 0, issue_date: '2025-01-01', currency: 'CZK', manually_paid: false },
            ];
            const movements = [
                { id: 101, amount: -10000, variable_symbol: null, date: '2025-01-15', currency: 'CZK', raw_data: { items: [{ linked_doc: { linked_doc_number: '5001' } }] } },
            ];

            setupPayablesChain(invoices, movements);

            const count = await service.syncPayables(FAR_DEADLINE);
            expect(count).toBe(1);
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({ paid_amount: 10000 })
            );
        });

        it('PASS 2: matches via variable_symbol', async () => {
            const invoices = [
                { id: 2, number: '200', external_id: '5002', amount: 5000, paid_amount: 0, issue_date: '2025-02-01', currency: 'CZK', manually_paid: false },
            ];
            const movements = [
                { id: 102, amount: -5000, variable_symbol: '200', date: '2025-02-10', currency: 'CZK', raw_data: {} },
            ];

            setupPayablesChain(invoices, movements);

            const count = await service.syncPayables(FAR_DEADLINE);
            expect(count).toBe(1);
        });

        it('PASS 3: fuzzy matches by amount + date', async () => {
            const invoices = [
                { id: 3, number: '300', external_id: '5003', amount: 7500, paid_amount: 0, issue_date: '2025-03-01', currency: 'CZK', manually_paid: false },
            ];
            const movements = [
                { id: 103, amount: -7500, variable_symbol: null, date: '2025-03-10', currency: 'CZK', raw_data: {} },
            ];

            setupPayablesChain(invoices, movements);

            const count = await service.syncPayables(FAR_DEADLINE);
            expect(count).toBe(1);
        });

        it('does not update manually_paid invoices', async () => {
            const invoices = [
                { id: 4, number: '400', external_id: '5004', amount: 3000, paid_amount: 0, issue_date: '2025-04-01', currency: 'CZK', manually_paid: true },
            ];
            const movements = [
                { id: 104, amount: -3000, variable_symbol: '400', date: '2025-04-05', currency: 'CZK', raw_data: {} },
            ];

            setupPayablesChain(invoices, movements);

            const count = await service.syncPayables(FAR_DEADLINE);
            expect(count).toBe(0);
        });

        it('only applies fuzzy match when exactly one candidate', async () => {
            const invoices = [
                { id: 5, number: '500', external_id: '5005', amount: 2000, paid_amount: 0, issue_date: '2025-05-01', currency: 'CZK', manually_paid: false },
            ];
            // Two movements with same amount - fuzzy should NOT match
            const movements = [
                { id: 105, amount: -2000, variable_symbol: null, date: '2025-05-05', currency: 'CZK', raw_data: {} },
                { id: 106, amount: -2000, variable_symbol: null, date: '2025-05-08', currency: 'CZK', raw_data: {} },
            ];

            setupPayablesChain(invoices, movements);

            const count = await service.syncPayables(FAR_DEADLINE);
            expect(count).toBe(0);
        });
    });

    // ===================================================================
    // linkInvoices()
    // ===================================================================
    describe('linkInvoices()', () => {
        function setupLinkChain(contacts: any[], docs: any[]) {
            let thenCallCount = 0;
            mockChain.then.mockImplementation((resolve: any) => {
                thenCallCount++;
                if (thenCallCount === 1) return resolve({ data: contacts, error: null });
                if (thenCallCount === 2) return resolve({ data: docs, error: null });
                return resolve({ data: null, error: null });
            });
        }

        it('matches by DIC', async () => {
            const contacts = [
                { id: 'C1', company_number: '11111111', vatin: 'CZ11111111' },
            ];
            const docs = [
                { id: 10, supplier_ico: null, supplier_dic: 'CZ11111111' },
            ];

            setupLinkChain(contacts, docs);

            const count = await service.linkInvoices(FAR_DEADLINE);
            expect(count).toBe(1);
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({ contact_id: 'C1' })
            );
        });

        it('falls back to ICO match', async () => {
            const contacts = [
                { id: 'C2', company_number: '22222222', vatin: null },
            ];
            const docs = [
                { id: 20, supplier_ico: '22222222', supplier_dic: null },
            ];

            setupLinkChain(contacts, docs);

            const count = await service.linkInvoices(FAR_DEADLINE);
            expect(count).toBe(1);
        });

        it('only processes unlinked documents (contact_id is null)', async () => {
            const contacts = [{ id: 'C3', company_number: '33333333', vatin: 'CZ33333333' }];
            const docs: any[] = [];

            setupLinkChain(contacts, docs);

            const count = await service.linkInvoices(FAR_DEADLINE);
            expect(count).toBe(0);
            expect(mockChain.is).toHaveBeenCalledWith('contact_id', null);
        });
    });

    // ===================================================================
    // syncBankAccountsMetadata()
    // ===================================================================
    describe('syncBankAccountsMetadata()', () => {
        it('fetches detail for each account and upserts', async () => {
            const accounts = [
                { bank_account_id: 'BA1', name: 'Ucet 1', bank_account: '123/0100', bank_code: '0100' },
                { bank_account_id: 'BA2', name: 'Ucet 2', bank_account: '456/0800', bank_code: '0800' },
            ];

            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse(accounts));
            mockUol.getBankAccountDetail
                .mockResolvedValueOnce({ name: 'Ucet 1 Detail', bank_account: '123/0100', bank_code: '0100', currency: { currency_id: 'CZK' }, opening_balance: '50000' })
                .mockResolvedValueOnce({ name: 'Ucet 2 Detail', bank_account: '456/0800', bank_code: '0800', currency: 'EUR', opening_balance: '10000' });

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const result = await service.syncBankAccountsMetadata();
            expect(result.count).toBe(2);
            expect(mockUol.getBankAccountDetail).toHaveBeenCalledTimes(2);
            expect(mockChain.upsert).toHaveBeenCalledTimes(2);
        });

        it('continues on individual account error', async () => {
            const accounts = [
                { bank_account_id: 'BA1', name: 'Ucet 1' },
                { bank_account_id: 'BA2', name: 'Ucet 2' },
            ];

            mockUol.getBankAccounts.mockResolvedValue(makePaginatedResponse(accounts));
            mockUol.getBankAccountDetail
                .mockRejectedValueOnce(new Error('API error for BA1'))
                .mockResolvedValueOnce({ name: 'Ucet 2', currency: 'CZK', opening_balance: '0' });

            mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));

            const result = await service.syncBankAccountsMetadata();
            expect(result.count).toBe(1);
        });
    });
});
