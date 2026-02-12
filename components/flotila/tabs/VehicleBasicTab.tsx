import type { VozidloFormData, TypPaliva } from '@/lib/api/flotila-api';
import { isBMW } from '@/lib/vin-decoder';

interface Pracovnik {
  id: number;
  jmeno: string;
}

interface VehicleBasicTabProps {
  formData: VozidloFormData;
  setFormData: React.Dispatch<React.SetStateAction<VozidloFormData>>;
  pracovnici: Pracovnik[];
  vinLoading: boolean;
  vinMessage: { type: 'success' | 'error'; text: string } | null;
  onDecodeVIN: () => void;
  onVinMessageClear: () => void;
}

export default function VehicleBasicTab({
  formData,
  setFormData,
  pracovnici,
  vinLoading,
  vinMessage,
  onDecodeVIN,
  onVinMessageClear,
}: VehicleBasicTabProps) {
  return (
    <div className="space-y-4">
      {/* VIN Decoder Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">VIN *</label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }));
                onVinMessageClear();
              }}
              required
              maxLength={17}
              placeholder="Např. WBAXXXXXXXXXXXXXX"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div className="pt-6">
            <button
              type="button"
              onClick={onDecodeVIN}
              disabled={vinLoading || !formData.vin || formData.vin.length !== 17}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm font-medium"
            >
              {vinLoading ? 'Dekóduji...' : 'Načíst z VIN'}
            </button>
          </div>
        </div>
        {vinMessage && (
          <div className={`mt-2 text-sm ${vinMessage.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {vinMessage.text}
          </div>
        )}
        {formData.vin && isBMW(formData.vin) && (
          <div className="mt-2 p-3 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 border border-blue-300 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">&#128663;</span>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">BMW vozidlo detekováno!</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Po uložení můžete aktivovat BMW CarData pro automatickou synchronizaci nájezdu, paliva a polohy vozidla.
                </p>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          VIN se automaticky dekóduje z Registru silničních vozidel ČR (pro CZ vozidla) nebo NHTSA databáze.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">SPZ *</label>
          <input
            type="text"
            value={formData.spz}
            onChange={(e) => setFormData(prev => ({ ...prev, spz: e.target.value }))}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Značka *</label>
          <input
            type="text"
            value={formData.znacka}
            onChange={(e) => setFormData(prev => ({ ...prev, znacka: e.target.value }))}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model *</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rok výroby *</label>
          <input
            type="number"
            value={formData.rok_vyroby}
            onChange={(e) => setFormData(prev => ({ ...prev, rok_vyroby: parseInt(e.target.value) || 0 }))}
            required
            min={1900}
            max={new Date().getFullYear() + 1}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Barva</label>
          <input
            type="text"
            value={formData.barva || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, barva: e.target.value }))}
            placeholder="např. Černá"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Typ paliva *</label>
          <select
            value={formData.typ_paliva}
            onChange={(e) => setFormData(prev => ({ ...prev, typ_paliva: e.target.value as TypPaliva }))}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          >
            <option value="benzin">Benzín</option>
            <option value="diesel">Diesel</option>
            <option value="elektro">Elektro</option>
            <option value="hybrid_plugin">Hybrid Plugin</option>
            <option value="hybrid">Hybrid</option>
            <option value="cng">CNG</option>
            <option value="lpg">LPG</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nájezd (km) *</label>
          <input
            type="number"
            value={formData.najezd_km}
            onChange={(e) => setFormData(prev => ({ ...prev, najezd_km: parseInt(e.target.value) || 0 }))}
            required
            min={0}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Přidělený pracovník</label>
          <select
            value={formData.prideleny_pracovnik_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, prideleny_pracovnik_id: e.target.value ? parseInt(e.target.value) : undefined }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
          >
            <option value="">-- Nepřiděleno --</option>
            {pracovnici.map(p => (
              <option key={p.id} value={p.id}>{p.jmeno}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
