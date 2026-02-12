'use client';

import { useState, useEffect } from 'react';
import { createVozidlo, updateVozidlo, type VozidloSRelacemi, type VozidloFormData, type TypPaliva } from '@/lib/api/flotila-api';
import { supabase } from '@/lib/supabase';
import { decodeVIN, isValidVIN, isBMW } from '@/lib/vin-decoder';

interface RsvLookupResponse {
  success: boolean;
  data: Record<string, unknown>;
  mapped: {
    znacka: string | null;
    model: string | null;
    barva: string | null;
    typ_paliva: string | null;
    stk_do: string | null;
    datum_prvni_registrace: string | null;
    status: string | null;
  };
  error?: string;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VozidloSRelacemi | null;
  onSuccess: () => void;
}

interface Pracovnik {
  id: number;
  jmeno: string;
}

export default function VehicleModal({ isOpen, onClose, vehicle, onSuccess }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinMessage, setVinMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pracovnici, setPracovnici] = useState<Pracovnik[]>([]);
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<VozidloFormData>({
    vin: '',
    spz: '',
    znacka: '',
    model: '',
    rok_vyroby: new Date().getFullYear(),
    typ_paliva: 'benzin',
    najezd_km: 0,
  });

  // Load pracovnici list
  useEffect(() => {
    if (isOpen) {
      const loadPracovnici = async () => {
        const { data, error } = await supabase
          .from('pracovnici')
          .select('id, jmeno')
          .order('jmeno', { ascending: true });

        if (error) {
          console.error('Error loading pracovnici:', error);
        } else {
          setPracovnici(data || []);
        }
      };
      loadPracovnici();
    }
  }, [isOpen]);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vin: vehicle.vin,
        spz: vehicle.spz,
        znacka: vehicle.znacka,
        model: vehicle.model,
        rok_vyroby: vehicle.rok_vyroby,
        typ_paliva: vehicle.typ_paliva,
        barva: vehicle.barva || undefined,
        najezd_km: vehicle.najezd_km,
        prideleny_pracovnik_id: vehicle.prideleny_pracovnik_id || undefined,
        pojisteni_do: vehicle.pojisteni_do || undefined,
        pojistovna: vehicle.pojistovna || undefined,
        stk_do: vehicle.stk_do || undefined,
        datum_porizeni: vehicle.datum_porizeni || undefined,
        kupni_cena: vehicle.kupni_cena || undefined,
        leasing: vehicle.leasing,
        poznamka: vehicle.poznamka || undefined,
      });
    } else {
      setFormData({
        vin: '',
        spz: '',
        znacka: '',
        model: '',
        rok_vyroby: new Date().getFullYear(),
        typ_paliva: 'benzin',
        najezd_km: 0,
      });
    }
    setVinData(null);
    setVinMessage(null);
  }, [vehicle, isOpen]);

  const handleDecodeVIN = async () => {
    if (!formData.vin) {
      setVinMessage({ type: 'error', text: 'Zadejte VIN před dekódováním' });
      return;
    }

    if (!isValidVIN(formData.vin)) {
      setVinMessage({ type: 'error', text: 'Neplatný formát VIN (musí být 17 znaků, bez I/O/Q)' });
      return;
    }

    setVinLoading(true);
    setVinMessage(null);
    setVinData(null);

    // 1. Try Czech Vehicle Registry (RSV) first — most accurate for CZ vehicles
    let rsvSuccess = false;
    try {
      const rsvResponse = await fetch('/api/vehicles/vin-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin: formData.vin,
          vehicleId: vehicle?.id,
        }),
      });

      if (rsvResponse.ok) {
        const rsvResult: RsvLookupResponse = await rsvResponse.json();
        if (rsvResult.success && rsvResult.mapped) {
          const m = rsvResult.mapped;
          setFormData(prev => ({
            ...prev,
            ...(m.znacka && { znacka: m.znacka }),
            ...(m.model && { model: m.model }),
            ...(m.barva && { barva: m.barva }),
            ...(m.typ_paliva && { typ_paliva: m.typ_paliva as TypPaliva }),
            ...(m.stk_do && { stk_do: m.stk_do }),
          }));
          setVinData(rsvResult.data);
          rsvSuccess = true;

          const bmwInfo = isBMW(formData.vin) ? ' (BMW - CarData ready)' : '';
          setVinMessage({
            type: 'success',
            text: `✓ Data načtena z Registru silničních vozidel ČR${bmwInfo}`
          });
        }
      }
    } catch (error) {
      console.error('RSV lookup error:', error);
      // Non-blocking — fall through to NHTSA
    }

    // 2. Fallback to NHTSA if RSV failed (non-CZ vehicles, API down, etc.)
    if (!rsvSuccess) {
      try {
        const result = await decodeVIN(formData.vin);

        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            znacka: result.data!.znacka,
            model: result.data!.model,
            ...(result.data!.rok_vyroby > 0 && { rok_vyroby: result.data!.rok_vyroby }),
            ...(result.data!.typ_paliva && { typ_paliva: result.data!.typ_paliva as TypPaliva }),
          }));

          const source = result.data.source === 'Local' ? 'Lokální DB' : (result.data.source === 'NHTSA' ? 'NHTSA API' : 'Neznámý zdroj');
          const isGenericModel = result.data.model === 'PASSENGER CAR' || result.data.model === 'TRUCK';
          const bmwInfo = isBMW(formData.vin) ? ' (BMW - CarData ready)' : '';
          const verifyInfo = isGenericModel || !result.data.rok_vyroby ? ' ⚠️ Údaje mohou být neúplné.' : '';

          setVinMessage({
            type: 'success',
            text: `✓ VIN dekódován (${source})${bmwInfo}${verifyInfo}`
          });
        } else {
          setVinMessage({
            type: 'error',
            text: result.error || 'Nepodařilo se dekódovat VIN'
          });
        }
      } catch (error) {
        console.error('VIN decode error:', error);
        setVinMessage({
          type: 'error',
          text: 'Chyba při komunikaci s VIN dekodérem'
        });
      }
    }

    setVinLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        ...(vinData && {
          vin_data: vinData,
          vin_data_fetched_at: new Date().toISOString(),
        }),
      };

      if (vehicle) {
        await updateVozidlo(vehicle.id, dataToSave);
      } else {
        await createVozidlo(dataToSave);
      }
      onSuccess();
    } catch (e: unknown) {
      console.error('Error saving vehicle:', e);
      alert('Chyba při ukládání vozidla');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {vehicle ? 'Upravit vozidlo' : 'Nové vozidlo'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* VIN Decoder Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">VIN *</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => {
                    setFormData({ ...formData, vin: e.target.value.toUpperCase() });
                    setVinMessage(null);
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
                  onClick={handleDecodeVIN}
                  disabled={vinLoading || !formData.vin || formData.vin.length !== 17}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm font-medium"
                >
                  {vinLoading ? 'Dekóduji...' : '🔍 Načíst z VIN'}
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
                  <span className="text-xl">🚗</span>
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
              💡 VIN se automaticky dekóduje pomocí NHTSA databáze (zdarma, funguje pro EU/US výrobce)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium mb-1">SPZ *</label>
              <input
                type="text"
                value={formData.spz}
                onChange={(e) => setFormData({ ...formData, spz: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Značka *</label>
              <input
                type="text"
                value={formData.znacka}
                onChange={(e) => setFormData({ ...formData, znacka: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model *</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rok výroby *</label>
              <input
                type="number"
                value={formData.rok_vyroby}
                onChange={(e) => setFormData({ ...formData, rok_vyroby: parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, barva: e.target.value })}
                placeholder="např. Černá"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Typ paliva *</label>
              <select
                value={formData.typ_paliva}
                onChange={(e) => setFormData({ ...formData, typ_paliva: e.target.value as TypPaliva })}
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
                onChange={(e) => setFormData({ ...formData, najezd_km: parseInt(e.target.value) || 0 })}
                required
                min={0}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            {/* Assignment */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Přidělený pracovník</label>
              <select
                value={formData.prideleny_pracovnik_id || ''}
                onChange={(e) => setFormData({ ...formData, prideleny_pracovnik_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              >
                <option value="">-- Nepřiděleno --</option>
                {pracovnici.map(p => (
                  <option key={p.id} value={p.id}>{p.jmeno}</option>
                ))}
              </select>
            </div>

            {/* Inspections & Insurance */}
            <div>
              <label className="block text-sm font-medium mb-1">STK do</label>
              <input
                type="date"
                value={formData.stk_do || ''}
                onChange={(e) => setFormData({ ...formData, stk_do: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pojištění do</label>
              <input
                type="date"
                value={formData.pojisteni_do || ''}
                onChange={(e) => setFormData({ ...formData, pojisteni_do: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Pojišťovna</label>
              <input
                type="text"
                value={formData.pojistovna || ''}
                onChange={(e) => setFormData({ ...formData, pojistovna: e.target.value })}
                placeholder="např. Allianz"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            {/* Purchase Info */}
            <div>
              <label className="block text-sm font-medium mb-1">Datum pořízení</label>
              <input
                type="date"
                value={formData.datum_porizeni || ''}
                onChange={(e) => setFormData({ ...formData, datum_porizeni: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Kupní cena (Kč)</label>
              <input
                type="number"
                value={formData.kupni_cena || ''}
                onChange={(e) => setFormData({ ...formData, kupni_cena: e.target.value ? parseFloat(e.target.value) : undefined })}
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
                  onChange={(e) => setFormData({ ...formData, leasing: e.target.checked })}
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
              onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
