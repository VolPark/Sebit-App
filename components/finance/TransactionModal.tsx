import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'


interface TransactionModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: any) => Promise<void>
    initialData?: any
    divisions: any[]
    akceList: any[]
    clients: any[] // For Income
}

export default function TransactionModal({ isOpen, onClose, onSave, initialData, divisions, akceList, clients }: TransactionModalProps) {
    const [loading, setLoading] = useState(false)
    const [typ, setTyp] = useState('Příjem') // 'Příjem' | 'Výdej'

    // Form Fields
    const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState('')
    const [castka, setCastka] = useState('')
    const [popis, setPopis] = useState('')

    const [divisionId, setDivisionId] = useState<number | null>(null)
    const [akceId, setAkceId] = useState<number | null>(null)

    // Accounting Fields
    const [variableSymbol, setVariableSymbol] = useState('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [supplierIco, setSupplierIco] = useState('')
    const [supplierName, setSupplierName] = useState('')
    const [category, setCategory] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Bank')

    // Income Specific
    const [clientId, setClientId] = useState<number | null>(null)

    // Initialize form on open/change of initialData
    useEffect(() => {
        if (initialData) {
            setTyp(initialData.typ)
            setDatum(initialData.datum)
            setDueDate(initialData.due_date || '')
            setCastka(String(initialData.castka))
            setPopis(initialData.popis)
            setDivisionId(initialData.division_id)
            setAkceId(initialData.akce_id)
            setVariableSymbol(initialData.variable_symbol || '')
            setInvoiceNumber(initialData.invoice_number || '')
            setSupplierIco(initialData.supplier_ico || '')
            setSupplierName(initialData.supplier_name || '')
            setCategory(initialData.category || '')
            setPaymentMethod(initialData.payment_method || 'Bank')

            // Try to determine client from Akce if linked
            if (initialData.akce && initialData.akce.klient_id) {
                // Optionally set client? Usually project implies client.
                // But maybe we want explicitly show client for Income
            }
        } else {
            // Defaults
            setTyp('Příjem')
            setDatum(new Date().toISOString().split('T')[0])
            setDueDate('')
            setCastka('')
            setPopis('')
            setDivisionId(null)
            setAkceId(null)
            setVariableSymbol('')
            setInvoiceNumber('')
            setSupplierIco('')
            setSupplierName('')
            setCategory('')
            setPaymentMethod('Bank')
        }
    }, [initialData, isOpen])

    // Reset or adjust fields when Type changes
    useEffect(() => {
        if (typ === 'Příjem') {
            // clear supplier info?
        }
    }, [typ])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!castka || !popis) return alert('Vyplňte povinná pole (Částka, Popis)')

        setLoading(true)
        try {
            await onSave({
                id: initialData?.id,
                typ,
                datum,
                due_date: dueDate || null,
                castka: parseFloat(castka),
                popis,
                division_id: divisionId,
                akce_id: akceId,
                variable_symbol: variableSymbol,
                invoice_number: invoiceNumber,
                supplier_ico: supplierIco,
                supplier_name: supplierName,
                category,
                payment_method: paymentMethod
            })
            onClose()
        } catch (err) {
            console.error(err)
            alert('Chyba při ukládání')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-100 dark:border-slate-800">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-gray-900 dark:text-white flex justify-between items-center mb-6"
                                >
                                    {initialData ? 'Upravit transakci' : 'Nová transakce'}
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Type Selector (Large Tabs) */}
                                    <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                        {['Příjem', 'Výdej'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setTyp(t)}
                                                className={`
                                    w-full py-2.5 text-sm font-medium leading-5 rounded-lg transition-all duration-200
                                    ${typ === t
                                                        ? (t === 'Příjem' ? 'bg-green-500 text-white shadow' : 'bg-red-500 text-white shadow')
                                                        : 'text-gray-700 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-900 dark:hover:text-white'
                                                    }
                                `}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Primary Info */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Částka</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        required
                                                        value={castka}
                                                        onChange={e => setCastka(e.target.value)}
                                                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-3 text-gray-400 text-sm font-medium">Kč</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Popis</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={popis}
                                                    onChange={e => setPopis(e.target.value)}
                                                    className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Např. Faktura za služby"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Datum (DUZP)</label>
                                                    <input
                                                        type="date"
                                                        value={datum}
                                                        onChange={e => setDatum(e.target.value)}
                                                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Splatnost</label>
                                                    <input
                                                        type="date"
                                                        value={dueDate}
                                                        onChange={e => setDueDate(e.target.value)}
                                                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Categorization & Accounting */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Projekt / Akce</label>
                                                <select
                                                    value={akceId || ''}
                                                    onChange={e => setAkceId(Number(e.target.value) || null)}
                                                    className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                >
                                                    <option value="">-- Bez projektu --</option>
                                                    {akceList.map(a => <option key={a.id} value={a.id}>{a.nazev}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Divize</label>
                                                <select
                                                    value={divisionId || ''}
                                                    onChange={e => setDivisionId(Number(e.target.value) || null)}
                                                    className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                >
                                                    <option value="">-- Divize --</option>
                                                    {divisions.map(d => <option key={d.id} value={d.id}>{d.nazev}</option>)}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Var. Symbol</label>
                                                    <input
                                                        value={variableSymbol}
                                                        onChange={e => setVariableSymbol(e.target.value)}
                                                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                        placeholder="VS"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Číslo faktury</label>
                                                    <input
                                                        value={invoiceNumber}
                                                        onChange={e => setInvoiceNumber(e.target.value)}
                                                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 p-2.5 text-sm dark:text-white"
                                                        placeholder="č. faktury"
                                                    />
                                                </div>
                                            </div>

                                            {typ === 'Výdej' && (
                                                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                                    <h4 className="text-xs font-bold text-red-800 dark:text-red-300 mb-2">Dodavatel</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input
                                                            value={supplierIco}
                                                            onChange={e => setSupplierIco(e.target.value)}
                                                            className="w-full rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/50 p-2 text-sm"
                                                            placeholder="IČO"
                                                        />
                                                        <input
                                                            value={supplierName}
                                                            onChange={e => setSupplierName(e.target.value)}
                                                            className="w-full rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/50 p-2 text-sm"
                                                            placeholder="Název firmy"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            Zrušit
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`
                                px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2
                                ${typ === 'Příjem'
                                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                                }
                                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                                        >
                                            {loading ? 'Ukládám...' : 'Uložit transakci'}
                                        </button>
                                    </div>
                                </form>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
