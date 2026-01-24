'use client'
import { useState, useMemo } from 'react'
import { useFixedCostData } from '@/hooks/useFixedCostData'
import { APP_START_YEAR } from '@/lib/config'
import { FixedCost } from '@/lib/types/finance-types'

// Helper to get month name
const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

export default function NakladyPage() {
    const {
        costs,
        divisions,
        loading,
        error,
        selectedDate,
        changeMonth,
        createCost,
        updateCost,
        deleteCost,
        importPreviousMonth
    } = useFixedCostData();

    // Local UI State
    const [statusMessage, setStatusMessage] = useState('')

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
    const [formDivisionId, setFormDivisionId] = useState<number | null>(null);

    // -- Actions --
    const openAddModal = () => {
        setFormNazev('');
        setFormCastka('');
        setFormDivisionId(null);
        setModalConfig({
            type: 'ADD',
            id: null,
            title: 'Přidat pravidelný náklad',
            actionLabel: 'Přidat',
            actionClass: 'bg-green-600 hover:bg-green-700'
        });
        setModalOpen(true);
    }

    const openEditModal = (cost: FixedCost) => {
        if (cost.source === 'accounting') return;
        setFormNazev(cost.nazev);
        setFormCastka(String(cost.castka));
        setFormDivisionId(cost.division_id || null);
        setModalConfig({
            type: 'edit',
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
        let success = false;

        if (modalConfig.type === 'DELETE' && modalConfig.id) {
            success = await deleteCost(modalConfig.id);
            if (success) setStatusMessage('Položka smazána');
        } else if (modalConfig.type === 'ADD') {
            if (!formNazev || !formCastka) {
                alert('Vyplňte název a částku');
                return;
            }
            success = await createCost({
                nazev: formNazev,
                castka: parseFloat(formCastka),
                division_id: formDivisionId
            });
            if (success) setStatusMessage('Náklad přidán');
        } else if (modalConfig.type === 'edit' && modalConfig.id) {
            success = await updateCost(modalConfig.id, {
                nazev: formNazev,
                castka: parseFloat(formCastka),
                division_id: formDivisionId
            });
            if (success) setStatusMessage('Náklad upraven');
        }

        if (success) setModalOpen(false);
        else setStatusMessage('Operace se nezdařila');
    }

    const handleImport = async () => {
        const success = await importPreviousMonth();
        if (success) setStatusMessage('Náklady načteny.');
        // error handled by hook logic setting error state if needed, or we can check result
    }

    // --- UI Render ---
    const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);
    const totalMonthCosts = useMemo(() => costs.reduce((sum, c) => sum + (c.castka || 0), 0), [costs]);

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto dark:text-gray-100">
            <h2 className="text-2xl font-bold text-black dark:text-white mb-4">Pravidelné měsíční náklady (Režie)</h2>

            {(statusMessage || error) && (
                <div className={`mb-4 p-4 rounded ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {error || statusMessage}
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
                        onClick={handleImport}
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
                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    {c.nazev}
                                    {c.source === 'accounting' && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full" title="Tento náklad je načten z účetního modulu">
                                            Účtárna
                                        </span>
                                    )}
                                </div>
                                {c.divisions && (
                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full inline-block mt-1">
                                        {c.divisions.nazev}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="font-bold text-gray-900 dark:text-white">{currency.format(Number(c.castka))}</div>
                                <div className="flex gap-2">
                                    {c.source === 'accounting' ? (
                                        <div className="w-20"></div> // Spacer
                                    ) : (
                                        <>
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
                                        </>
                                    )}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Divize (Volitelné)</label>
                                    <select
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800 dark:text-white"
                                        value={formDivisionId || ''}
                                        onChange={e => setFormDivisionId(Number(e.target.value) || null)}
                                    >
                                        <option value="">-- Všechny divize (Režie firmy) --</option>
                                        {divisions.map(d => (
                                            <option key={d.id} value={d.id}>{d.nazev}</option>
                                        ))}
                                    </select>
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
