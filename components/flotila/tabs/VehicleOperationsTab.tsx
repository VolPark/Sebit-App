import type { VozidloFormData } from '@/lib/api/flotila-api';

interface VehicleOperationsTabProps {
  formData: VozidloFormData;
  setFormData: React.Dispatch<React.SetStateAction<VozidloFormData>>;
}

export default function VehicleOperationsTab({ formData, setFormData }: VehicleOperationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">STK do</label>
          <input
            type="date"
            value={formData.stk_do || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, stk_do: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pojištění do</label>
          <input
            type="date"
            value={formData.pojisteni_do || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, pojisteni_do: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Pojišťovna</label>
          <input
            type="text"
            value={formData.pojistovna || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, pojistovna: e.target.value }))}
            placeholder="např. Allianz"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Datum pořízení</label>
          <input
            type="date"
            value={formData.datum_porizeni || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, datum_porizeni: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kupní cena (Kč)</label>
          <input
            type="number"
            value={formData.kupni_cena || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, kupni_cena: e.target.value ? parseFloat(e.target.value) : undefined }))}
            min={0}
            step="0.01"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div className="col-span-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.leasing || false}
              onChange={(e) => setFormData(prev => ({ ...prev, leasing: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm font-medium">Vozidlo je v leasingu</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Poznámka</label>
        <textarea
          value={formData.poznamka || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, poznamka: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
        />
      </div>
    </div>
  );
}
