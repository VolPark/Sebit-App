'use client';

import { useState, useEffect } from 'react';
import { updateOfferItem, getItemTypes, createItemType, uploadOfferImage } from '@/lib/api/nabidky-api';
import CreatableComboBox, { ComboBoxItem } from '@/components/CreatableCombobox';
import { NabidkaPolozka } from '@/lib/types/nabidky-types';
import { compressImage } from '@/lib/utils/image-utils';

interface EditOfferItemModalProps {
    item: NabidkaPolozka;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditOfferItemModal({ item, onClose, onSaved }: EditOfferItemModalProps) {
    const [loading, setLoading] = useState(false);

    const [nazev, setNazev] = useState(item.nazev);
    const [typ, setTyp] = useState<ComboBoxItem | null>({ id: item.typ, name: item.typ });
    const [availableTypes, setAvailableTypes] = useState<ComboBoxItem[]>([]);
    const [mnozstvi, setMnozstvi] = useState(item.mnozstvi);
    const [cenaKs, setCenaKs] = useState(item.cena_ks.toString());
    const [popis, setPopis] = useState(item.popis || '');
    const [sazbaDph, setSazbaDph] = useState(item.sazba_dph || 21);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState(item.obrazek_url || null);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            const types = await getItemTypes();
            const formatted = types.map(t => ({ id: t.id, name: t.nazev }));
            setAvailableTypes(formatted);

            // Try to find matching object for current type string
            const found = formatted.find(t => t.name.toLowerCase() === item.typ.toLowerCase());
            if (found) setTyp(found);
            else setTyp({ id: item.typ, name: item.typ }); // Keep original if not in list

        } catch (e) { console.error(e); }
    };

    const handleCreateType = async (name: string) => {
        try {
            const newType = await createItemType(name);
            const newItem = { id: newType.id, name: newType.nazev };
            setAvailableTypes(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
            setTyp(newItem);
        } catch (e) {
            console.error(e);
            alert('Chyba při vytváření typu.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let imageUrl = currentImageUrl;

            if (imageFile) {
                try {
                    const uploadedUrl = await uploadOfferImage(imageFile);
                    if (uploadedUrl) imageUrl = uploadedUrl;
                } catch (uploadErr: any) {
                    console.error('Image upload failed but continuing item update', uploadErr);
                    alert(`Nepodařilo se nahrát obrázek: ${uploadErr.message || JSON.stringify(uploadErr)}`);
                }
            }


            await updateOfferItem(item.id, {
                nazev,
                typ: typ?.name || 'ostatni',
                mnozstvi,
                cena_ks: parseFloat(cenaKs) || 0,
                popis: popis || null,
                sazba_dph: sazbaDph,
                obrazek_url: imageUrl
            });

            onSaved();
            onClose();
        } catch (error) {
            console.error('Error updating item:', error);
            alert('Chyba při úpravě položky.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upravit položku</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Název</label>
                            <input
                                type="text"
                                required
                                value={nazev}
                                onChange={e => setNazev(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                            />
                        </div>
                        <div>
                            <CreatableComboBox
                                items={availableTypes}
                                selected={typ}
                                setSelected={setTyp}
                                onCreate={handleCreateType}
                                label="TYP"
                                placeholder="Vyberte typ..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Popis</label>
                        <textarea
                            value={popis}
                            onChange={e => setPopis(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Množství</label>
                            <input
                                type="number"
                                min="0" step="0.1"
                                required
                                value={mnozstvi}
                                onChange={e => setMnozstvi(parseFloat(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Cena/ks (bez DPH)</label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={cenaKs}
                                onChange={e => setCenaKs(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">DPH</label>
                            <select
                                value={sazbaDph}
                                onChange={e => setSazbaDph(Number(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                            >
                                <option value={21}>21%</option>
                                <option value={12}>12%</option>
                                <option value={0}>0%</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Obrázek</label>
                        <div className="flex items-center gap-4">
                            {currentImageUrl && (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                    <img src={currentImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            const compressed = await compressImage(file);
                                            setImageFile(compressed);
                                        } catch (err) {
                                            console.error("Compression failed", err);
                                            setImageFile(file);
                                        }
                                    }
                                }}
                                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                            />
                        </div>
                        {currentImageUrl && (
                            <button
                                type="button"
                                onClick={() => setCurrentImageUrl(null)}
                                className="text-xs text-red-500 hover:text-red-700 mt-1 font-medium"
                            >
                                Odebrat současný obrázek
                            </button>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-[#E30613] hover:bg-[#C00000] text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
                        >
                            {loading ? 'Ukládám...' : 'Uložit změny'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
