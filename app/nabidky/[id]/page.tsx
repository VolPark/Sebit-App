'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Nabidka } from '@/lib/types/nabidky-types';
import { getNabidkaById, updateNabidka, getClients, getActions, createClient, createAction, getStatuses, getOfferItems, getDivisionsList } from '@/lib/api/nabidky-api';
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
    const [uvodniText, setUvodniText] = useState('');
    const [statusId, setStatusId] = useState<number | null>(null);
    const [divisionId, setDivisionId] = useState<number | null>(null);

    // Options
    const [clients, setClients] = useState<ComboBoxItem[]>([]);
    const [allActions, setAllActions] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);

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
            setUvodniText(data.uvodni_text || '');
            setStatusId(data.stav_id || (data.nabidky_stavy?.id || null));
            setDivisionId(data.division_id || null);

            // Load items
            const itemsData = await getOfferItems(id);
            setItems(itemsData);

            // Load options
            const [clientsData, actionsData, statusesData, divisionsData] = await Promise.all([getClients(), getActions(), getStatuses(), getDivisionsList()]);
            setClients(clientsData.map(c => ({ id: c.id, name: c.nazev })));
            setAllActions(actionsData);
            setStatuses(statusesData);
            setDivisions(divisionsData);

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

            // Update local state to reflect changes immediately (important for PDF generation etc.)
            setOffer(prev => prev ? ({ ...prev, ...payload }) : null);

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

    const handleUvodniTextBlur = () => {
        if (offer && uvodniText !== (offer.uvodni_text || '')) {
            updateField({ uvodni_text: uvodniText });
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
        <div className="w-full px-4 md:px-8 mx-auto mt-6 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <Link href="/nabidky" className="group text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Zpět na seznam
                    </Link>
                    {saving && <span className="text-xs text-gray-400 font-medium animate-pulse">Ukládám změny...</span>}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-4xl font-light text-gray-300 select-none tracking-tighter">{offer.cislo || `#${offer.id}`}</span>
                    <input
                        className="text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[#E30613] w-full focus:outline-none transition-all px-1 tracking-tight"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Název nabídky"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - Left Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* General Info Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Základní informace
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Client */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Klient</label>
                                <CreatableComboBox
                                    items={clients} selected={client} setSelected={handleClientChange} onCreate={handleCreateClient} placeholder="Vybrat klienta..."
                                />
                            </div>

                            {/* Division */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Divize</label>
                                <div className="relative">
                                    <select
                                        value={divisionId || ''}
                                        onChange={(e) => {
                                            const val = Number(e.target.value) || null;
                                            setDivisionId(val);
                                            updateField({ division_id: val });
                                        }}
                                        className="w-full appearance-none text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-4 pr-10 dark:text-white focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] focus:outline-none transition-all cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 shadow-sm"
                                    >
                                        <option value="">-- Žádná --</option>
                                        {divisions.map(d => (
                                            <option key={d.id} value={d.id}>{d.nazev}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-5.03 8.22a.75.75 0 011.06 0L10 15.19l2.97-2.97a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Akce</label>
                                <div className="text-sm py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 dark:text-gray-300 min-h-[46px] flex items-center shadow-sm">
                                    {action ? (
                                        <Link href={`/akce`} className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                                            {action.name}
                                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 italic text-xs flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Vytvoří se automaticky po akceptaci
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Validity */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Platnost do</label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={handleDateChange}
                                    className="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 px-4 dark:text-white focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] focus:outline-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-slate-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Položky nabídky</h3>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Celkem za položky</div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                                    {currency.format(items.reduce((sum, i) => sum + (Number(i.celkem) || 0), 0))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <OfferItemsList items={items} nabidkaId={id} onRefresh={loadData} />
                            <AddOfferItemForm nabidkaId={id} onAdded={loadData} />
                        </div>
                    </div>

                    {/* Intro Text Section (shown in PDF) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Úvodní text nabídky
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tento text se zobrazí v PDF nabídce pod datem. Pokud necháte prázdné, použije se výchozí text.</p>
                        <div className="relative group">
                            <textarea
                                value={uvodniText}
                                onChange={e => setUvodniText(e.target.value)}
                                onBlur={handleUvodniTextBlur}
                                className="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/50 p-4 dark:text-gray-300 focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] min-h-[100px] transition-all resize-y"
                                placeholder="Předkládáme Vám orientační cenovou nabídku na výrobu a montáž dle předloženého návrhu. Finální cenová nabídka bude vytvořena po společné schůzce a vyjasnění veškerých detailů, materiálů a provedení."
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100">
                                {saving ? 'Ukládám...' : 'Kliknutím mimo uložíte'}
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Poznámky
                        </h3>
                        <div className="relative group">
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                onBlur={handleNoteBlur}
                                className="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/50 p-4 dark:text-gray-300 focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] min-h-[120px] transition-all resize-y"
                                placeholder="Zde můžete připsat interní poznámky k nabídce..."
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100">
                                {saving ? 'Ukládám...' : 'Kliknutím mimo uložíte'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Right Column */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Status Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:sticky lg:top-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Stav nabídky</h3>
                        <div className="relative">
                            <select
                                value={statusId || ''}
                                onChange={handleStatusChange}
                                className={`w-full appearance-none text-base font-bold rounded-xl border-slate-200 dark:border-slate-700 p-4 pr-10 focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] shadow-sm cursor-pointer transition-all
                                        ${currentStatus?.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                        currentStatus?.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                            currentStatus?.color === 'red' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                                currentStatus?.color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' :
                                                    'bg-white dark:bg-slate-900 text-gray-700 dark:text-white hover:bg-gray-50'
                                    }`}
                            >
                                {statuses.map(s => (
                                    <option key={s.id} value={s.id} className="bg-white text-gray-900">{s.nazev}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                <svg className={`w-5 h-5 ${currentStatus ? 'text-current opacity-70' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </div>
                        </div>

                        {/* Price Summary Card (Integrated in Sidebar) */}
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">Celková cena nabídky</div>
                            <div className="text-4xl font-black text-[#E30613] tabular-nums tracking-tight">
                                {currency.format(offer.celkova_cena)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">bez DPH (informativní)</div>

                            <div className="mt-8">
                                <OfferPdfDownloadButton offer={offer} items={items} />
                                <p className="text-center text-xs text-gray-400 mt-3">
                                    Generování PDF může chvíli trvat.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
