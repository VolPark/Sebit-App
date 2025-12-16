'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, Transition } from '@headlessui/react'
import { APP_START_YEAR } from '@/lib/config'

// Helper to get month name
const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

export default function NakladyPage() {
    // Data state
    const [costs, setCosts] = useState<any[]>([])

    // UI state
    const [loading, setLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState('')
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        if (now.getFullYear() < APP_START_YEAR) {
            return new Date(APP_START_YEAR, 0, 1);
        }
        return now;
    })

    // Modal State
    const [modalOpen, setModalOpen] = useState(false)
    const [modalConfig, setModalConfig] = useState<{
        type: 'DELETE' | 'ADD' | 'edit',
        id: number | null,
        title: string,
        message?: string,
        actionLabel: string,
        actionClass: string
    }>({
        type: 'ADD', // default
        id: null,
        title: '',
        actionLabel: '',
        actionClass: ''
    })

    // Form State
    const [formNazev, setFormNazev] = useState('')
    const [formCastka, setFormCastka] = useState('')

    useEffect(() => {
        fetchData()
    }, [selectedDate])

    async function fetchData(forceRefresh = false) {
        setLoading(true);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;

        const { data, error } = await supabase
            .from('fixed_costs')
            .select('*')
            .eq('rok', year)
            .eq('mesic', month)
            .order('nazev');

        if (error) {
            console.error(error);
            setStatusMessage('Chyba při načítání dat.');
        } else {
            setCosts(data || []);
        }
        setLoading(false);
    }

    async function performAutoImport(targetYear: number, targetMonth: number): Promise<boolean> {
        // Calculate previous month
        let prevYear = targetYear;
        let prevMonth = targetMonth - 1;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }

        // Fetch previous month data
        const { data: prevData } = await supabase.from('fixed_costs').select('*').eq('rok', prevYear).eq('mesic', prevMonth);

        if (!prevData || prevData.length === 0) {
            return false;
        }

        // Prepare Insert
        const newRows = prevData.map(c => ({
            nazev: c.nazev,
            castka: c.castka,
            rok: targetYear,
            mesic: targetMonth
        }));

        const { error } = await supabase.from('fixed_costs').insert(newRows);

        if (!error) {
            setStatusMessage(`Automaticky načteno ${newRows.length} položek z minulého měsíce.`);
            return true;
        } else {
            console.error('Auto-import failed', error);
            return false;
        }
    }

    // --- Date navigation ---
    const changeMonth = (offset: number) => {
        setSelectedDate(currentDate => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + offset);
            if (newDate.getFullYear() < APP_START_YEAR) {
                return new Date(APP_START_YEAR, 0, 1);
            }
            return newDate;
        });
    }

    // --- Actions ---
    const openAddModal = () => {
        setFormNazev('');
        setFormCastka('');
        setModalConfig({
            type: 'ADD',
            id: null,
            title: 'Přidat pravidelný náklad',
            actionLabel: 'Přidat',
            actionClass: 'bg-green-600 hover:bg-green-700'
        });
        setModalOpen(true);
    }

    const openEditModal = (cost: any) => {
        setFormNazev(cost.nazev);
        setFormCastka(String(cost.castka));
        setModalConfig({
            type: 'edit', // using lowercase to distinguish from special check in confirmAction if needed, mainly reusing structure
            id: cost.id,
            title: 'Upravit náklad',
            actionLabel: 'Uložit',
            actionClass: 'bg-blue-600 hover:bg-blue-700'
        });
        setModalOpen(true);
    }

    const openDeleteModal = (id: number) => {
        setModalConfig({
            type: 'DELETE',
            id,
            title: 'Smazat náklad?',
            message: 'Opravdu chcete smazat tuto položku?',
            actionLabel: 'Smazat',
            actionClass: 'bg-red-600 hover:bg-red-700'
        })
        setModalOpen(true)
    }

    const confirmAction = async () => {
        setLoading(true);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;

        if (modalConfig.type === 'DELETE' && modalConfig.id) {
            const { error } = await supabase.from('fixed_costs').delete().eq('id', modalConfig.id);
            if (!error) {
                setStatusMessage('Položka smazána');
                fetchData(true); // avoid auto-import after delete
            } else {
                setStatusMessage('Chyba: ' + error.message);
            }
        } else if (modalConfig.type === 'ADD') {
            if (!formNazev || !formCastka) {
                alert('Vyplňte název a částku');
                setLoading(false);
                return;
            }
            const { error } = await supabase.from('fixed_costs').insert({
                nazev: formNazev,
                castka: parseFloat(formCastka),
                rok: year,
                mesic: month
            });
            if (!error) {
                setStatusMessage('Náklad přidán');
                fetchData(true); // avoid auto-import loop if somehow empty
                setModalOpen(false);
            } else {
                setStatusMessage('Chyba: ' + error.message);
            }
        } else if (modalConfig.type === 'edit' && modalConfig.id) {
            const { error } = await supabase.from('fixed_costs').update({
                nazev: formNazev,
                castka: parseFloat(formCastka)
            }).eq('id', modalConfig.id);
            if (!error) {
                setStatusMessage('Náklad upraven');
                fetchData(true);
                setModalOpen(false);
            } else {
                setStatusMessage('Chyba: ' + error.message);
            }
        }
        // setLoading is handled by fetchData or explicit set
        if (modalConfig.type === 'DELETE') setModalOpen(false);
    }

    const importPreviousMonth = async () => {
        setLoading(true);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const success = await performAutoImport(year, month);

        if (success) {
            fetchData(true);
        } else {
            setStatusMessage('V minulém měsíci nebyly nalezeny žádné náklady.');
            setLoading(false);
        }
    }

    // --- UI Render ---
    const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);
    const totalMonthCosts = useMemo(() => costs.reduce((sum, c) => sum + (c.castka || 0), 0), [costs]);

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto dark:text-gray-100">
            <h2 className="text-2xl font-bold text-black dark:text-white mb-4">Pravidelné měsíční náklady (Režie)</h2>

            {statusMessage && (
                <div className={`mb-4 p-4 rounded ${statusMessage.includes('Chyba') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {statusMessage}
                </div>
            )}

            {/* Month Selector */}
            <div className="flex items-center justify-center gap-4 mb-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-3 rounded-2xl shadow-md ring-1 ring-slate-200 dark:ring-slate-700 max-w-md mx-auto transition-colors">
                <button
                    onClick={() => changeMonth(-1)}
                    disabled={selectedDate.getFullYear() === APP_START_YEAR && selectedDate.getMonth() === 0}
                    className={`p-2 rounded-full transition-colors ${selectedDate.getFullYear() === APP_START_YEAR && selectedDate.getMonth() === 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-slate-800'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xl font-semibold w-48 text-center dark:text-white">
                    {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </span>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    Celkem za měsíc: {currency.format(totalMonthCosts)}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={importPreviousMonth}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition flex items-center gap-2"
                        title="Smaže aktuální seznam a nahraje položky z minulého měsíce"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Načíst z minula
                    </button>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-[#E30613] text-white rounded-full text-sm font-semibold hover:bg-[#C00000] transition flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Přidat náklad
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
                {costs.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-500">
                        Žádné náklady pro tento měsíc.
                    </div>
                )}
                {loading && <div className="p-8 text-center text-gray-500">Načítám...</div>}

                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {costs.map(c => (
                        <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                            <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{c.nazev}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="font-bold text-gray-900 dark:text-white">{currency.format(c.castka)}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(c)} className="p-2 text-gray-400 hover:text-blue-600 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                        </svg>
                                    </button>
                                    <button onClick={() => openDeleteModal(c.id)} className="p-2 text-gray-400 hover:text-red-600 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{modalConfig.title}</h3>

                        {(modalConfig.type === 'ADD' || modalConfig.type === 'edit') && (
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Název nákladu</label>
                                    <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800 dark:text-white" placeholder="Např. Nájem" value={formNazev} onChange={e => setFormNazev(e.target.value)} autoFocus />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Částka (Kč)</label>
                                    <input className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800 dark:text-white" type="number" placeholder="0" value={formCastka} onChange={e => setFormCastka(e.target.value)} />
                                </div>
                            </div>
                        )}
                        {modalConfig.type === 'DELETE' && (
                            <p className="text-gray-600 dark:text-gray-300 mb-6">{modalConfig.message}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-md transition"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={confirmAction}
                                className={`px-4 py-2 text-white rounded-md shadow-sm transition flex items-center ${modalConfig.actionClass}`}
                            >
                                {modalConfig.actionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
