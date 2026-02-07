import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UolClient } from '../uol-client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const testConfig = {
    baseUrl: 'https://api.test.uol.cz',
    email: 'test@example.com',
    apiKey: 'test-api-key',
};

function createJsonResponse(data: unknown, status = 200, statusText = 'OK') {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText,
        json: vi.fn().mockResolvedValue(data),
    };
}

describe('UolClient', () => {
    let client: UolClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new UolClient(testConfig);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ---------------------------------------------------------------
    // Auth
    // ---------------------------------------------------------------
    describe('Auth', () => {
        it('creates correct Basic auth header from email and apiKey', async () => {
            const expectedCredentials = Buffer.from('test@example.com:test-api-key').toString('base64');
            const expectedHeader = `Basic ${expectedCredentials}`;

            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [] }));
            await client.getSalesInvoices();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1].headers['Authorization']).toBe(expectedHeader);
        });
    });

    // ---------------------------------------------------------------
    // fetchApi - basic
    // ---------------------------------------------------------------
    describe('fetchApi - basic', () => {
        it('returns parsed JSON on successful API call', async () => {
            const responseData = { items: [{ id: 1 }], _meta: { href: '/v1/sales_invoices' } };
            mockFetch.mockResolvedValueOnce(createJsonResponse(responseData));

            const result = await client.getSalesInvoices();

            expect(result).toEqual(responseData);
        });

        it('throws error with status on non-200 response', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse(null, 500, 'Internal Server Error'));

            await expect(client.getSalesInvoices()).rejects.toThrow('UOL API Error 500: Internal Server Error');
        });

        it('includes Accept and Authorization headers in request', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [] }));
            await client.getSalesInvoices();

            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1].headers['Accept']).toBe('application/json');
            expect(callArgs[1].headers['Authorization']).toMatch(/^Basic /);
        });
    });

    // ---------------------------------------------------------------
    // fetchApi - retry on 429
    // ---------------------------------------------------------------
    describe('fetchApi - retry on 429', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('retries on 429 status', async () => {
            const response429 = createJsonResponse(null, 429, 'Too Many Requests');
            const responseOk = createJsonResponse({ items: [] });

            mockFetch
                .mockResolvedValueOnce(response429)
                .mockResolvedValueOnce(responseOk);

            const promise = client.getSalesInvoices();

            // Advance past the 11s wait
            await vi.advanceTimersByTimeAsync(11000);

            const result = await promise;
            expect(result).toEqual({ items: [] });
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('succeeds after one 429 retry followed by a successful response', async () => {
            const response429 = createJsonResponse(null, 429, 'Too Many Requests');
            const responseOk = createJsonResponse({ items: [{ id: 42 }], _meta: { href: '/test' } });

            mockFetch
                .mockResolvedValueOnce(response429)
                .mockResolvedValueOnce(responseOk);

            const promise = client.getSalesInvoices();
            await vi.advanceTimersByTimeAsync(11000);

            const result = await promise;
            expect(result.items).toEqual([{ id: 42 }]);
        });

        it('fails after 3 retries on repeated 429', async () => {
            const response429 = createJsonResponse(null, 429, 'Too Many Requests');

            mockFetch
                .mockResolvedValue(response429);

            const promise = client.getSalesInvoices().catch((e: Error) => {
                // Expected to throw after retries exhausted
                expect(e.message).toMatch(/Failed to fetch|UOL API Error/);
                return 'caught';
            });

            // Advance timers for each retry (3 retries x 11s)
            for (let i = 0; i < 5; i++) {
                await vi.advanceTimersByTimeAsync(11000);
            }

            const result = await promise;
            expect(result).toBe('caught');
        });
    });

    // ---------------------------------------------------------------
    // API methods
    // ---------------------------------------------------------------
    describe('API methods', () => {
        it('getSalesInvoices calls correct URL with page and perPage', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [], _meta: {} }));

            await client.getSalesInvoices(2, 25);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/sales_invoices?page=2&per_page=25',
                expect.any(Object)
            );
        });

        it('getPurchaseInvoices calls correct URL', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [], _meta: {} }));

            await client.getPurchaseInvoices(1, 50);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/purchase_invoices?page=1&per_page=50',
                expect.any(Object)
            );
        });

        it('getContacts includes hidden=all, vat_payer=all, business_entity=all params', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [], _meta: {} }));

            await client.getContacts(1, 50);

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('hidden=all');
            expect(calledUrl).toContain('vat_payer=all');
            expect(calledUrl).toContain('business_entity=all');
            expect(calledUrl).toContain('/v1/contacts');
        });

        it('getReceivables calls correct URL', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [], _meta: {} }));

            await client.getReceivables(3, 100);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/receivables?page=3&per_page=100',
                expect.any(Object)
            );
        });

        it('getBankAccounts calls /v1/my_bank_accounts', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ items: [], _meta: {} }));

            await client.getBankAccounts();

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('/v1/my_bank_accounts');
        });
    });

    // ---------------------------------------------------------------
    // URL handling
    // ---------------------------------------------------------------
    describe('URL handling', () => {
        it('getInvoiceDetail strips baseUrl from full URL', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ invoice_id: 1 }));

            await client.getInvoiceDetail('https://api.test.uol.cz/v1/sales_invoices/123');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/sales_invoices/123',
                expect.any(Object)
            );
        });

        it('getInvoiceDetail uses relative path as-is', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ invoice_id: 2 }));

            await client.getInvoiceDetail('/v1/sales_invoices/456');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/sales_invoices/456',
                expect.any(Object)
            );
        });

        it('getContactDetail strips baseUrl from full URL', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ contact_id: '10' }));

            await client.getContactDetail('https://api.test.uol.cz/v1/contacts/10');

            // After stripping baseUrl, fetchApi prepends it again, so final URL is the same
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.uol.cz/v1/contacts/10',
                expect.any(Object)
            );
        });

        it('getInvoiceDetail does not double the baseUrl for full URLs', async () => {
            mockFetch.mockResolvedValueOnce(createJsonResponse({ invoice_id: 1 }));

            await client.getInvoiceDetail('https://api.test.uol.cz/v1/sales_invoices/789');

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            // Should NOT contain the baseUrl twice
            expect(calledUrl).toBe('https://api.test.uol.cz/v1/sales_invoices/789');
            expect(calledUrl).not.toMatch(/api\.test\.uol\.cz.*api\.test\.uol\.cz/);
        });
    });

    // ---------------------------------------------------------------
    // getAllBankMovements
    // ---------------------------------------------------------------
    describe('getAllBankMovements', () => {
        it('paginates through multiple pages', async () => {
            const page1 = createJsonResponse({
                items: [
                    { bank_account: { bank_account_id: '100' }, amount: '500' },
                    { bank_account: { bank_account_id: '100' }, amount: '300' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: { next: '/v1/bank_movements?page=2' } },
            });
            const page2 = createJsonResponse({
                items: [
                    { bank_account: { bank_account_id: '100' }, amount: '200' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: {} },
            });

            mockFetch
                .mockResolvedValueOnce(page1)
                .mockResolvedValueOnce(page2);

            const result = await client.getAllBankMovements('100');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(3);
        });

        it('filters items by accountId', async () => {
            const page1 = createJsonResponse({
                items: [
                    { bank_account: { bank_account_id: '100' }, amount: '500' },
                    { bank_account: { bank_account_id: '999' }, amount: '300' }, // different account
                    { bank_account: { bank_account_id: '100' }, amount: '200' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: {} },
            });

            mockFetch.mockResolvedValueOnce(page1);

            const result = await client.getAllBankMovements('100');

            expect(result).toHaveLength(2);
            expect(result.every((item: any) => item.bank_account.bank_account_id === '100')).toBe(true);
        });

        it('stops when no more pages (no _meta.pagination.next)', async () => {
            const page1 = createJsonResponse({
                items: [
                    { bank_account: { bank_account_id: '100' }, amount: '500' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: {} },
            });

            mockFetch.mockResolvedValueOnce(page1);

            const result = await client.getAllBankMovements('100');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(1);
        });

        it('stops when page returns empty items', async () => {
            const page1 = createJsonResponse({
                items: [
                    { bank_account: { bank_account_id: '100' }, amount: '500' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: { next: '/v1/bank_movements?page=2' } },
            });
            const page2 = createJsonResponse({
                items: [],
                _meta: { href: '/v1/bank_movements', pagination: {} },
            });

            mockFetch
                .mockResolvedValueOnce(page1)
                .mockResolvedValueOnce(page2);

            const result = await client.getAllBankMovements('100');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(1);
        });

        it('respects MAX_PAGES safety limit (50)', async () => {
            // Create 51 pages of responses, each with a "next" link
            for (let i = 0; i < 51; i++) {
                mockFetch.mockResolvedValueOnce(createJsonResponse({
                    items: [
                        { bank_account: { bank_account_id: '100' }, amount: '10' },
                    ],
                    _meta: {
                        href: '/v1/bank_movements',
                        pagination: { next: `/v1/bank_movements?page=${i + 2}` },
                    },
                }));
            }

            const result = await client.getAllBankMovements('100');

            // Should stop at 50 pages even though more are available
            expect(mockFetch).toHaveBeenCalledTimes(50);
            expect(result).toHaveLength(50);
        }, 30000); // Extended timeout due to rate limiter delays

        it('matches accountId using bank_account_id fallback field', async () => {
            // Reset to ensure clean state after potentially timed-out tests
            mockFetch.mockReset();
            client = new UolClient(testConfig);

            const page1 = createJsonResponse({
                items: [
                    { bank_account_id: '100', amount: '500' }, // no nested bank_account object
                    { bank_account_id: '200', amount: '300' },
                ],
                _meta: { href: '/v1/bank_movements', pagination: {} },
            });

            mockFetch.mockResolvedValueOnce(page1);

            const result = await client.getAllBankMovements('100');

            expect(result).toHaveLength(1);
            expect(result[0].amount).toBe('500');
        });
    });

    // ---------------------------------------------------------------
    // Rate Limiter behavior
    // ---------------------------------------------------------------
    describe('Rate Limiter', () => {
        it('does not delay when under limit', async () => {
            mockFetch.mockResolvedValue(createJsonResponse({ items: [], _meta: {} }));

            const start = Date.now();
            // Make a few requests well under the 30/10s limit
            await client.getSalesInvoices();
            await client.getSalesInvoices();
            await client.getSalesInvoices();
            const elapsed = Date.now() - start;

            // Should complete nearly instantly (allow generous margin for CI)
            expect(elapsed).toBeLessThan(2000);
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
    });
});
