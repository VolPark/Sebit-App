'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'

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

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDatum, setEditDatum] = useState('')
  const [editTyp, setEditTyp] = useState('Příjem')
  const [editCastka, setEditCastka] = useState('')
  const [editPopis, setEditPopis] = useState('')

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

  function startEdit(t: any) {
    setEditingId(t.id)
    setEditDatum(t.datum)
    setEditTyp(t.typ)
    setEditCastka(String(t.castka))
    setEditPopis(t.popis)
  }
  function cancelEdit() {
    setEditingId(null)
    setEditDatum(''); setEditTyp('Příjem'); setEditCastka(''); setEditPopis('')
  }
  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('finance').update({
      datum: editDatum,
      typ: editTyp,
      castka: parseFloat(editCastka || '0'),
      popis: editPopis
    }).eq('id', editingId)
    if (!error) {
      setStatusMessage('Transakce upravena')
      cancelEdit()
      fetchData()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }
  async function deleteTransaction(id: number) {
    if (!confirm('Opravdu smazat?')) return
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

      {/* Formulář — Google 2025 */}
      <div className="mb-6">
        <div className="bg-white/95 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Datum</label>
            <input id="f_datum" type="date" value={datum} onChange={e => setDatum(e.target.value)} className="w-full rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs text-gray-500 mb-1">Typ</label>
            <select value={typ} onChange={e => setTyp(e.target.value)} className="w-full rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200">
              <option value="Příjem">Příjem (+)</option>
              <option value="Výdej">Výdej (-)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Popis</label>
            <input id="f_popis" type="text" value={popis} onChange={e => setPopis(e.target.value)} className="w-full rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" placeholder="Např. Faktura 202301" />
          </div>
          <div className="w-full md:w-40">
            <label className="block text-xs text-gray-500 mb-1">Částka</label>
            <input id="f_castka" type="number" value={castka} onChange={e => setCastka(e.target.value)} className="w-full rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="flex items-center md:ml-auto">
            <button type="button" onClick={pridatTransakci} className="bg-blue-700 text-white px-5 py-3 rounded-full shadow-sm hover:shadow-md">Přidat transakci</button>
          </div>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {transakce.map(t => (
          <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">
            {editingId === t.id ? (
              <div className="flex flex-col gap-2">
                <input value={editDatum} onChange={e => setEditDatum(e.target.value)} className="border p-2 rounded" type="date" />
                <select value={editTyp} onChange={e => setEditTyp(e.target.value)} className="border p-2 rounded">
                  <option value="Příjem">Příjem</option>
                  <option value="Výdej">Výdej</option>
                </select>
                <input value={editPopis} onChange={e => setEditPopis(e.target.value)} className="border p-2 rounded" />
                <input value={editCastka} onChange={e => setEditCastka(e.target.value)} className="border p-2 rounded" type="number" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-2 rounded">Uložit</button>
                  <button onClick={cancelEdit} className="bg-gray-200 px-3 py-2 rounded">Zrušit</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">{formatDate(t.datum)} • {t.popis}</div>
                  <div className="text-xs text-gray-500">{t.typ}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${t.typ === 'Příjem' ? 'text-green-600' : 'text-red-600'}`}>{t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}</div>
                  <div className="flex gap-2 mt-2 justify-end">
                    <button onClick={() => startEdit(t)} className="text-sm text-gray-700">Upravit</button>
                    <button onClick={() => deleteTransaction(t.id)} className="text-sm text-red-500">Smazat</button>
                  </div>
                </div>
              </div>
            )}
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
            editingId === t.id ? (
              <tr key={t.id} className="bg-white">
                <td className="p-3 w-32">
                  <input type="date" value={editDatum} onChange={e => setEditDatum(e.target.value)} className="border p-2 rounded w-full" />
                </td>
                <td className="p-3">
                  <input value={editPopis} onChange={e => setEditPopis(e.target.value)} className="border p-2 rounded w-full" />
                </td>
                <td className="p-3 text-right">
                  <input type="number" value={editCastka} onChange={e => setEditCastka(e.target.value)} className="border p-2 rounded w-32 text-right" />
                </td>
                <td className="p-3 text-right">
                  <select value={editTyp} onChange={e => setEditTyp(e.target.value)} className="border p-2 rounded mr-2">
                    <option value="Příjem">Příjem</option>
                    <option value="Výdej">Výdej</option>
                  </select>
                  <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">Uložit</button>
                  <button onClick={cancelEdit} className="bg-gray-200 px-3 py-1 rounded">Zrušit</button>
                </td>
              </tr>
            ) : (
              <tr key={t.id} className="hover:bg-gray-50 text-black">
                <td className="p-3 w-32">{formatDate(t.datum)}</td>
                <td className="p-3">{t.popis}</td>
                <td className={`p-3 text-right font-bold w-40 ${t.typ === 'Příjem' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.typ === 'Příjem' ? '+' : '-'}{currency.format(t.castka)}
                </td>
                <td className="p-3 text-right w-20">
                  <button onClick={() => startEdit(t)} className="text-gray-700 mr-2">Upravit</button>
                  <button onClick={() => deleteTransaction(t.id)} className="text-red-500">Smazat</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  )
}