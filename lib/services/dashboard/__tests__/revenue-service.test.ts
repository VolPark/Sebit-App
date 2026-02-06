import { describe, it, expect } from 'vitest';
import { RevenueService, RevenueData } from '../revenue-service';

// Helper to create month key (same format as in dashboard)
const getMonthKey = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

describe('RevenueService', () => {
    describe('calculateRevenue', () => {
        it('should return zero values for empty data', () => {
            const result = RevenueService.calculateRevenue(
                [], // akceData
                [], // financeData
                [], // accountingDocs
                {}, // filters
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(0);
            expect(result.monthlyRevenue.size).toBe(0);
            expect(result.clientStats.size).toBe(0);
        });

        it('should calculate revenue from STANDARD project in akce', () => {
            const akceData = [{
                id: 1,
                datum: '2024-01-15',
                project_type: 'STANDARD',
                cena_klient: 50000,
                material_klient: 10000,
                odhad_hodin: 100,
                klient_id: 1,
                klienti: { nazev: 'Test Client' }
            }];

            const result = RevenueService.calculateRevenue(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(50000);
            expect(result.monthlyRevenue.get('2024-01')).toBe(50000);
            expect(result.monthlyMaterialKlient.get('2024-01')).toBe(10000);
            expect(result.monthlyEstimatedHours.get('2024-01')).toBe(100);
        });

        it('should not count TIME_MATERIAL projects from akce as revenue', () => {
            const akceData = [{
                id: 1,
                datum: '2024-01-15',
                project_type: 'TIME_MATERIAL',
                cena_klient: 50000,
                material_klient: 5000,
                odhad_hodin: 50
            }];

            const result = RevenueService.calculateRevenue(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            // Revenue should be 0 for TM projects (they use finance records)
            expect(result.totalRevenue).toBe(0);
            // But material and hours still tracked
            expect(result.monthlyMaterialKlient.get('2024-01')).toBe(5000);
            expect(result.monthlyEstimatedHours.get('2024-01')).toBe(50);
        });

        it('should calculate revenue from finance records for TM projects', () => {
            const akceData = [{
                id: 1,
                datum: '2024-01-01',
                project_type: 'TIME_MATERIAL',
                klient_id: 1,
                klienti: { nazev: 'Client A' }
            }];

            const financeData = [{
                datum: '2024-01-20',
                castka: 25000,
                akce: {
                    id: 1,
                    project_type: 'TIME_MATERIAL',
                    klient_id: 1,
                    klienti: { nazev: 'Client A' }
                }
            }];

            const result = RevenueService.calculateRevenue(
                akceData,
                financeData,
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(25000);
            expect(result.monthlyRevenue.get('2024-01')).toBe(25000);
        });

        it('should skip finance records for STANDARD projects (already counted)', () => {
            const akceData = [{
                id: 1,
                datum: '2024-01-15',
                project_type: 'STANDARD',
                cena_klient: 50000
            }];

            const financeData = [{
                datum: '2024-01-20',
                castka: 50000, // Same amount - should not double count
                akce: {
                    id: 1,
                    project_type: 'STANDARD'
                }
            }];

            const result = RevenueService.calculateRevenue(
                akceData,
                financeData,
                [],
                {},
                { getMonthKey }
            );

            // Should only count once from akce
            expect(result.totalRevenue).toBe(50000);
        });

        it('should calculate revenue from sales invoices', () => {
            const accountingDocs = [{
                type: 'sales_invoice',
                tax_date: '2024-02-10',
                amount: 100000,
                amount_czk: 100000,
                currency: 'CZK',
                mappings: []
            }];

            const result = RevenueService.calculateRevenue(
                [],
                [],
                accountingDocs,
                {}, // No filters = unmapped revenue counted
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(100000);
            expect(result.monthlyRevenue.get('2024-02')).toBe(100000);
        });

        it('should skip purchase invoices', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-02-10',
                amount: 100000,
                amount_czk: 100000,
                mappings: []
            }];

            const result = RevenueService.calculateRevenue(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(0);
        });

        it('should skip internal transfers in sales invoices', () => {
            const accountingDocs = [{
                type: 'sales_invoice',
                tax_date: '2024-02-10',
                amount: 50000,
                amount_czk: 50000,
                description: 'Převod mezi firemními účty',
                mappings: []
            }];

            const result = RevenueService.calculateRevenue(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(0);
        });

        it('should convert EUR to CZK for invoices without amount_czk', () => {
            const accountingDocs = [{
                type: 'sales_invoice',
                tax_date: '2024-02-10',
                amount: 1000,
                currency: 'EUR',
                mappings: []
            }];

            const result = RevenueService.calculateRevenue(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            // EUR rate is 25 in the code
            expect(result.totalRevenue).toBe(25000);
        });

        it('should aggregate client stats correctly', () => {
            const akceData = [
                {
                    id: 1,
                    datum: '2024-01-10',
                    project_type: 'STANDARD',
                    cena_klient: 30000,
                    klient_id: 1,
                    klienti: { nazev: 'Client A' }
                },
                {
                    id: 2,
                    datum: '2024-01-20',
                    project_type: 'STANDARD',
                    cena_klient: 20000,
                    klient_id: 1,
                    klienti: { nazev: 'Client A' }
                },
                {
                    id: 3,
                    datum: '2024-01-25',
                    project_type: 'STANDARD',
                    cena_klient: 50000,
                    klient_id: 2,
                    klienti: { nazev: 'Client B' }
                }
            ];

            const result = RevenueService.calculateRevenue(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(100000);

            const janStats = result.clientStats.get('2024-01');
            expect(janStats).toBeDefined();
            expect(janStats?.get(1)?.total).toBe(50000); // Client A total
            expect(janStats?.get(2)?.total).toBe(50000); // Client B total
        });

        it('should filter by klientId when provided', () => {
            const akceData = [
                { id: 1, datum: '2024-01-10', project_type: 'STANDARD', cena_klient: 30000, klient_id: 1 },
            ];

            const accountingDocs = [{
                type: 'sales_invoice',
                tax_date: '2024-01-15',
                amount_czk: 50000,
                mappings: [{
                    akce_id: 1,
                    amount_czk: 50000
                }]
            }];

            const result = RevenueService.calculateRevenue(
                akceData,
                [],
                accountingDocs,
                { klientId: 1 },
                { getMonthKey }
            );

            // Akce revenue + mapped invoice revenue
            expect(result.totalRevenue).toBe(80000);
        });

        it('should handle multiple months correctly', () => {
            const akceData = [
                { id: 1, datum: '2024-01-15', project_type: 'STANDARD', cena_klient: 30000 },
                { id: 2, datum: '2024-02-15', project_type: 'STANDARD', cena_klient: 40000 },
                { id: 3, datum: '2024-03-15', project_type: 'STANDARD', cena_klient: 50000 },
            ];

            const result = RevenueService.calculateRevenue(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalRevenue).toBe(120000);
            expect(result.monthlyRevenue.get('2024-01')).toBe(30000);
            expect(result.monthlyRevenue.get('2024-02')).toBe(40000);
            expect(result.monthlyRevenue.get('2024-03')).toBe(50000);
        });
    });
});
