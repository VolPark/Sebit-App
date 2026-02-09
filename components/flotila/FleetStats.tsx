'use client';

import type { FleetStats } from '@/lib/api/flotila-api';

interface FleetStatsProps {
  stats: FleetStats;
}

export default function FleetStats({ stats }: FleetStatsProps) {
  const items = [
    { label: 'Celkem vozidel', value: stats.celkem_vozidel, color: 'text-blue-600' },
    { label: 'Aktivních', value: stats.aktivnich, color: 'text-green-600' },
    { label: 'V servisu', value: stats.v_servisu, color: 'text-yellow-600' },
    { label: 'Brzy STK', value: stats.brzy_stk, color: stats.brzy_stk > 0 ? 'text-red-600' : 'text-gray-600' },
    { label: 'Brzy pojištění', value: stats.brzy_pojisteni, color: stats.brzy_pojisteni > 0 ? 'text-red-600' : 'text-gray-600' },
    { label: 'Celková hodnota', value: `${stats.celkova_hodnota.toLocaleString('cs-CZ')} Kč`, color: 'text-gray-900 dark:text-white' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
            {item.label}
          </div>
          <div className={`text-lg md:text-2xl font-bold ${item.color}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
