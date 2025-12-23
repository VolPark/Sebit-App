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

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editClient, setEditClient] = useState<ComboBoxItem | null>(null);
    const [editAction, setEditAction] = useState<ComboBoxItem | null>(null);
    const [editValidUntil, setEditValidUntil] = useState(''); // New State

    // Options
    const [clients, setClients] = useState<ComboBoxItem[]>([]);
    const [allActions, setAllActions] = useState<any[]>([]);
    const [actionOptions, setActionOptions] = useState<ComboBoxItem[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [editStatusId, setEditStatusId] = useState<number | null>(null);

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const data = await getNabidkaById(id);
        setOffer(data);

        // Load items
        const itemsData = await getOfferItems(id);
        setItems(itemsData);

        // Load options for editing
        try {
            const [clientsData, actionsData, statusesData] = await Promise.all([getClients(), getActions(), getStatuses()]);
            setClients(clientsData.map(c => ({ id: c.id, name: c.nazev })));
            setAllActions(actionsData);
            setStatuses(statusesData);
            // Action options depends on selected client, will init when entering edit
        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    };

    const startEditing = () => {
        if (!offer) return;
        setEditName(offer.nazev);
        const c = offer.klienti ? { id: offer.klienti.id, name: offer.klienti.nazev } : null;
        setEditClient(c);

        const a = offer.akce ? { id: offer.akce.id, name: offer.akce.nazev } : null;
        setEditAction(a);

        setEditStatusId(offer.stav_id || (offer.nabidky_stavy?.id || null));
        setEditValidUntil(offer.platnost_do || ''); // Init Date

        // Init options
        if (c) {
            const filtered = allActions
                .filter(act => act.klient_id === c.id)
                .map(act => ({ id: act.id, name: act.nazev }));
            setActionOptions(filtered);
        } else {
            setActionOptions(allActions.map(act => ({ id: act.id, name: act.nazev })));
        }

        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const saveChanges = async () => {
        if (!offer) return;
        try {
            let client_id = editClient?.id as number | null;
            let akce_id = editAction?.id as number | null;

            if (client_id && String(client_id) === 'NEW') client_id = null;
            if (akce_id && String(akce_id) === 'NEW') akce_id = null;

            await updateNabidka(offer.id, {
                nazev: editName,
                klient_id: client_id,
                akce_id: akce_id,
                stav_id: editStatusId,
                platnost_do: editValidUntil || undefined // Save Date
            });
            await loadData();
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert('Chyba při ukládání změn');
        }
    };

    // Client/Action Handlers (similar to OffersTable)
    const handleClientChange = (client: ComboBoxItem | null) => {
        setEditClient(client);
        if (client && client.id !== 'NEW') {
            const filtered = allActions
                .filter(a => a.klient_id === client.id)
                .map(a => ({ id: a.id, name: a.nazev }));
            setActionOptions(filtered);
            if (editAction) {
                const actionBelongs = filtered.find(a => a.id === editAction.id);
                if (!actionBelongs) setEditAction(null);
            }
        } else {
            setActionOptions(allActions.map(a => ({ id: a.id, name: a.nazev })));
        }
    };

    const handleCreateClient = async (name: string) => {
        try {
            const newClient = await createClient(name);
            const clientItem = { id: newClient.id, name: newClient.nazev };
            setClients(prev => [...prev, clientItem].sort((a, b) => a.name.localeCompare(b.name)));
            setEditClient(clientItem);
            setActionOptions([]);
        } catch (error) { console.error(error); alert('Chyba'); }
    };

    const handleCreateAction = async (name: string) => {
        try {
            let clientId = editClient?.id !== 'NEW' ? (editClient?.id as number) : null;
            const newAction = await createAction({ nazev: name, klient_id: clientId });
            const actionItem = { id: newAction.id, name: newAction.nazev };
            setAllActions(prev => [...prev, newAction]);
            setActionOptions(prev => [...prev, actionItem]);
            setEditAction(actionItem);
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

    return (
        <div className="w-full px-4 md:px-6 mx-auto mt-8 space-y-8">
            {/* Header */}
            <div>
                <Link href="/nabidky" className="group text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4 inline-flex items-center gap-1 transition-colors">
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Zpět na seznam
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
                    <div className="w-full md:w-auto">
                        {isEditing ? (
                            <div className="space-y-4 w-full md:min-w-[400px]">
                                <input
                                    className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-transparent border-b border-gray-300 dark:border-slate-700 w-full focus:outline-none focus:border-[#E30613]"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <CreatableComboBox
                                        items={clients} selected={editClient} setSelected={handleClientChange} onCreate={handleCreateClient} placeholder="Klient"
                                    />
                                    <CreatableComboBox
                                        items={actionOptions} selected={editAction} setSelected={setEditAction} onCreate={handleCreateAction} placeholder="Akce"
                                    />

                                    <div className="relative">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">Stav</label>
                                        <select
                                            value={editStatusId || ''}
                                            onChange={(e) => setEditStatusId(Number(e.target.value))}
                                            className="w-full text-sm rounded-xl border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                                        >
                                            {statuses.map(s => (
                                                <option key={s.id} value={s.id}>{s.nazev}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">Platnost do</label>
                                        <input
                                            type="date"
                                            value={editValidUntil}
                                            onChange={e => setEditValidUntil(e.target.value)}
                                            className="w-full text-sm rounded-xl border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 dark:text-white focus:ring-[#E30613] focus:border-[#E30613]"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={saveChanges} className="bg-[#E30613] text-white px-4 py-1.5 rounded-lg text-sm font-medium">Uložit</button>
                                    <button onClick={cancelEditing} className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-lg text-sm font-medium">Zrušit</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 group">
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        <span className="text-gray-400 font-normal mr-2">{offer.cislo || offer.id}</span>
                                        {offer.nazev}
                                    </h1>
                                    <button onClick={startEditing} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        Klient: <span className="font-medium text-gray-900 dark:text-gray-200">{offer.klienti?.nazev || 'Nezadáno'}</span>
                                    </span>
                                    <span className="hidden sm:inline text-gray-300 dark:text-slate-700">•</span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-10h2m-2 4h2m-2-8h2m-2-4h2" /></svg>
                                        Akce: <span className="font-medium text-gray-900 dark:text-gray-200">{offer.akce?.nazev || '—'}</span>
                                    </span>
                                    <span className="hidden sm:inline text-gray-300 dark:text-slate-700">•</span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Platnost: <span className="font-medium text-gray-900 dark:text-gray-200">{offer.platnost_do ? new Date(offer.platnost_do).toLocaleDateString('cs-CZ') : 'Neurčeno'}</span>
                                    </span>
                                    <span className="hidden sm:inline text-gray-300 dark:text-slate-700">•</span>
                                    <span className="flex items-center gap-2">
                                        Stav:
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border`}
                                            style={{
                                                backgroundColor: offer.nabidky_stavy?.color === 'green' ? '#f0fdf4' :
                                                    offer.nabidky_stavy?.color === 'blue' ? '#eff6ff' :
                                                        offer.nabidky_stavy?.color === 'red' ? '#fef2f2' :
                                                            offer.nabidky_stavy?.color === 'orange' ? '#fff7ed' : '#f3f4f6',
                                                color: offer.nabidky_stavy?.color === 'green' ? '#15803d' :
                                                    offer.nabidky_stavy?.color === 'blue' ? '#1d4ed8' :
                                                        offer.nabidky_stavy?.color === 'red' ? '#b91c1c' :
                                                            offer.nabidky_stavy?.color === 'orange' ? '#c2410c' : '#374151',
                                                borderColor: 'transparent'
                                            }}>
                                            {offer.nabidky_stavy?.nazev || 'Neznámý'}
                                        </span>
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <div className="mt-4">
                                        <OfferPdfDownloadButton offer={offer} items={items} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="text-right bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                            {currency.format(offer.celkova_cena)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mt-1">Celková cena</div>
                    </div>
                </div>
            </div>

            {/* Content Placeholder for Items */}
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
                <div className="bg-gray-50 dark:bg-slate-950/50 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {offer.poznamka || 'Žádné poznámky'}
                    </p>
                </div>
            </div>
        </div>
    );
}
