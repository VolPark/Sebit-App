import { describe, it, expect } from 'vitest';
import { CostService, CostData } from '../cost-service';

const getMonthKey = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

describe('CostService', () => {
    describe('calculateCosts', () => {
        it('should return zero values for empty data', () => {
            const result = CostService.calculateCosts(
                [], // akceData
                [], // fixedCostsData
                [], // accountingDocs
                {}, // filters
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(0);
            expect(result.totalMaterialCost).toBe(0);
            expect(result.materialProfit).toBe(0);
        });

        it('should calculate material costs from akce', () => {
            const akceData = [{
                id: 1,
                datum: '2024-01-15',
                material_my: 10000,
                material_klient: 15000
            }];

            const result = CostService.calculateCosts(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalMaterialCost).toBe(10000);
            expect(result.monthlyMaterialCost.get('2024-01')).toBe(10000);
            expect(result.materialProfit).toBe(5000); // 15000 - 10000
        });

        it('should calculate material profit correctly', () => {
            const akceData = [
                { id: 1, datum: '2024-01-10', material_my: 5000, material_klient: 8000 },
                { id: 2, datum: '2024-01-15', material_my: 3000, material_klient: 4000 },
            ];

            const result = CostService.calculateCosts(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalMaterialCost).toBe(8000);
            expect(result.materialProfit).toBe(4000); // (8000-5000) + (4000-3000)
        });

        it('should process fixed costs in simple mode', () => {
            const fixedCostsData = [
                { rok: 2024, mesic: 1, castka: 20000, division_id: null },
                { rok: 2024, mesic: 1, castka: 10000, division_id: 1 },
            ];

            const result = CostService.calculateCosts(
                [],
                fixedCostsData,
                [],
                {}, // No filters = simple mode
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(30000);
            expect(result.monthlyFixedCostsGlobal.get('2024-0')).toBe(20000);
            expect(result.monthlyFixedCostsSpecific.get('2024-0')).toBe(10000);
        });

        it('should not add fixed costs to total in filter mode', () => {
            const fixedCostsData = [
                { rok: 2024, mesic: 1, castka: 20000, division_id: null },
            ];

            const result = CostService.calculateCosts(
                [],
                fixedCostsData,
                [],
                { klientId: 1 }, // Filter mode
                { getMonthKey }
            );

            // Fixed costs tracked but not added to total (distributed via rate)
            expect(result.totalCosts).toBe(0);
            expect(result.monthlyFixedCostsGlobal.get('2024-0')).toBe(20000);
        });

        it('should calculate costs from purchase invoices', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-02-10',
                amount: 50000,
                amount_czk: 50000,
                currency: 'CZK',
                mappings: []
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(50000);
            expect(result.monthlyCosts.get('2024-02')).toBe(50000);
        });

        it('should skip sales invoices', () => {
            const accountingDocs = [{
                type: 'sales_invoice',
                tax_date: '2024-02-10',
                amount_czk: 100000,
                mappings: []
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(0);
        });

        it('should convert EUR to CZK for purchase invoices', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-02-10',
                amount: 1000,
                currency: 'EUR',
                mappings: []
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(25000); // 1000 * 25
        });

        it('should handle material category in mapped costs', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-01-15',
                amount_czk: 30000,
                mappings: [{
                    amount_czk: 30000,
                    cost_category: 'material'
                }]
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalMaterialCost).toBe(30000);
            expect(result.materialProfit).toBe(-30000); // No revenue offset
        });

        it('should add overhead to fixed costs maps', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-01-15',
                amount_czk: 15000,
                mappings: [{
                    amount_czk: 15000,
                    cost_category: 'overhead',
                    division_id: null,
                    akce_id: null
                }]
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.monthlyFixedCostsGlobal.get('2024-0')).toBe(15000);
        });

        it('should skip labor mappings (handled by LaborService)', () => {
            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-01-15',
                amount_czk: 20000,
                mappings: [{
                    amount_czk: 20000,
                    pracovnik_id: 1 // Labor - should be skipped
                }]
            }];

            const result = CostService.calculateCosts(
                [],
                [],
                accountingDocs,
                {},
                { getMonthKey }
            );

            expect(result.totalCosts).toBe(0);
        });

        it('should handle multiple months correctly', () => {
            const akceData = [
                { id: 1, datum: '2024-01-15', material_my: 5000, material_klient: 6000 },
                { id: 2, datum: '2024-02-15', material_my: 8000, material_klient: 10000 },
            ];

            const result = CostService.calculateCosts(
                akceData,
                [],
                [],
                {},
                { getMonthKey }
            );

            expect(result.totalMaterialCost).toBe(13000);
            expect(result.monthlyMaterialCost.get('2024-01')).toBe(5000);
            expect(result.monthlyMaterialCost.get('2024-02')).toBe(8000);
        });

        it('should filter by klientId when provided', () => {
            const akceData = [
                { id: 1, datum: '2024-01-15', klient_id: 1, material_my: 5000 },
            ];

            const accountingDocs = [{
                type: 'purchase_invoice',
                tax_date: '2024-01-15',
                amount_czk: 20000,
                mappings: [{
                    amount_czk: 20000,
                    akce_id: 1
                }]
            }];

            const result = CostService.calculateCosts(
                akceData,
                [],
                accountingDocs,
                { klientId: 1 },
                { getMonthKey }
            );

            // Material from akce + mapped cost from invoice
            expect(result.totalCosts).toBe(25000);
        });
    });
});
