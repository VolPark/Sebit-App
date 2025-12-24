'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nabidka } from '@/lib/types/nabidky-types';
import { getNabidkaById, updateNabidka, getClients, getActions, createClient, createAction, getStatuses, getOfferItems } from '@/lib/api/nabidky-api';
import { NabidkaPolozka } from '@/lib/types/nabidky-types';
import Link from 'next/link';
import CreatableComboBox, { ComboBoxItem } from '@/components/CreatableCombobox';
import OfferItemsList from '@/components/nabidky/OfferItemsList';
import AddOfferItemForm from '@/components/nabidky/AddOfferItemForm';
import dynamic from 'next/dynamic';
const OfferPdfDownloadButton = dynamic(
    () => import('@/components/nabidky/OfferPdfDownloadButton'),
    {
        ssr: false,
        loading: () => <button className="text-gray-400 text-sm px-4">Načítám PDF...</button>,
    }
);

export default function NabidkaDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [offer, setOffer] = useState<Nabidka | null>(null);
    const [items, setItems] = useState<NabidkaPolozka[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State (Always Active)
    const [name, setName] = useState('');
    const [client, setClient] = useState<ComboBoxItem | null>(null);
    const [action, setAction] = useState<ComboBoxItem | null>(null);
    const [validUntil, setValidUntil] = useState('');
    const [note, setNote] = useState('');
    const [statusId, setStatusId] = useState<number | null>(null);

    // Options
    const [clients, setClients] = useState<ComboBoxItem[]>([]);
    const [allActions, setAllActions] = useState<any[]>([]);

    const [statuses, setStatuses] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getNabidkaById(id);
            if (!data) {
                // Handle case where offer is not found (although component handles null offer render later, let's allow it to flow through or return)
                // If data is null, the subsequent render will show "Nabídka nenalezena" because offer is null.
                // But we must NOT continue here to access data properties.
                setLoading(false);
                return;
            }
            setOffer(data);

            // Initialize Form State
            setName(data.nazev);
            const c = data.klienti ? { id: data.klienti.id, name: data.klienti.nazev } : null;
            setClient(c);
            const a = data.akce ? { id: data.akce.id, name: data.akce.nazev } : null;
            setAction(a);
            setValidUntil(data.platnost_do || '');
            setNote(data.poznamka || '');
            setStatusId(data.stav_id || (data.nabidky_stavy?.id || null));

            // Load items
            const itemsData = await getOfferItems(id);
            setItems(itemsData);

            // Load options
            const [clientsData, actionsData, statusesData] = await Promise.all([getClients(), getActions(), getStatuses()]);
            setClients(clientsData.map(c => ({ id: c.id, name: c.nazev })));
            setAllActions(actionsData);
            setStatuses(statusesData);

        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const updateField = async (payload: Partial<Nabidka>) => {
        if (!offer) return;
        setSaving(true);
        try {
            await updateNabidka(offer.id, payload);
            // We update the local offer object slightly to reflect changes without full reload if needed,
            // but for simplicity and correctness with relations, we might want to reload or just trust the state.
            // For now, let's keep the `offer` object roughly in sync or just rely on local state for UI.
            // A full reload ensures relations (like new action/client names) are correct if they changed.
            // await loadData(); // Heavy for every keystroke/blur, maybe just setSaving(false) is enough?
            // Actually, for things like status color etc, we rely on `offer.nabidky_stavy`.
            // Let's reload only for Status or Client change which affects other UI parts significantly.
            if (payload.stav_id || payload.klient_id || payload.akce_id) {
                await loadData();
            }
        } catch (e) {
            console.error('Save failed', e);
            alert('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    // --- Handlers ---

    const handleNameBlur = () => {
        if (offer && name !== offer.nazev) {
            updateField({ nazev: name });
        }
    };

    const handleNoteBlur = () => {
        if (offer && note !== (offer.poznamka || '')) {
            updateField({ poznamka: note });
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setValidUntil(val);
        // Date input changes "commit" naturally, but let's debounce or save on blur?
        // Actually, change on date picker is usually definite. Let's save immediately.
        updateField({ platnost_do: val || undefined });
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = Number(e.target.value);
        const newStatus = statuses.find(s => s.id === val);

        // Auto-create action if Accepted and no action exists
        if (newStatus?.nazev === 'Akceptováno' && !action && offer) {
            setSaving(true);
            try {
                // Create Action
                const createdAction = await createAction({
                    nazev: name, // Use current offer name
                    klient_id: client?.id !== 'NEW' ? client?.id as number : null,
                    // datum is handled by backend default or we can send today
                });

                // Update Offer with new Status AND new Action
                await updateNabidka(offer.id, {
                    stav_id: val,
                    akce_id: createdAction.id
                });

                // Update Local State
                setAction({ id: createdAction.id, name: createdAction.nazev });
                setStatusId(val);

                // Refresh data to be safe
                await loadData();
            } catch (err) {
                console.error("Failed to auto-create action", err);
                alert("Chyba při zakládání akce");
            } finally {
                setSaving(false);
            }
        } else {
            // Normal status update
            setStatusId(val);
            updateField({ stav_id: val });
        }
    };

    const handleClientChange = (newClient: ComboBoxItem | null) => {
        setClient(newClient);

        // Check if existing action belongs to new client
        if (newClient && newClient.id !== 'NEW') {
            if (action) {
                const actionMatches = allActions.find(a => a.id === action.id && a.klient_id === newClient.id);
                if (!actionMatches) {
                    setAction(null);
                    updateField({ klient_id: newClient.id as number, akce_id: null });
                    return;
                }
            }
            updateField({ klient_id: newClient.id as number });
        } else {
            if (newClient === null) {
                updateField({ klient_id: null });
            }
        }
    };

    const handleCreateClient = async (name: string) => {
        try {
            const newClient = await createClient(name);
            const clientItem = { id: newClient.id, name: newClient.nazev };
            setClients(prev => [...prev, clientItem].sort((a, b) => a.name.localeCompare(b.name)));
            setClient(clientItem);
            // Save immediately
            updateField({ klient_id: newClient.id });
            // New client has no actions, reset action state if it was somehow set
            if (action) {
                setAction(null);
                updateField({ klient_id: newClient.id, akce_id: null });
            } else {
                updateField({ klient_id: newClient.id });
            }

        } catch (error) { console.error(error); alert('Chyba'); }
    };



    if (loading) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400 max-w-7xl mx-auto mt-20">Načítám detail nabídky...</div>;
    }

    if (!offer) {
        return (
            <div className="p-8 text-center max-w-7xl mx-auto mt-20">
                <h2 className="text-xl text-gray-900 dark:text-white mb-2">Nabídka nenalezena</h2>
                <Link href="/nabidky" className="text-[#E30613] hover:underline font-medium">Zpět na seznam</Link>
            </div>
        );
    }

    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    // Find current status object to get color for select styling
    const currentStatus = statuses.find(s => s.id === statusId);

    return (
        <div className="w-full px-4 md:px-6 mx-auto mt-8 space-y-8">
            {/* Header */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <Link href="/nabidky" className="group text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Zpět na seznam
                    </Link>
                    {saving && <span className="text-xs text-gray-400 font-medium animate-pulse">Ukládám...</span>}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
                    <div className="w-full md:w-3/4 space-y-4">
                        {/* Name Input */}
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-light text-gray-400 select-none">{offer.cislo || `#${offer.id}`}</span>
                            <input
                                className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[#E30613] w-full focus:outline-none transition-colors px-1"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={handleNameBlur}
                                placeholder="Název nabídky"
                            />
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Client */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 font-medium ml-1">Klient</label>
                                <CreatableComboBox
                                    items={clients} selected={client} setSelected={handleClientChange} onCreate={handleCreateClient} placeholder="Vybrat klienta..."
                                />
                            </div>

                            {/* Action (Read-only / Auto) */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 font-medium ml-1">Akce</label>
                                <div className="text-sm p-2.5 dark:text-gray-300 min-h-[42px] flex items-center">
                                    {action ? (
                                        <div className="font-semibold text-blue-600">
                                            {action.name}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic text-xs">Vytvoří se po akceptaci</span>
                                    )}
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 font-medium ml-1">Platnost do</label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={handleDateChange}
                                    className="w-full text-sm rounded-xl border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 dark:text-white focus:ring-[#E30613] focus:border-[#E30613] shadow-sm"
                                />
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 font-medium ml-1">Stav</label>
                                <div className="relative">
                                    <select
                                        value={statusId || ''}
                                        onChange={handleStatusChange}
                                        className={`w-full appearance-none text-sm font-bold rounded-xl border-gray-300 dark:border-slate-700 p-2.5 pr-8 focus:ring-[#E30613] focus:border-[#E30613] shadow-sm cursor-pointer
                                            ${currentStatus?.color === 'green' ? 'bg-[#f0fdf4] text-[#15803d]' :
                                                currentStatus?.color === 'blue' ? 'bg-[#eff6ff] text-[#1d4ed8]' :
                                                    currentStatus?.color === 'red' ? 'bg-[#fef2f2] text-[#b91c1c]' :
                                                        currentStatus?.color === 'orange' ? 'bg-[#fff7ed] text-[#c2410c]' : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-white'
                                            }`}
                                    >
                                        {statuses.map(s => (
                                            <option key={s.id} value={s.id} className="bg-white text-gray-900">{s.nazev}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price Box */}
                    <div className="text-right bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 w-full md:w-auto min-w-[200px]">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                            {currency.format(offer.celkova_cena)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mt-1">Celková cena</div>
                        <div className="mt-4">
                            <OfferPdfDownloadButton offer={offer} items={items} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Položky nabídky</h3>
                    <div className="text-right">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Celkem položky:</span>
                        <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                            {currency.format(items.reduce((sum, i) => sum + (Number(i.celkem) || 0), 0))}
                        </span>
                    </div>
                </div>

                <OfferItemsList items={items} nabidkaId={id} onRefresh={loadData} />

                <AddOfferItemForm nabidkaId={id} onAdded={loadData} />
            </div>

            {/* Notes Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Poznámky
                </h3>
                <div className="relative">
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onBlur={handleNoteBlur}
                        className="w-full text-sm rounded-xl border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/50 p-4 dark:text-gray-300 focus:ring-[#E30613] focus:border-[#E30613] min-h-[120px] shadow-inner"
                        placeholder="Zde můžete připsat interní poznámky k nabídce..."
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                        {saving ? 'Ukládám...' : 'Kliknutím mimo uložíte'}
                    </div>
                </div>
            </div>
        </div>
    );
}
