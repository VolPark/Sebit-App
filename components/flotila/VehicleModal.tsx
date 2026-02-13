'use client';

import { useState, useEffect } from 'react';
import { createVozidlo, updateVozidlo, getVozidlo, type VozidloSRelacemi, type VozidloFormData, type TypPaliva } from '@/lib/api/flotila-api';
import { supabase } from '@/lib/supabase';
import { decodeVIN, isValidVIN, isBMW } from '@/lib/vin-decoder';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import type { CzechVehicleData } from '@/lib/vehicles/czech-vehicle-api';
import VehicleBasicTab from './tabs/VehicleBasicTab';
import VehicleEngineTab from './tabs/VehicleEngineTab';
import VehicleBodyTab from './tabs/VehicleBodyTab';
import VehicleEmissionsTab from './tabs/VehicleEmissionsTab';
import VehicleRegistrationTab from './tabs/VehicleRegistrationTab';
import VehicleOperationsTab from './tabs/VehicleOperationsTab';

const logger = createLogger({ module: 'VehicleModal' });

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

type TabId = 'basic' | 'engine' | 'body' | 'emissions' | 'registration' | 'operations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Základní údaje' },
  { id: 'engine', label: 'Motor a pohon' },
  { id: 'body', label: 'Karoserie a rozměry' },
  { id: 'emissions', label: 'Emise' },
  { id: 'registration', label: 'Registrace a doklady' },
  { id: 'operations', label: 'Provoz a náklady' },
];

export default function VehicleModal({ isOpen, onClose, vehicle, onSuccess }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinMessage, setVinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pracovnici, setPracovnici] = useState<Pracovnik[]>([]);
  const [vinData, setVinData] = useState<Record<string, unknown> | null>(null);
  const [fullVehicle, setFullVehicle] = useState<VozidloSRelacemi | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [formData, setFormData] = useState<VozidloFormData>({
    vin: '',
    spz: '',
    znacka: '',
    model: '',
    rok_vyroby: new Date().getFullYear(),
    typ_paliva: 'benzin',
    najezd_km: 0,
  });

  // RSV data — from fresh decode or saved in DB (fullVehicle has vin_data from detail fetch)
  const rsvData = (vinData || fullVehicle?.vin_data || vehicle?.vin_data) as CzechVehicleData | null;

  // Load full vehicle detail (with vin_data) when editing
  useEffect(() => {
    if (isOpen && vehicle?.id) {
      getVozidlo(vehicle.id)
        .then(detail => {
          if (detail) setFullVehicle(detail);
        })
        .catch(err => logger.error('Failed to load vehicle detail', { error: getErrorMessage(err) }));
    } else {
      setFullVehicle(null);
    }
  }, [isOpen, vehicle?.id]);

  // Load pracovnici list
  useEffect(() => {
    if (isOpen) {
      const loadPracovnici = async () => {
        const { data, error } = await supabase
          .from('pracovnici')
          .select('id, jmeno')
          .order('jmeno', { ascending: true });

        if (error) {
          logger.error('Error loading pracovnici', { error: error.message });
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
    setActiveTab('basic');
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

    // 1. Try Czech Vehicle Registry (RSV) first
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
            text: `Data načtena z Registru silničních vozidel ČR${bmwInfo}`
          });
        }
      }
    } catch (error: unknown) {
      logger.error('RSV lookup error', { error: getErrorMessage(error) });
    }

    // 2. Fallback to NHTSA if RSV failed
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
          const verifyInfo = isGenericModel || !result.data.rok_vyroby ? ' Údaje mohou být neúplné.' : '';

          setVinMessage({
            type: 'success',
            text: `VIN dekódován (${source})${bmwInfo}${verifyInfo}`
          });
        } else {
          setVinMessage({
            type: 'error',
            text: result.error || 'Nepodařilo se dekódovat VIN'
          });
        }
      } catch (error: unknown) {
        logger.error('VIN decode error', { error: getErrorMessage(error) });
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
      logger.error('Error saving vehicle', { error: getErrorMessage(e) });
      alert('Chyba při ukládání vozidla');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl flex flex-col max-w-7xl w-[95vw] h-[90vh] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-xl font-bold">
            {vehicle ? 'Upravit vozidlo' : 'Nové vozidlo'}
            {vehicle && (
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                {vehicle.znacka} {vehicle.model} ({vehicle.spz})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 shrink-0">
          <nav className="-mb-px flex space-x-4 md:space-x-6 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'basic' && (
              <VehicleBasicTab
                formData={formData}
                setFormData={setFormData}
                pracovnici={pracovnici}
                vinLoading={vinLoading}
                vinMessage={vinMessage}
                onDecodeVIN={handleDecodeVIN}
                onVinMessageClear={() => setVinMessage(null)}
              />
            )}
            {activeTab === 'engine' && <VehicleEngineTab rsvData={rsvData} />}
            {activeTab === 'body' && <VehicleBodyTab rsvData={rsvData} />}
            {activeTab === 'emissions' && <VehicleEmissionsTab rsvData={rsvData} />}
            {activeTab === 'registration' && <VehicleRegistrationTab rsvData={rsvData} />}
            {activeTab === 'operations' && (
              <VehicleOperationsTab formData={formData} setFormData={setFormData} />
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
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
