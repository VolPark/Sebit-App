export interface MonthlyData {
    month: string;
    monthIndex: number; // 0-11
    year: number;
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    totalHours: number;
    materialProfit: number;
    totalMaterialKlient: number;
    totalLaborCost: number;
    totalOverheadCost: number;
    totalMaterialCost: number;
    totalEstimatedHours: number;
    // KPI fields for detailed view
    avgCompanyRate: number;
    averageHourlyWage: number;
    averageMonthlyWage: number;
    estimatedVsActualHoursRatio: number;
    topClients: { klient_id: number; nazev: string; total: number }[];
    topWorkers: { pracovnik_id: number; jmeno: string; total: number }[];
}

export interface DashboardData {
    totalRevenue: number;
    totalCosts: number;
    totalLaborCost: number;
    totalOverheadCost: number;
    totalMaterialCost: number;
    grossProfit: number;
    materialProfit: number;
    totalHours: number;
    totalEstimatedHours: number;
    avgCompanyRate: number;
    averageHourlyWage: number;
    averageMonthlyWage: number;
    estimatedVsActualHoursRatio: number;
    topClients: { klient_id: number; nazev: string; total: number }[];
    topWorkers: { pracovnik_id: number; jmeno: string; total: number }[];

    monthlyData: MonthlyData[];

    prevPeriod: {
        totalRevenue: number;
        totalCosts: number;
        grossProfit: number;
    }
}
