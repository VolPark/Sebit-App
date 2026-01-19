'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Package, Plus, X, Loader2, Warehouse, Store } from 'lucide-react';
import { InventoryItem } from '@/lib/api/inventory-api';

interface CatalogBrowserProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (item: any) => void;
}

type Source = 'SUPPLIER' | 'LOCAL';

export function CatalogBrowser({ open, onOpenChange, onSelect }: CatalogBrowserProps) {
    const [source, setSource] = useState<Source>('SUPPLIER');
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        searchItems(searchTerm);
    }, [searchTerm, open, source]);

    const searchItems = async (term: string) => {
        setLoading(true);
        try {
            if (source === 'SUPPLIER') {
                let query = supabase
                    .from('supplier_items')
                    .select('*, suppliers(name)')
                    .limit(50);

                if (term && term.length > 2) {
                    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
                }
                const { data, error } = await query;
                if (error) throw error;
                setItems(data || []);

            } else {
                // LOCAL WAREHOUSE
                let query = supabase
                    .from('inventory_items')
                    .select('*, stocks:inventory_stock(*)')
                    .eq('is_active', true)
                    .limit(50);

                if (term && term.length > 2) {
                    query = query.or(`name.ilike.%${term}%,ean.ilike.%${term}%,sku.ilike.%${term}%`);
                }

                const { data, error } = await query;
                if (error) throw error;
                setItems(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: any) => {
        if (source === 'SUPPLIER') {
            onSelect(item);
        } else {
            // Map InventoryItem to the format expected by consumer (Catalog formatish)
            // or just pass enough info so AddOfferItemForm works.
            // AddOfferItemForm expects: name, price (avg_price), description, image_url
            // It also tries to match category/type from item.category - we don't have category on inventory_items usually easily mapped, or maybe we do?
            // InventoryItem has: name, description, avg_price, image_url.
            onSelect({
                name: item.name,
                price: item.avg_price || 0,
                description: item.description,
                image_url: item.image_url,
                code: item.sku || item.ean,
                // type/category mapping if possible?
            });
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex flex-col border-b border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center p-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {source === 'SUPPLIER' ? <Store className="w-5 h-5 text-purple-600" /> : <Warehouse className="w-5 h-5 text-blue-600" />}
                            {source === 'SUPPLIER' ? 'Katalog Dodavatelů' : 'Můj Sklad'}
                        </h2>
                        <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-4 gap-4">
                        <button
                            onClick={() => setSource('SUPPLIER')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${source === 'SUPPLIER' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store className="w-4 h-4" /> Externí Dodavatelé
                        </button>
                        <button
                            onClick={() => setSource('LOCAL')}
                            className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${source === 'LOCAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Warehouse className="w-4 h-4" /> Můj Sklad
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={source === 'SUPPLIER' ? "Hledat podle názvu nebo kódu..." : "Hledat na skladě (Název, EAN, SKU)..."}
                            className="w-full pl-9 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-slate-400 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" /> Načítám...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60">
                            <Package className="w-12 h-12" />
                            <p>Žádné položky nenalezeny</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {items.map(item => (
                                <div key={item.id} className={`group flex items-center gap-4 p-3 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${source === 'SUPPLIER' ? 'hover:border-purple-200' : 'hover:border-blue-200'}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    <div className="w-12 h-12 rounded-md bg-white dark:bg-black border border-slate-100 dark:border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Package className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h4>
                                            {(item.code || item.sku || item.ean) && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                                    {item.code || item.sku || item.ean}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate flex gap-2">
                                            {source === 'SUPPLIER' ? (
                                                <span>{item.suppliers?.name}</span>
                                            ) : (
                                                <span className="text-blue-600 font-medium">Skladem: {item.quantity} {item.unit}</span>
                                            )}
                                            {item.description && <span className="opacity-50">• {item.description}</span>}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: item.currency || 'CZK' }).format(item.price || item.avg_price || 0)}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            za {item.unit || 'ks'}
                                        </div>
                                    </div>

                                    <button className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${source === 'SUPPLIER' ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'}`}>
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
