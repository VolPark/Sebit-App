'use client';

import { useState, useEffect } from 'react';
import { createOfferItem, getItemTypes, createItemType, uploadOfferImage } from '@/lib/api/nabidky-api';
import CreatableComboBox, { ComboBoxItem } from '@/components/CreatableCombobox';
import { compressImage } from '@/lib/utils/image-utils';

interface AddOfferItemFormProps {
    nabidkaId: number;
    onAdded: () => void;
}

export default function AddOfferItemForm({ nabidkaId, onAdded }: AddOfferItemFormProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [nazev, setNazev] = useState('');
    const [typ, setTyp] = useState<ComboBoxItem | null>(null);
    const [availableTypes, setAvailableTypes] = useState<ComboBoxItem[]>([]);
    const [mnozstvi, setMnozstvi] = useState(1);
    const [cenaKs, setCenaKs] = useState('');
    const [popis, setPopis] = useState('');
    const [sazbaDph, setSazbaDph] = useState(21);
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            const types = await getItemTypes();
            const formatted = types.map(t => ({ id: t.id, name: t.nazev }));
            setAvailableTypes(formatted);
            // Default select 'skrinka' if exists, else first
            const defaultType = formatted.find(t => t.name.toLowerCase() === 'skříňka') || formatted[0];
            if (defaultType && !typ) setTyp(defaultType);
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
            let imageUrl = undefined;
            if (imageFile) {
                try {
                    const uploadedUrl = await uploadOfferImage(imageFile);
                    if (uploadedUrl) imageUrl = uploadedUrl;
                } catch (uploadErr) {
                    console.error('Image upload failed but continuing item creation', uploadErr);
                    alert('Nepodařilo se nahrát obrázek, položka bude vytvořena bez něj.');
                }
            }

            await createOfferItem({
                nabidka_id: nabidkaId,
                nazev,
                typ: typ?.name || 'ostatni', // Save the Name as text
                mnozstvi,
                cena_ks: parseFloat(cenaKs) || 0,
                popis: popis || null,
                sazba_dph: sazbaDph,
                obrazek_url: imageUrl
            });

            // Reset
            setNazev('');
            setMnozstvi(1);
            setCenaKs('');
            setPopis('');
            setSazbaDph(21);
            setImageFile(null);

            // Clean file input
            const fileInput = document.getElementById('offer-item-image') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            onAdded();
            // Don't close, user might want to add more
        } catch (error: any) {
            console.error('Error adding item:', error);
            console.error('Error details:', error.details, error.hint, error.message, error.code);
            alert(`Chyba při přidávání položky: ${error.message || JSON.stringify(error)} \nDetails: ${error.details || ''} \nHint: ${error.hint || ''}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full py-3 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Přidat položku
            </button>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nová položka</h3>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Row 1: Basic Info */}
                    <div className="md:col-span-8">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Název</label>
                        <input
                            type="text"
                            required
                            value={nazev}
                            onChange={e => setNazev(e.target.value)}
                            placeholder="Např. Horní skříňka 60cm"
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                        />
                    </div>
                    <div className="md:col-span-4">
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

                {/* Row 2: Description */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Popis (Materiál, kování...)</label>
                    <textarea
                        value={popis}
                        onChange={e => setPopis(e.target.value)}
                        placeholder="Detailní popis položky, použitý materiál, kování, barva..."
                        rows={2}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] resize-y"
                    />
                </div>

                {/* Row 3: Image, Amount, Price, VAT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Obrázek (Vizualizace)</label>
                        <input
                            id="offer-item-image"
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
                                        // Fallback to original
                                        setImageFile(file);
                                    }
                                }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Ks</label>
                        <input
                            type="number"
                            min="0" step="0.1"
                            required
                            value={mnozstvi}
                            onChange={e => setMnozstvi(parseFloat(e.target.value))}
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Cena/ks (bez DPH)</label>
                        <input
                            type="number"
                            min="0"
                            required
                            value={cenaKs}
                            onChange={e => setCenaKs(e.target.value)}
                            placeholder="0"
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">DPH</label>
                        <select
                            value={sazbaDph}
                            onChange={e => setSazbaDph(Number(e.target.value))}
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                        >
                            <option value={21}>21%</option>
                            <option value={12}>12%</option>
                            <option value={0}>0%</option>
                        </select>
                    </div>

                    <div className="md:col-span-1">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-[42px] bg-[#E30613] hover:bg-[#C00000] text-white rounded-xl font-bold transition-all flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? '...' : '+'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
