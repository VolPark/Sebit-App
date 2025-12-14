'use client'
import { useMemo } from 'react';
import { MonthlyData } from '@/lib/dashboard';

const currency = new Intl.NumberFormat('cs-CZ', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1
});

const Bar = ({ value, maxValue, label, color }: { value: number, maxValue: number, label: string, color: string }) => {
  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col items-center h-full w-full">
      <div className="w-full h-full flex items-end">
        <div
          className="w-full rounded-t-lg transition-all duration-500"
          style={{ height: `${height}%`, backgroundColor: color }}
          title={`${label}: ${new Intl.NumberFormat('cs-CZ').format(value)} Kč`}
        >
        </div>
      </div>
    </div>
  );
};

interface BarChartProps {
  data: MonthlyData[];
  onMonthClick: (monthData: MonthlyData) => void;
  selectedMonth: MonthlyData | null;
}

export default function BarChart({ data, onMonthClick, selectedMonth }: BarChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.totalRevenue), ...data.map(d => d.totalCosts));
  }, [data]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 w-full h-96 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Měsíční přehled (Příjmy vs. Náklady)</h3>
      <div className="flex-grow flex items-end gap-2 sm:gap-4 overflow-x-auto pb-2">
        {data.map((monthData) => {
          const isSelected = selectedMonth?.month === monthData.month && selectedMonth?.year === monthData.year;
          return (
            <div
              key={monthData.month + monthData.year}
              className={`h-full w-full flex flex-col items-center cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
              onClick={() => onMonthClick(monthData)}
            >
              <div className="relative w-full h-full flex justify-center items-end gap-1">
                {/* Revenue Bar */}
                <Bar
                  value={monthData.totalRevenue}
                  maxValue={maxValue}
                  label={monthData.month}
                  color="#a3e635" // lime-400
                />
                {/* Costs Bar */}
                <Bar
                  value={monthData.totalCosts}
                  maxValue={maxValue}
                  label={monthData.month}
                  color="#f87171" // red-400
                />
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1 pt-1 border-t dark:border-slate-700 w-full text-center">{monthData.month}</div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-center items-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#a3e635]"></div>
          <span>Příjmy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#f87171]"></div>
          <span>Náklady</span>
        </div>
      </div>
    </div>
  );
}
