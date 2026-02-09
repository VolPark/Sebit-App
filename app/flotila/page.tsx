'use client';

import { useState, useEffect } from 'react';
import { getVozidla, getFleetStats, type VozidloSRelacemi, type FleetStats as FleetStatsType, type StavVozidla } from '@/lib/api/flotila-api';
import FleetTable from '@/components/flotila/FleetTable';
import FleetStats from '@/components/flotila/FleetStats';
import VehicleModal from '@/components/flotila/VehicleModal';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const logger = createLogger({ module: 'Flotila Page' });

export default function FlotilaPage() {
  const [vozidla, setVozidla] = useState<VozidloSRelacemi[]>([]);
  const [stats, setStats] = useState<FleetStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StavVozidla | 'vse'>('vse');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VozidloSRelacemi | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesData, statsData] = await Promise.all([
        getVozidla({
          stav: filter === 'vse' ? undefined : filter,
          hledani: search || undefined
        }),
        getFleetStats()
      ]);
      setVozidla(vehiclesData);
      setStats(statsData);
    } catch (error) {
      logger.error('Error loading fleet data', { error: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, search]);

  const handleEdit = (vehicle: VozidloSRelacemi) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSuccess = () => {
    loadData();
    handleModalClose();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Flotila</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Správa vozového parku
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Přidat vozidlo
        </button>
      </div>

      {/* Stats */}
      {stats && <FleetStats stats={stats} />}

      {/* Filters */}
      <div className="flex gap-3">
        {['vse', 'aktivni', 'servis', 'neaktivni', 'vyrazeno'].map(stav => (
          <button
            key={stav}
            onClick={() => setFilter(stav as StavVozidla | 'vse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === stav
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {stav.charAt(0).toUpperCase() + stav.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Hledat podle SPZ, značky, modelu nebo VIN..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />

      {/* Table */}
      <FleetTable
        vozidla={vozidla}
        loading={loading}
        onEdit={handleEdit}
        onDataChanged={loadData}
      />

      {/* Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        vehicle={editingVehicle}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
