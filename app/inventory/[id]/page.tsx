'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInventoryItemById, updateInventoryItem, getMovements, InventoryItem, InventoryMovement, uploadInventoryImage } from '@/lib/api/inventory-api';
import Link from 'next/link';
import { compressImage } from '@/lib/utils/image-utils';

export default function InventoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [item, setItem] = useState<InventoryItem | null>(null);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HISTORY'>('OVERVIEW');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [itemData, movementData] = await Promise.all([
                getInventoryItemById(id),
                getMovements(id, 100)
            ]);
            setItem(itemData);
            setFormData(itemData);
            setMovements(movementData);
        } catch (e) {
            console.error("Failed to load inventory item", e);
            // alert("Položka nebyla nalezena");
            // router.push('/inventory');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                try {
                    const uploadedUrl = await uploadInventoryImage(imageFile);
                    if (uploadedUrl) finalImageUrl = uploadedUrl;
                } catch (uploadErr) {
                    console.error('Image upload failed', uploadErr);
                    alert('Nepodařilo se nahrát obrázek, ukládám zbytek...');
                }
            }

            const updated = await updateInventoryItem(id, {
                name: formData.name,
                manufacturer: formData.manufacturer,
                ean: formData.ean,
                sku: formData.sku,
                description: formData.description,
                image_url: finalImageUrl,
                min_quantity: formData.min_quantity,
                unit: formData.unit,
                location: formData.location
            });
            setItem(updated);
            setShowSuccessModal(true);
        } catch (e) {
            console.error(e);
            alert("Chyba při ukládání");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Načítám detail položky...</div>;
    if (!item) return <div className="p-8 text-center text-red-500">Položka nenalezena</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
                            {item.manufacturer && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{item.manufacturer}</span>}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex gap-4 text-sm font-mono">
                            {item.ean && <span>EAN: {item.ean}</span>}
                            {item.sku && <span>SKU: {item.sku}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-right">
                        <div className="text-xs text-gray-400 font-bold uppercase">Skladem</div>
                        <div className={`text-xl font-bold ${item.quantity <= (item.min_quantity || 0) ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                            {item.quantity} <span className="text-sm font-normal text-gray-400">{item.unit}</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-right">
                        <div className="text-xs text-gray-400 font-bold uppercase">Prům. Cena</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {item.avg_price?.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-800">
                <button
                    onClick={() => activeTab !== 'OVERVIEW' && setActiveTab('OVERVIEW')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'OVERVIEW'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Přehled & Úpravy
                </button>
                <button
                    onClick={() => activeTab !== 'HISTORY' && setActiveTab('HISTORY')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'HISTORY'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Historie pohybů
                </button>
            </div>

            {/* Content */}
            {activeTab === 'OVERVIEW' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column - Form */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Základní informace</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Název položky</label>
                                <input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Výrobce</label>
                                <input
                                    value={formData.manufacturer || ''}
                                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                                    placeholder="Např. Samsung, Apple, ..."
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">EAN (Čárový kód)</label>
                                <input
                                    value={formData.ean || ''}
                                    onChange={e => setFormData({ ...formData, ean: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">SKU (Interní kód)</label>
                                <input
                                    value={formData.sku || ''}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Popis</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Lokace</label>
                                <input
                                    value={formData.location || ''}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Regál A..."
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Min. Množství</label>
                                <input
                                    type="number"
                                    value={formData.min_quantity || 0}
                                    onChange={e => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Jednotka</label>
                                <input
                                    value={formData.unit || 'ks'}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[#E30613] hover:bg-[#C90510] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? 'Ukládám...' : 'Uložit změny'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Image & Quick Actions */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Obrázek</h3>
                            <div className="aspect-square bg-gray-100 dark:bg-slate-950 rounded-xl overflow-hidden mb-4 flex items-center justify-center border border-dashed border-gray-300 dark:border-slate-700 relative group">
                                {imageFile ? (
                                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                                ) : formData.image_url ? (
                                    <img src={formData.image_url} alt="Náhled" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 text-center">
                                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm">Bez obrázku</span>
                                    </div>
                                )}

                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-bold">
                                    <span>Změnit obrázek</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    const compressed = await compressImage(file);
                                                    setImageFile(compressed);
                                                } catch (err) {
                                                    console.error(err);
                                                    setImageFile(file);
                                                }
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Nebo URL Obrázku</label>
                                <input
                                    value={formData.image_url || ''}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* History Tab */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Datum</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Typ pohybu</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Množství</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Cena / ks</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Strůjce</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {movements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Žádné pohyby v historii</td>
                                </tr>
                            ) : (
                                movements.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {new Date(m.created_at).toLocaleString('cs-CZ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${m.type === 'RECEIPT' ? 'bg-green-100 text-green-800' :
                                                    m.type === 'ISSUE' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {m.type === 'RECEIPT' ? 'Příjem' : m.type === 'ISSUE' ? 'Výdej' : m.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${m.quantity_change > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                            {m.quantity_change > 0 ? '+' : ''}{m.quantity_change} {item.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {m.price ? m.price.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                            {m.profiles?.email || 'Neznámý'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Uloženo</h3>
                            <p className="text-gray-500 dark:text-gray-400">Změny byly úspěšně uloženy.</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
