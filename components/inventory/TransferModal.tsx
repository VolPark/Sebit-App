'use client';

import { useState, useEffect } from 'react';
import { InventoryCenter, InventoryItem, transferStock, getCenters } from '@/lib/api/inventory-api';

type TransferModalProps = {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem;
    onSuccess: () => void;
};

export default function TransferModal({ isOpen, onClose, item, onSuccess }: TransferModalProps) {
    const [loading, setLoading] = useState(false);
    const [centers, setCenters] = useState<InventoryCenter[]>([]);

    // Form State
    const [fromCenterId, setFromCenterId] = useState<number | ''>('');
    const [toCenterId, setToCenterId] = useState<number | ''>('');
    const [quantity, setQuantity] = useState<number>(1);

    // Load centers
    useEffect(() => {
        if (isOpen) {
            getCenters().then(setCenters).catch(console.error);
            // Reset form
            setFromCenterId('');
            setToCenterId('');
            setQuantity(1);
        }
    }, [isOpen]);

    // Validation helpers
    const getSourceStock = () => {
        if (!fromCenterId) return 0;
        const stock = item.stocks?.find(s => s.center_id === Number(fromCenterId));
        return stock ? stock.quantity : 0;
    };

    const maxTransfer = getSourceStock();

    const handleSubmit = async () => {
        if (!fromCenterId || !toCenterId) return alert("Vyberte zdrojové a cílové středisko");
        if (fromCenterId === toCenterId) return alert("Zdroj a cíl nemohou být stejné");
        if (quantity <= 0) return alert("Množství musí být větší než 0");
        if (quantity > maxTransfer) return alert("Nedostatek zásob na zdrojovém středisku");

        setLoading(true);
        try {
            await transferStock(item.id, Number(fromCenterId), Number(toCenterId), quantity);
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Chyba při přesunu");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Přesun zásob</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Item Info */}
                    <div className="bg-gray-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500">Celkem skladem: {item.quantity} {item.unit}</div>
                    </div>

                    {/* From */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Z (Zdroj)</label>
                        <select
                            value={fromCenterId}
                            onChange={(e) => setFromCenterId(Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Vyberte sklad...</option>
                            {item.stocks?.map(s => s.quantity > 0 && (
                                <option key={s.center_id} value={s.center_id}>
                                    {s.centers?.name} ({s.quantity} {item.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full border border-white dark:border-slate-900">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        </div>
                    </div>

                    {/* To */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Do (Cíl)</label>
                        <select
                            value={toCenterId}
                            onChange={(e) => setToCenterId(Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Vyberte sklad...</option>
                            {centers.filter(c => c.id !== Number(fromCenterId)).map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Množství k přesunu</label>
                        <input
                            type="number"
                            min="1"
                            max={maxTransfer}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            Max: {maxTransfer} {item.unit}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !fromCenterId || !toCenterId || quantity <= 0 || quantity > maxTransfer}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? 'Přesouvám...' : 'Potvrdit přesun'}
                    </button>
                </div>
            </div>
        </div>
    );
}
