import { describe, it, expect } from 'vitest';
import { LaborService, LaborData } from '../labor-service';

const getMonthKey = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

describe('LaborService', () => {
    const defaultCostData = {
        monthlyFixedCostsGlobal: new Map<string, number>(),
        monthlyFixedCostsSpecific: new Map<string, number>()
    };

    describe('calculateLabor', () => {
        it('should return zero values for empty data', () => {
            const result = LaborService.calculateLabor(
                [], // praceData
                [], // allPraceData
                [], // mzdyData
                [], // workersData
                [], // accountingDocs
                defaultCostData,
                {},
                { getMonthKey }
            );

            expect(result.totalLaborCost).toBe(0);
            expect(result.totalOverheadCost).toBe(0);
            expect(result.totalHours).toBe(0);
        });

        it('should calculate total hours from prace data', () => {
            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 8, pracovnik_id: 1 },
                { datum: '2024-01-11', pocet_hodin: 6, pracovnik_id: 1 },
                { datum: '2024-01-12', pocet_hodin: 10, pracovnik_id: 2 },
            ];

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                [],
                [],
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            expect(result.totalHours).toBe(24);
            expect(result.monthlyHours.get('2024-01')).toBe(24);
        });

        it('should calculate labor cost from mzdy data in simple mode', () => {
            const mzdyData = [
                { pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 50000 },
                { pracovnik_id: 2, rok: 2024, mesic: 1, celkova_castka: 40000 },
            ];

            const result = LaborService.calculateLabor(
                [],
                [],
                mzdyData,
                [],
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            expect(result.totalLaborCost).toBe(90000);
            expect(result.monthlyLaborCost.get('2024-01')).toBe(90000);
        });

        it('should calculate overhead cost from fixed costs', () => {
            const costData = {
                monthlyFixedCostsGlobal: new Map([['2024-0', 30000]]), // January (0-indexed)
                monthlyFixedCostsSpecific: new Map<string, number>()
            };

            const result = LaborService.calculateLabor(
                [],
                [],
                [],
                [],
                [],
                costData,
                {},
                { getMonthKey }
            );

            expect(result.totalOverheadCost).toBe(30000);
        });

        it('should calculate worker rates correctly', () => {
            const workersData = [
                { id: 1, hodinova_mzda: 250 },
            ];

            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 100, pracovnik_id: 1 },
            ];

            const mzdyData = [
                { pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 30000 },
            ];

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                mzdyData,
                workersData,
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            // Rate = 30000 / 100 = 300
            const rateKey = '1-2024-0'; // pracovnik_id-year-month(0-indexed)
            expect(result.workerMonthRate.get(rateKey)).toBe(300);
        });

        it('should cap worker rate at 1.5x base rate', () => {
            const workersData = [
                { id: 1, hodinova_mzda: 200 },
            ];

            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 50, pracovnik_id: 1 },
            ];

            const mzdyData = [
                { pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 50000 },
            ];

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                mzdyData,
                workersData,
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            // Calculated rate = 50000 / 50 = 1000, but base is 200
            // 1000 > 200 * 1.5 = 300, so should be capped to base rate
            const rateKey = '1-2024-0';
            expect(result.workerMonthRate.get(rateKey)).toBe(200);
        });

        it('should aggregate worker stats correctly', () => {
            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 8, pracovnik_id: 1, pracovnici: { jmeno: 'Jan' } },
                { datum: '2024-01-11', pocet_hodin: 6, pracovnik_id: 1, pracovnici: { jmeno: 'Jan' } },
                { datum: '2024-01-12', pocet_hodin: 10, pracovnik_id: 2, pracovnici: { jmeno: 'Petr' } },
            ];

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                [],
                [],
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            const janStats = result.workerStats.get('2024-01');
            expect(janStats).toBeDefined();
            expect(janStats?.get(1)?.total).toBe(14); // Jan: 8 + 6
            expect(janStats?.get(2)?.total).toBe(10); // Petr: 10
        });

        it('should calculate overhead rate based on hours', () => {
            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 100, pracovnik_id: 1 },
            ];

            const costData = {
                monthlyFixedCostsGlobal: new Map([['2024-01', 50000]]),
                monthlyFixedCostsSpecific: new Map<string, number>()
            };

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                [],
                [],
                [],
                costData,
                {},
                { getMonthKey }
            );

            // Overhead rate = 50000 / 100 = 500 per hour
            expect(result.monthlyOverheadRate.get('2024-01')).toBe(500);
        });

        it('should apply rates in filter mode', () => {
            const workersData = [{ id: 1, hodinova_mzda: 300 }];

            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 10, pracovnik_id: 1, pracovnici: { jmeno: 'Jan' } },
            ];

            const mzdyData = [
                { pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 30000 },
            ];

            const costData = {
                monthlyFixedCostsGlobal: new Map([['2024-01', 10000]]),
                monthlyFixedCostsSpecific: new Map<string, number>()
            };

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                mzdyData,
                workersData,
                [],
                costData,
                { klientId: 1 }, // Filter mode
                { getMonthKey }
            );

            // In filter mode: labor = hours * rate, overhead = hours * overhead_rate
            // Rate = 30000 / 10 = 3000 (but capped at 300 * 1.5 = 450) -> capped to 300
            // Overhead rate = 10000 / 10 = 1000
            // Labor = 10 * 300 = 3000
            // Overhead = 10 * 1000 = 10000
            expect(result.totalLaborCost).toBe(3000);
            expect(result.totalOverheadCost).toBe(10000);
        });

        it('should handle multiple months correctly', () => {
            const praceData = [
                { datum: '2024-01-10', pocet_hodin: 100, pracovnik_id: 1 },
                { datum: '2024-02-10', pocet_hodin: 120, pracovnik_id: 1 },
            ];

            const mzdyData = [
                { pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 30000 },
                { pracovnik_id: 1, rok: 2024, mesic: 2, celkova_castka: 35000 },
            ];

            const result = LaborService.calculateLabor(
                praceData,
                praceData,
                mzdyData,
                [],
                [],
                defaultCostData,
                {},
                { getMonthKey }
            );

            expect(result.totalLaborCost).toBe(65000);
            expect(result.monthlyLaborCost.get('2024-01')).toBe(30000);
            expect(result.monthlyLaborCost.get('2024-02')).toBe(35000);
            expect(result.totalHours).toBe(220);
        });
    });
});
