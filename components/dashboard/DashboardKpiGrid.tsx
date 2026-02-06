'use client';

import { useMemo } from 'react';
import { getMaterialConfig } from '@/lib/material-config';
import { formatRate } from '@/lib/formatting';
import { KPICard } from '@/components/ui/KPICard';
import type { DashboardData, MonthlyData } from '@/lib/dashboard';

interface DashboardKpiGridProps {
    data: DashboardData;
    selectedMonths: MonthlyData[];
}

export function DashboardKpiGrid({ data, selectedMonths }: DashboardKpiGridProps) {
    // Aggregate data if months are selected
    const kpiData = useMemo(() => {
        if (!selectedMonths || selectedMonths.length === 0) return data;

        // Aggregation Logic
        const agg = {
            totalRevenue: 0,
            totalCosts: 0,
            grossProfit: 0,
            materialProfit: 0,
            totalMaterialCost: 0,
            totalLaborCost: 0,
            totalOverheadCost: 0,
            totalHours: 0,
            totalEstimatedHours: 0,
            averageHourlyWage: 0,
            avgCompanyRate: 0,
        };

        selectedMonths.forEach(m => {
            agg.totalRevenue += m.totalRevenue;
            agg.totalCosts += m.totalCosts;
            agg.grossProfit += m.grossProfit;
            agg.materialProfit += m.materialProfit;
            agg.totalMaterialCost += m.totalMaterialCost;
            agg.totalLaborCost += m.totalLaborCost;
            agg.totalOverheadCost += m.totalOverheadCost;
            agg.totalHours += m.totalHours;
            agg.totalEstimatedHours += m.totalEstimatedHours;
        });

        // Recalculate Ratios
        agg.averageHourlyWage = agg.totalHours > 0 ? agg.totalLaborCost / agg.totalHours : 0;

        // Calculate avgCompanyRate using totalMaterialKlient
        let totalMaterialKlient = 0;
        selectedMonths.forEach(m => totalMaterialKlient += m.totalMaterialKlient);
        agg.avgCompanyRate = agg.totalHours > 0 ? (agg.totalRevenue - totalMaterialKlient) / agg.totalHours : 0;

        return agg;
    }, [data, selectedMonths]);


    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    const titleSuffix = selectedMonths.length > 0
        ? `(${selectedMonths.length === 1 ? selectedMonths[0].month : `${selectedMonths.length} měsíců`}) `
        : '';

    const costsPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalCosts / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const profitPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.grossProfit / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const materialProfitPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.materialProfit / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;

    const materialPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalMaterialCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const laborPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalLaborCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const overheadPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalOverheadCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;

    // Hours Ratio
    const hoursRatio = kpiData.totalEstimatedHours > 0
        ? (kpiData.totalHours / kpiData.totalEstimatedHours * 100)
        : 0;
    const hoursData = `${kpiData.totalHours.toLocaleString('cs-CZ')} / ${kpiData.totalEstimatedHours.toLocaleString('cs-CZ')}`;

    return (
        <div className="space-y-6">
            {/* Row 1: Finance (Revenue, Profit) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title={`${titleSuffix}Příjmy`}
                    value={currency.format(kpiData.totalRevenue)}
                    helpText="Celkové příjmy za fakturace klientům"
                />
                <KPICard
                    title={`${titleSuffix}Zisk`}
                    value={currency.format(kpiData.grossProfit)}
                    helpText="Zisk = Příjmy - Celkové náklady"
                    percentage={profitPercentage}
                    percentageColor={kpiData.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                />
                {getMaterialConfig().isVisible && (
                    <KPICard
                        title={`Zisk (${getMaterialConfig().labelLowercase})`}
                        value={currency.format(kpiData.materialProfit)}
                        helpText={`Rozdíl mezi fakturací ${getMaterialConfig().labelLowercase}u klientovi a nákupní cenou`}
                        percentage={materialProfitPercentage}
                        percentageColor={kpiData.materialProfit >= 0 ? "text-green-500" : "text-red-500"}
                    />
                )}
            </div>

            {/* Row 2: Costs Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title={`${titleSuffix}Náklady`}
                    value={currency.format(kpiData.totalCosts)}
                    helpText={`Součet všech nákladů (${getMaterialConfig().isVisible ? getMaterialConfig().label + ' + ' : ''}Mzdy + Režie)`}
                    percentage={costsPercentage}
                    percentageColor="text-red-500"
                />
                {getMaterialConfig().isVisible && (
                    <KPICard
                        title={getMaterialConfig().label}
                        value={currency.format(kpiData.totalMaterialCost)}
                        helpText={`Nákupní cena ${getMaterialConfig().labelLowercase}u`}
                        percentage={materialPercentage}
                        percentageColor="text-red-500"
                    />
                )}
                <KPICard
                    title="Mzdy"
                    value={currency.format(kpiData.totalLaborCost)}
                    helpText="Náklady na vyplacené mzdy pracovníků"
                    percentage={laborPercentage}
                    percentageColor="text-red-500"
                />
                <KPICard
                    title="Režie"
                    value={currency.format(kpiData.totalOverheadCost)}
                    helpText="Fixní náklady + Ostatní provozní náklady"
                    percentage={overheadPercentage}
                    percentageColor="text-red-500"
                />
            </div>

            {/* Row 3: Stats & Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Odpracované hodiny"
                    value={`${kpiData.totalHours.toLocaleString('cs-CZ')} h`}
                    helpText="Celkový počet vykázaných hodin"
                />
                <KPICard
                    title="Hodiny (realita / plán)"
                    value={hoursData}
                    helpText="Poměr odpracovaných hodin vůči odhadu"
                    percentage={`${hoursRatio.toFixed(0)}%`}
                    percentageColor={hoursRatio <= 100 ? "text-green-500" : "text-red-500"}
                />
                <KPICard
                    title="Průměrná hodinová mzda"
                    value={formatRate(kpiData.averageHourlyWage)}
                    helpText="Průměrná vyplacená mzda"
                />
                <KPICard
                    title="Průměrná sazba firmy"
                    value={formatRate(kpiData.avgCompanyRate)}
                    helpText="Průměrná fakturovaná sazba (Příjmy / Hodiny)"
                />
            </div>
        </div>
    );
}

export default DashboardKpiGrid;
