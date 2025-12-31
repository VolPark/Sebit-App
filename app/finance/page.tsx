'use client'
import { Fragment, useState, useEffect, useMemo } from 'react'
import { Menu, Transition } from '@headlessui/react'

import TransactionModal from '@/components/finance/TransactionModal'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'

export default function FinancePage() {
  const [transakce, setTransakce] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [akceList, setAkceList] = useState<any[]>([])
  const [filterDivisionId, setFilterDivisionId] = useState<number | null>(null)

  // Stavy pro souhrny
  const [celkemPrijmy, setCelkemPrijmy] = useState(0)
  const [celkemVydaje, setCelkemVydaje] = useState(0)

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [clients, setClients] = useState<any[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [filterDivisionId])

  async function fetchData() {
    setLoading(true)
    setLoading(true)
    let query = supabase.from('finance').select('*, divisions(nazev), akce(nazev)').order('datum', { ascending: false });

    if (filterDivisionId) {
      query = query.eq('division_id', filterDivisionId);
    }

    const [fResp, dResp, aResp, cResp] = await Promise.all([
      query,
      supabase.from('divisions').select('id, nazev').order('id'),
      supabase.from('akce').select('id, nazev, klient_id').in('project_type', ['SERVICE', 'TM']).order('nazev'),
      supabase.from('klienti').select('id, nazev, ico').order('nazev')
    ])

    if (fResp.data) setTransakce(fResp.data)
    if (dResp.data) setDivisions(dResp.data)
    if (aResp.data) setAkceList(aResp.data)
    if (cResp.data) setClients(cResp.data)
    setLoading(false)
  }

  // Souhrny přes memo (aktuální a spolehlivé)
  const { celkemPrijmyMemo, celkemVydajeMemo } = useMemo(() => {
    let p = 0
    let v = 0
    transakce.forEach(t => {
      if (t.typ === 'Příjem') p += Number(t.castka) || 0
      if (t.typ === 'Výdej') v += Number(t.castka) || 0
    })
    return { celkemPrijmyMemo: p, celkemVydajeMemo: v }
  }, [transakce])

  // Formatter pro měnu
  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), [])

  async function handleSaveTransaction(data: any) {
    if (data.id) {
      // Update
      const { error } = await supabase.from('finance').update({
        typ: data.typ,
        datum: data.datum,
        due_date: data.due_date,
        castka: data.castka,
        popis: data.popis,
        division_id: data.division_id,
        akce_id: data.akce_id,
        variable_symbol: data.variable_symbol,
        invoice_number: data.invoice_number,
        supplier_ico: data.supplier_ico,
        supplier_name: data.supplier_name,
        category: data.category,
        payment_method: data.payment_method
      }).eq('id', data.id)

      if (error) throw error
      setStatusMessage('Transakce upravena')
    } else {
      // Insert
      const { error } = await supabase.from('finance').insert({
        typ: data.typ,
        datum: data.datum,
        due_date: data.due_date,
        castka: data.castka,
        popis: data.popis,
        division_id: data.division_id,
        akce_id: data.akce_id,
        variable_symbol: data.variable_symbol,
        invoice_number: data.invoice_number,
        supplier_ico: data.supplier_ico,
        supplier_name: data.supplier_name,
        category: data.category,
        payment_method: data.payment_method
      })

      if (error) throw error
      setStatusMessage('Transakce přidána')
    }
    fetchData()
  }

  function openNewTransaction() {
    setModalData(null)
    setIsModalOpen(true)
  }

  function openEditTransaction(t: any) {
    setModalData(t)
    setIsModalOpen(true)
  }
  async function deleteTransaction(id: number) {
    if (!confirm('Opravdu smazat?')) return
    await supabase.from('finance').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Finanční přehled</h2>
        {statusMessage && (
          <div className="bg-green-600/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Karty s přehledem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/50 shadow-sm relative overflow-hidden group">

          <p className="text-green-600 dark:text-green-400 text-sm font-bold uppercase tracking-wider mb-2">Příjmy</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{currency.format(celkemPrijmyMemo)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-sm relative overflow-hidden group">

          <p className="text-red-600 dark:text-red-400 text-sm font-bold uppercase tracking-wider mb-2">Výdaje</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{currency.format(celkemVydajeMemo)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm relative overflow-hidden group">

          <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Bilance</p>
          <p className={`text-3xl font-bold ${(celkemPrijmyMemo - celkemVydajeMemo) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {currency.format(celkemPrijmyMemo - celkemVydajeMemo)}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        {/* Filter */}
        <div className="w-full sm:w-auto">
          <select
            value={filterDivisionId || ''}
            onChange={e => setFilterDivisionId(Number(e.target.value) || null)}
            className="appearance-none block w-full rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 py-2 px-4 shadow-sm focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] dark:text-white sm:text-sm"
          >
            <option value="">Všechny divize</option>
            {divisions.map((d: any) => (
              <option key={d.id} value={d.id}>{d.nazev}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tlačítko nové transakce */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={openNewTransaction}
          className="bg-[#E30613] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#C00000] transition-colors font-medium text-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nová transakce
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white dark:bg-slate-900 rounded shadow animate-pulse dark:text-white">Načítám...</div>}
        {transakce.map(t => (
          <div key={t.id} className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{t.popis}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(t.datum)}
                  {t.divisions && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t.divisions.nazev}</span>}
                  {t.akce && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">📁 {t.akce.nazev}</span>}
                  <div className="mt-1 flex gap-2">
                    {t.variable_symbol && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 rounded">VS: {t.variable_symbol}</span>}
                    {t.invoice_number && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 rounded">Fa: {t.invoice_number}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${t.typ === 'Příjem' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}
                </div>
                <div className="flex gap-3 mt-2 justify-end">
                  <button onClick={() => openEditTransaction(t)} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Upravit</button>
                  <button onClick={() => deleteTransaction(t.id)} className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400">Smazat</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <table className="w-full text-left border-collapse hidden md:table">
        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-b dark:border-slate-700 text-sm uppercase tracking-wider">
          <tr>
            <th className="p-4 font-medium">Datum</th>
            <th className="p-4 font-medium">Popis</th>
            <th className="p-4 font-medium">Projekt / Divize</th>
            <th className="p-4 font-medium text-right">Částka</th>
            <th className="p-4 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-700 text-sm">
          {transakce.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.datum)}</td>
              <td className="p-4 font-medium text-gray-900 dark:text-white">{t.popis}</td>
              <td className="p-4">
                <div className="flex flex-col gap-1 items-start">
                  {t.akce && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">📁 {t.akce.nazev}</span>}
                  {t.divisions && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t.divisions.nazev}</span>}
                </div>
              </td>
              <td className={`p-4 text-right font-bold whitespace-nowrap ${t.typ === 'Příjem' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}
              </td>
              <td className="p-4 text-right whitespace-nowrap">
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 top-full mt-1 w-40 origin-top-right rounded-lg bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-slate-700 focus:outline-none z-10">
                      <div className="p-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button onClick={() => openEditTransaction(t)} className={`${active ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                              Upravit
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button onClick={() => deleteTransaction(t.id)} className={`${active ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-red-600 dark:text-red-400'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-4 w-4 opacity-70">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Smazat
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={modalData}
        divisions={divisions}
        akceList={akceList}
        clients={clients}
      />
    </div>
  )
}