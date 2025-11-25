'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export default function FinancePage() {
  const [transakce, setTransakce] = useState<any[]>([])
  
  // Stavy pro souhrny
  const [celkemPrijmy, setCelkemPrijmy] = useState(0)
  const [celkemVydaje, setCelkemVydaje] = useState(0)

  // Stavy formuláře
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [typ, setTyp] = useState('Příjem')
  const [castka, setCastka] = useState('')
  const [popis, setPopis] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('finance')
      .select('*')
      .order('datum', { ascending: false })

    if (data) {
      setTransakce(data)
    }
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

  async function pridatTransakci() {
    if (!castka || !popis) return alert('Zadejte částku a popis')
    setLoading(true)
    const { error } = await supabase.from('finance').insert({
      datum,
      typ,
      castka: parseFloat(castka),
      popis
    })

    if (!error) {
      setCastka('')
      setPopis('')
      setStatusMessage('Transakce přidána')
      fetchData()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }

  async function smazat(id: number) {
    if(!confirm('Opravdu smazat?')) return
    await supabase.from('finance').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Finanční přehled (Cash Flow)</h2>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Karty s přehledem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg shadow-sm border border-green-200">
          <p className="text-green-800 text-sm font-bold uppercase">Celkové Příjmy</p>
          <p className="text-2xl font-bold text-green-700">{currency.format(celkemPrijmyMemo)}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow-sm border border-red-200">
          <p className="text-red-800 text-sm font-bold uppercase">Celkové Výdaje</p>
          <p className="text-2xl font-bold text-red-700">{currency.format(celkemVydajeMemo)}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg shadow-sm border border-blue-200">
          <p className="text-blue-800 text-sm font-bold uppercase">Aktuální Stav</p>
          <p className={`text-2xl font-bold ${ (celkemPrijmyMemo - celkemVydajeMemo) >= 0 ? 'text-blue-700' : 'text-red-600' }`}>
            {currency.format(celkemPrijmyMemo - celkemVydajeMemo)}
          </p>
        </div>
      </div>

      {/* Formulář */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-end border border-gray-200">
        <div className='flex-1 w-full'>
          <label htmlFor="f_datum" className="block text-xs font-bold text-gray-500 mb-1">Datum</label>
          <input id="f_datum" type="date" value={datum} onChange={e => setDatum(e.target.value)} 
            className="w-full border p-2 rounded text-black" />
        </div>
        <div className='w-full md:w-40'>
          <label htmlFor="f_typ" className="block text-xs font-bold text-gray-500 mb-1">Typ pohybu</label>
          <select id="f_typ" value={typ} onChange={e => setTyp(e.target.value)} 
            className="w-full border p-2 rounded text-black font-medium">
            <option value="Příjem">Příjem (+)</option>
            <option value="Výdej">Výdej (-)</option>
          </select>
        </div>
        <div className='flex-[2] w-full'>
          <label htmlFor="f_popis" className="block text-xs font-bold text-gray-500 mb-1">Popis (Faktura č., Výplata...)</label>
          <input id="f_popis" type="text" value={popis} onChange={e => setPopis(e.target.value)} placeholder="Např. Faktura 202301"
            className="w-full border p-2 rounded text-black" />
        </div>
        <div className='flex-1 w-full'>
          <label htmlFor="f_castka" className="block text-xs font-bold text-gray-500 mb-1">Částka</label>
          <input id="f_castka" type="number" value={castka} onChange={e => setCastka(e.target.value)} placeholder="0"
            className="w-full border p-2 rounded text-black" />
        </div>

        <button type="button" onClick={pridatTransakci} className="bg-blue-600 text-white px-4 py-3 rounded font-bold hover:bg-blue-700 w-full md:w-auto mt-2 md:mt-0 h-12">
        Přidat transakci
        </button>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {transakce.map(t => (
          <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">{t.datum} • {t.popis}</div>
              <div className="text-xs text-gray-500">{t.typ}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${t.typ === 'Příjem' ? 'text-green-600' : 'text-red-600'}`}>{t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}</div>
              <button type="button" onClick={() => smazat(t.id)} className="text-xs text-gray-400 hover:text-red-500 mt-1" aria-label={`Smazat transakci ${t.popis}`}>Smazat</button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <table className="w-full text-left border-collapse hidden md:table">
        <thead className="bg-gray-100 text-gray-600 border-b">
          <tr>
            <th className="p-3">Datum</th>
            <th className="p-3">Popis</th>
            <th className="p-3 text-right">Částka</th>
            <th className="p-3 text-right">Akce</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transakce.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 text-black">
              <td className="p-3 w-32">{t.datum}</td>
              <td className="p-3">{t.popis}</td>
              <td className={`p-3 text-right font-bold w-40 ${t.typ === 'Příjem' ? 'text-green-600' : 'text-red-600'}`}>
                {t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}
              </td>
              <td className="p-3 text-right w-20">
                <button type="button" onClick={() => smazat(t.id)} className="text-gray-400 hover:text-red-500 text-sm" aria-label={`Smazat ${t.popis}`}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}