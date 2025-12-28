'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Nabidka } from '@/lib/types/nabidky-types';
import { getNabidky, createNabidka, deleteNabidka, getClients, getActions, createClient, createAction, getStatuses, getDivisionsList } from '@/lib/api/nabidky-api';
import CreatableComboBox, { ComboBoxItem } from './CreatableCombobox';

export default function OffersTable() {
    const [offers, setOffers] = useState<Nabidka[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // New Offer Form State
    const [newOfferName, setNewOfferName] = useState('');
    const [newOfferNote, setNewOfferNote] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [selectedClient, setSelectedClient] = useState<ComboBoxItem | null>(null);
    const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);

    // Options
    const [clients, setClients] = useState<ComboBoxItem[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    useEffect(() => {
        if (showModal) {
            // Load options sequentially to avoid race conditions or just Promise.all
            const loadOpts = async () => {
                try {
                    const [clientsData, statusesData, divisionsData] = await Promise.all([getClients(), getStatuses(), getDivisionsList()]);
                    setClients(clientsData.map(c => ({ id: c.id, name: c.nazev })));
                    setStatuses(statusesData);
                    setDivisions(divisionsData);
                } catch (error) {
                    console.error('Failed to load options', error);
                }
            };
            loadOpts();

            // Set default valid until date (today + 30 days)
            const date = new Date();
            date.setDate(date.getDate() + 30);
            setValidUntil(date.toISOString().split('T')[0]);
        }
    }, [showModal]);

    // Handle Client Change -> Filter Actions
    const handleClientChange = (client: ComboBoxItem | null) => {
        setSelectedClient(client);
    };

    const handleCreateClient = async (name: string) => {
        try {
            const newClient = await createClient(name);
            const clientItem = { id: newClient.id, name: newClient.nazev };
            setClients(prev => [...prev, clientItem].sort((a, b) => a.name.localeCompare(b.name)));
            setSelectedClient(clientItem);
        } catch (error) {
            console.error(error);
            alert('Chyba při vytváření klienta.');
        }
    };



    const fetchOffers = async () => {
        setLoading(true);
        try {
            const data = await getNabidky();
            setOffers(data);
        } catch (error) {
            console.error('Failed to load offers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOfferName) return;

        try {
            let clientId = selectedClient?.id as number | undefined;
            // If "NEW" ID somehow passed (shoudn't happen if handle created correctly), handle it or fail
            if (clientId && String(clientId) === 'NEW') clientId = undefined;

            // Find default status ID or handle in DB
            const defaultStatus = statuses.find(s => s.nazev === 'Rozpracováno');

            await createNabidka({
                nazev: newOfferName,
                poznamka: newOfferNote,
                stav_id: defaultStatus ? defaultStatus.id : null,
                celkova_cena: 0,
                klient_id: clientId || null,
                akce_id: null,
                platnost_do: validUntil || undefined,
                division_id: selectedDivisionId || null
            });

            setShowModal(false);
            setNewOfferName('');
            setNewOfferNote('');
            setSelectedClient(null);
            setSelectedDivisionId(null);
            fetchOffers(); // Refresh
        } catch (err) {
            console.error(err);
            alert('Chyba při vytváření nabídky');
        }
    };

    const handleDelete = (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteNabidka(deleteId);
            fetchOffers();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div>

            <div className="flex justify-between items-center mb-6">

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#E30613] hover:bg-[#C00000] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
                >
                    + Nová nabídka
                </button>
            </div>

            {/* Modal for New Offer */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-900/5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Vytvořit novou nabídku</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Název nabídky</label>
                                <input
                                    type="text"
                                    value={newOfferName}
                                    onChange={e => setNewOfferName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                                    placeholder="např. Kuchyně Novák - Varianta A"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Divize</label>
                                <select
                                    value={selectedDivisionId || ''}
                                    onChange={e => setSelectedDivisionId(Number(e.target.value) || null)}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                                >
                                    <option value="">-- Vyberte divizi --</option>
                                    {divisions.map(d => (
                                        <option key={d.id} value={d.id}>{d.nazev}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <CreatableComboBox
                                    label="Klient"
                                    items={clients}
                                    selected={selectedClient}
                                    setSelected={handleClientChange}
                                    onCreate={handleCreateClient}
                                    placeholder="Vybrat nebo vytvořit klienta"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Poznámka</label>
                                <textarea
                                    value={newOfferNote}
                                    onChange={e => setNewOfferNote(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                                    placeholder="Volitelná poznámka..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Platnost do</label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={e => setValidUntil(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613]"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#E30613] hover:bg-[#C00000] text-white px-4 py-2 rounded-xl font-bold transition-colors"
                                >
                                    Vytvořit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap">Název</th>
                            <th className="px-6 py-4 whitespace-nowrap">Klient</th>
                            <th className="px-6 py-4 whitespace-nowrap">Divize</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Cena</th>
                            <th className="px-6 py-4 whitespace-nowrap">Stav</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Načítám...</td>
                            </tr>
                        ) : offers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Žádné nabídky k zobrazení.</td>
                            </tr>
                        ) : (
                            offers.map((offer) => (
                                <tr key={offer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        <Link href={`/nabidky/${offer.id}`} className="hover:text-[#E30613] hover:underline decoration-[#E30613]/50 underline-offset-4 transition-colors">
                                            {offer.cislo || offer.id} - {offer.nazev}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{offer.klienti?.nazev || '—'}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {offer.divisions?.nazev || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-700 dark:text-slate-300">
                                        {offer.celkova_cena?.toLocaleString('cs-CZ')} Kč
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border`}
                                            style={{
                                                backgroundColor: offer.nabidky_stavy?.color === 'green' ? '#f0fdf4' :
                                                    offer.nabidky_stavy?.color === 'blue' ? '#eff6ff' :
                                                        offer.nabidky_stavy?.color === 'red' ? '#fef2f2' : '#f3f4f6',
                                                color: offer.nabidky_stavy?.color === 'green' ? '#15803d' :
                                                    offer.nabidky_stavy?.color === 'blue' ? '#1d4ed8' :
                                                        offer.nabidky_stavy?.color === 'red' ? '#b91c1c' : '#374151',
                                                borderColor: 'transparent' // simplified for now
                                            }}>
                                            {offer.nabidky_stavy?.nazev || 'Neznámý'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(offer.id)}
                                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Smazat"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Smazat nabídku?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Tato akce je nevratná.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors font-medium"
                            >
                                Smazat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
