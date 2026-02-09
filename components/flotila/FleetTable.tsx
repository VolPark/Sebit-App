'use client';

import type { VozidloSRelacemi } from '@/lib/api/flotila-api';
import { deleteVozidlo } from '@/lib/api/flotila-api';

interface FleetTableProps {
  vozidla: VozidloSRelacemi[];
  loading: boolean;
  onEdit: (vehicle: VozidloSRelacemi) => void;
  onDataChanged: () => void;
}

export default function FleetTable({ vozidla, loading, onEdit, onDataChanged }: FleetTableProps) {
  const handleDelete = async (id: number, spz: string) => {
    if (!confirm(`Opravdu smazat vozidlo ${spz}?`)) return;

    try {
      await deleteVozidlo(id);
      onDataChanged();
    } catch (e) {
      console.error('Error deleting vehicle:', e);
      alert('Chyba při mazání vozidla');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Načítám...</div>;
  }

  if (vozidla.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Žádná vozidla nenalezena</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="p-4 font-semibold">SPZ</th>
              <th className="p-4 font-semibold">Vozidlo</th>
              <th className="p-4 font-semibold">Rok</th>
              <th className="p-4 font-semibold">Nájezd</th>
              <th className="p-4 font-semibold">Přiděleno</th>
              <th className="p-4 font-semibold">STK do</th>
              <th className="p-4 font-semibold">Stav</th>
              <th className="p-4 font-semibold">Akce</th>
            </tr>
          </thead>
          <tbody>
            {vozidla.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
                <td className="p-4 font-medium">{v.spz}</td>
                <td className="p-4">{v.znacka} {v.model}</td>
                <td className="p-4 text-gray-500">{v.rok_vyroby}</td>
                <td className="p-4">{v.najezd_km.toLocaleString()} km</td>
                <td className="p-4 text-gray-500">
                  {v.prideleny_pracovnik ? v.prideleny_pracovnik.jmeno : '-'}
                </td>
                <td className="p-4">
                  {v.stk_do ? new Date(v.stk_do).toLocaleDateString('cs-CZ') : '-'}
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    v.stav === 'aktivni' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    v.stav === 'servis' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {v.stav}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(v)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.spz)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Smazat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
