'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Settings, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { SupplierSettingsModal } from '@/components/suppliers/SupplierSettingsModal';
import { toast } from 'sonner';

export default function SuppliersManagement() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    const fetchSuppliers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name');

        if (error) {
            console.error(error);
            toast.error('Chyba při načítání dodavatelů');
        } else {
            setSuppliers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleEdit = (supplier: any) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu chcete odstranit tohoto dodavatele? Odstraní se i jeho položky z katalogu.')) return;

        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            toast.success('Dodavatel odstraněn');
            fetchSuppliers();
        } catch (e: any) {
            toast.error('Chyba: ' + e.message);
        }
    };

    const handleSync = async (id: number) => {
        toast.promise(
            fetch('/api/cron/suppliers-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId: id })
            }).then(async res => {
                if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
                return res.json();
            }),
            {
                loading: 'Synchronizuji...',
                success: 'Synchronizace dokončena',
                error: (err) => `Chyba: ${err.message}`
            }
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Seznam dodavatelů</h2>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-[#E30613] hover:bg-[#c90511] text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Přidat dodavatele
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {suppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{supplier.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {supplier.type}
                                        </span>
                                        {supplier.is_active ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <CheckCircle className="w-3 h-3" /> Aktivní
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <XCircle className="w-3 h-3" /> Neaktivní
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500 mb-6 space-y-1">
                            <p>Host: <span className="font-mono text-gray-700 dark:text-gray-300">{supplier.config?.host || '-'}</span></p>
                            <p>Poslední sync: <span className="text-gray-700 dark:text-gray-300">
                                {supplier.last_sync_at ? new Date(supplier.last_sync_at).toLocaleString('cs-CZ') : 'Nikdy'}
                            </span></p>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => handleEdit(supplier)}
                                className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            >
                                Upravit
                            </button>
                            <button
                                onClick={() => handleSync(supplier.id)}
                                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Spustit synchronizaci"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(supplier.id)}
                                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                title="Odstranit"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {suppliers.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p>Zatím žádní dodavatelé.</p>
                        <button onClick={handleAdd} className="text-blue-600 hover:underline mt-2 text-sm">Přidat prvního</button>
                    </div>
                )}
            </div>

            <SupplierSettingsModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                supplier={editingSupplier}
                onSave={fetchSuppliers}
            />
        </div>
    );
}
