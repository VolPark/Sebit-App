'use client';

import { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import ScannerModal from './ScannerModal';
import { getInventoryItemByEan, createMovement, InventoryItem, createInventoryItem, updateInventoryItem, searchInventoryItems } from '@/lib/api/inventory-api';

type InventoryActionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    type: 'RECEIPT' | 'ISSUE'; // Příjem / Výdej
    onSuccess: () => void;
};

export default function InventoryActionModal({ isOpen, onClose, type, onSuccess }: InventoryActionModalProps) {
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [ean, setEan] = useState('');
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [name, setName] = useState(''); // For new items
    const [price, setPrice] = useState<number>(0); // Purchase price

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        setItem(null); // Clear selection when searching to allow new input
        if (term.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            const results = await searchInventoryItems(term);
            setSuggestions(results);
        } catch (e) {
            console.error(e);
        }
    };

    const selectItem = (selected: InventoryItem | null) => {
        if (selected) {
            setItem(selected);
            setName(selected.name);
            setEan(selected.ean || '');
            setPrice(selected.avg_price || 0);
            setQuantity(1);
            setSuggestions([]);
            setSearchTerm('');
        } else {
            // Reset if cleared
            setItem(null);
            setName('');
            setEan('');
            setPrice(0);
            setQuantity(1);
        }
    };

    // Reset state when opening
    // (useEffect omitted for brevity, assuming component remounts or managed by parent)

    const handleScan = async (code: string) => {
        const cleanCode = code.trim();
        setEan(cleanCode);
        setIsScannerOpen(false);
        await findItem(cleanCode);
    };

    const findItem = async (code: string) => {
        setLoading(true);
        try {
            const cleanCode = code.trim();
            const found = await getInventoryItemByEan(cleanCode);
            if (found) {
                setItem(found);
                setName(found.name);
                setPrice(found.avg_price || 0);
                setQuantity(1);
            } else {
                setItem(null);
                setName('');
                setPrice(0);
                setQuantity(1);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name) return alert('Vyplňte název položky');
        setLoading(true);
        try {
            let itemId = item?.id;

            // 1. Create or Update Item
            if (!item) {
                // New Item
                const newItem = await createInventoryItem({
                    name,
                    ean: ean || undefined,
                    quantity: 0, // Will be updated by movement
                    avg_price: price || 0,
                    // TODO: unit selection
                });
                itemId = newItem.id;
            } else {
                // Determine if we need to update anything (like name if changed?)
                // skipping for now
            }

            if (!itemId) throw new Error("Failed to resolve item ID");

            // 2. Create Movement
            await createMovement({
                inventory_item_id: itemId,
                type: type,
                quantity_change: type === 'RECEIPT' ? quantity : -quantity, // Positive for receipt, negative for issue
                price: price,
                quantity: quantity, // Absolute amount
                // user_id handled by RLS typically or backend default, but good to pass if we have context. 
                // Since this is client side, RLS auth.uid() works.
            });

            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Chyba při ukládání');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-xl font-bold ${type === 'RECEIPT' ? 'text-green-600' : 'text-orange-600'}`}>
                            {type === 'RECEIPT' ? 'Příjem na sklad' : 'Výdej ze skladu'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-4">




                        <div className="space-y-4">
                            {/* Manual Search */}
                            <div className="relative z-20">
                                <Combobox as="div" value={item} onChange={selectItem} nullable>
                                    <Combobox.Label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Vyhledat položku (Název)</Combobox.Label>
                                    <div className="relative">
                                        <Combobox.Input
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                            onChange={(event) => handleSearch(event.target.value)}
                                            displayValue={(item: InventoryItem) => item?.name || searchTerm}
                                            placeholder="Začněte psát název..."
                                            autoComplete="off"
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-4">
                                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-5.03 8.22a.75.75 0 011.06 0L10 15.19l2.97-2.97a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                                            </svg>
                                        </Combobox.Button>
                                    </div>
                                    <Transition
                                        as={Fragment}
                                        leave="transition ease-in duration-100"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                        afterLeave={() => setSearchTerm('')}
                                    >
                                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-slate-900 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-slate-700 focus:outline-none sm:text-sm">
                                            {suggestions.length === 0 && searchTerm.length >= 2 ? (
                                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-400">
                                                    Nic nenalezeno.
                                                </div>
                                            ) : (
                                                suggestions.map((s) => (
                                                    <Combobox.Option
                                                        key={s.id}
                                                        value={s}
                                                        className={({ active }) =>
                                                            `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-white' : 'text-gray-900 dark:text-gray-100'
                                                            }`
                                                        }
                                                    >
                                                        {({ selected, active }) => (
                                                            <div className="flex justify-between items-center">
                                                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                    {s.name}
                                                                </span>
                                                                <span className={`text-xs ${active ? 'text-blue-200' : 'text-gray-500'}`}>
                                                                    {s.quantity} {s.unit}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </Combobox.Options>
                                    </Transition>
                                </Combobox>
                            </div>

                            {/* EAN / Skenování */}
                            <div className="flex gap-2 p-4 bg-gray-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <div className="relative flex-1">
                                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">EAN / Kód</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={ean}
                                            onChange={(e) => setEan(e.target.value)}
                                            onBlur={(e) => findItem(e.target.value)}
                                            placeholder="Naskenujte nebo zadejte kód..."
                                            className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => setIsScannerOpen(true)}
                                            className="bg-gray-900 text-white p-3 rounded-xl hover:bg-gray-800 transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 16h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Položka Info */}
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Název položky</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Název produktu"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                />
                                {item && <p className="text-xs text-green-600 mt-1">✓ Položka nalezena ve skladu (Aktuálně: {item.quantity} {item.unit})</p>}
                                {!item && ean && !loading && name && <p className="text-xs text-orange-500 mt-1">+ Bude založena nová karta</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Množství</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">
                                        {type === 'RECEIPT' ? 'Nákupní cena / ks' : 'Prodejní cena (volitelné)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(Number(e.target.value))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-[0.98] ${type === 'RECEIPT' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                                    }`}
                            >
                                {loading ? 'Ukládám...' : (type === 'RECEIPT' ? 'Přijmout na sklad' : 'Vydat ze skladu')}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            <ScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
            />
        </>
    );
}
