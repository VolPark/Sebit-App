'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export default function VykazyPage() {
  // Stavy pro data z databáze
  const [vykazy, setVykazy] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [pracovnici, setPracovnici] = useState<any[]>([])

  // Stavy pro formulář
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [pracovnikId, setPracovnikId] = useState('')
  const [klientId, setKlientId] = useState('')
  const [popis, setPopis] = useState('')
  const [hodiny, setHodiny] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDatum, setEditDatum] = useState('')
  const [editPracovnikId, setEditPracovnikId] = useState('')
  const [editKlientId, setEditKlientId] = useState('')
  const [editPopis, setEditPopis] = useState('')
  const [editHodiny, setEditHodiny] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // 1. Načteme klienty a pracovníky do výběrových menu
    const { data: kData } = await supabase.from('klienti').select('*')
    const { data: pData } = await supabase.from('pracovnici').select('*')
    if (kData) setKlienti(kData)
    if (pData) setPracovnici(pData)

    // 2. Načteme výkazy A ZÁROVEŇ data z propojených tabulek
    // To 'klienti(nazev, sazba)' říká Supabase: "Sáhni si pro data vedle"
    const { data: vData, error } = await supabase
      .from('prace')
      .select('*, klienti(nazev, sazba), pracovnici(jmeno, hodinova_mzda)')
      .order('datum', { ascending: false })
    
    if (vData) setVykazy(vData)
    if (error) console.error(error)
    setLoading(false)
  }

  async function ulozitVykaz() {
    if (!pracovnikId || !klientId || !hodiny) return alert('Vyplňte povinná pole')
    setLoading(true)

    const { error } = await supabase.from('prace').insert({
      datum: datum,
      pracovnik_id: pracovnikId,
      klient_id: klientId,
      pocet_hodin: parseFloat(hodiny),
      popis: popis
    })

    if (!error) {
      setPopis('')
      setHodiny('')
      setStatusMessage('Výkaz uložen')
      fetchData() // Obnovit tabulku
    } else {
      alert('Chyba: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(v: any) {
    setEditingId(v.id)
    setEditDatum(v.datum)
    setEditPracovnikId(String(v.pracovnik_id || ''))
    setEditKlientId(String(v.klient_id || ''))
    setEditPopis(v.popis || '')
    setEditHodiny(String(v.pocet_hodin || ''))
  }
  function cancelEdit() {
    setEditingId(null)
    setEditDatum(''); setEditPracovnikId(''); setEditKlientId(''); setEditPopis(''); setEditHodiny('')
  }
  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('prace').update({
      datum: editDatum,
      pracovnik_id: editPracovnikId,
      klient_id: editKlientId,
      popis: editPopis,
      pocet_hodin: parseFloat(editHodiny || '0')
    }).eq('id', editingId)
    if (!error) {
      setStatusMessage('Výkaz upraven')
      cancelEdit()
      fetchData()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }
  async function deleteVykaz(id: number) {
    if (!confirm('Opravdu smazat výkaz?')) return
    await supabase.from('prace').delete().eq('id', id)
    fetchData()
  }

  // Formatter pro měnu
  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), [])

  // Přepočítaná data (odděleně od renderu)
  const vykazyWithCalc = useMemo(() => vykazy.map(v => {
    const hod = Number(v.pocet_hodin) || 0
    const sazba = Number(v.klienti?.sazba) || 0
    const mzda = Number(v.pracovnici?.hodinova_mzda) || 0
    const prijem = hod * sazba
    const naklad = hod * mzda
    return { ...v, prijem, naklad, zisk: prijem - naklad }
  }), [vykazy])

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Výkazy práce</h2>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Formulář - horní lišta */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6 bg-blue-50 p-4 md:p-6 rounded-lg shadow-sm items-end">
        
        <div className="md:col-span-1">
          <label htmlFor="datum" className="block text-xs font-semibold text-gray-700 mb-1">Datum</label>
          <input id="datum" type="date" className="w-full border p-2 rounded text-black" 
            value={datum} onChange={e => setDatum(e.target.value)} />
        </div>

        <div className="md:col-span-1">
          <label htmlFor="pracovnik" className="block text-xs font-semibold text-gray-700 mb-1">Pracovník</label>
          <select id="pracovnik" className="w-full border p-2 rounded text-black"
            value={pracovnikId} onChange={e => setPracovnikId(e.target.value)} aria-required>
            <option value="">-- Vyberte --</option>
            {pracovnici.map(p => <option key={p.id} value={p.id}>{p.jmeno}</option>)}
          </select>
        </div>

        <div className="md:col-span-1">
          <label htmlFor="klient" className="block text-xs font-semibold text-gray-700 mb-1">Klient</label>
          <select id="klient" className="w-full border p-2 rounded text-black"
            value={klientId} onChange={e => setKlientId(e.target.value)} aria-required>
            <option value="">-- Vyberte --</option>
            {klienti.map(k => <option key={k.id} value={k.id}>{k.nazev}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="popis" className="block text-xs font-semibold text-gray-700 mb-1">Popis činnosti</label>
          <input id="popis" type="text" placeholder="Co se dělalo..." className="w-full border p-2 rounded text-black"
            value={popis} onChange={e => setPopis(e.target.value)} />
        </div>

        <div className="md:col-span-1 flex gap-2">
          <div className='flex-1'>
             <label htmlFor="hodiny" className="block text-xs font-semibold text-gray-700 mb-1">Hodiny</label>
             <input id="hodiny" type="number" step="0.5" inputMode="decimal" className="w-full border p-2 rounded text-black"
              value={hodiny} onChange={e => setHodiny(e.target.value)} />
          </div>
          <button type="button" onClick={ulozitVykaz} className="bg-blue-600 text-white px-4 py-3 rounded mb-[1px] hover:bg-blue-700 h-12 self-end">
            OK
          </button>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {vykazyWithCalc.map(v => (
          <div key={v.id} className="bg-white rounded-lg p-4 shadow-sm">
            {editingId === v.id ? (
              <div className="flex flex-col gap-2">
                <input type="date" value={editDatum} onChange={e => setEditDatum(e.target.value)} className="border p-2 rounded" />
                <select value={editPracovnikId} onChange={e => setEditPracovnikId(e.target.value)} className="border p-2 rounded">
                  <option value="">-- vyber --</option>
                  {pracovnici.map(p => <option key={p.id} value={p.id}>{p.jmeno}</option>)}
                </select>
                <select value={editKlientId} onChange={e => setEditKlientId(e.target.value)} className="border p-2 rounded">
                  <option value="">-- vyber --</option>
                  {klienti.map(k => <option key={k.id} value={k.id}>{k.nazev}</option>)}
                </select>
                <input value={editPopis} onChange={e => setEditPopis(e.target.value)} className="border p-2 rounded" />
                <input type="number" value={editHodiny} onChange={e => setEditHodiny(e.target.value)} className="border p-2 rounded" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-2 rounded">Uložit</button>
                  <button onClick={cancelEdit} className="bg-gray-200 px-3 py-2 rounded">Zrušit</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium">{v.datum}</div>
                  <div className={`text-sm font-semibold ${v.zisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency.format(v.zisk)}</div>
                </div>
                <div className="text-sm text-gray-700">{v.pracovnici?.jmeno} • {v.klienti?.nazev}</div>
                <div className="text-sm text-gray-500 mt-2">{v.popis}</div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <div>{v.pocet_hodin} h</div>
                  <div className="text-green-700">{currency.format(v.prijem)}</div>
                  <div className="text-red-600">{currency.format(v.naklad)}</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => startEdit(v)} className="text-sm text-gray-700">Upravit</button>
                  <button onClick={() => deleteVykaz(v.id)} className="text-sm text-red-500">Smazat</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 text-gray-600 border-b">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Pracovník</th>
              <th className="p-3">Klient</th>
              <th className="p-3">Popis</th>
              <th className="p-3 text-right">Hodiny</th>
              <th className="p-3 text-right text-green-700 bg-green-50">Fakturace (Příjem)</th>
              <th className="p-3 text-right text-red-700 bg-red-50">Mzda (Náklad)</th>
              <th className="p-3 text-right font-bold">Zisk</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vykazyWithCalc.map((v) => (
              editingId === v.id ? (
                <tr key={v.id} className="bg-white">
                  <td className="p-3">
                    <input type="date" value={editDatum} onChange={e => setEditDatum(e.target.value)} className="border p-2 rounded" />
                  </td>
                  <td className="p-3">
                    <select value={editPracovnikId} onChange={e => setEditPracovnikId(e.target.value)} className="border p-2 rounded">
                      {pracovnici.map(p => <option key={p.id} value={p.id}>{p.jmeno}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={editKlientId} onChange={e => setEditKlientId(e.target.value)} className="border p-2 rounded">
                      {klienti.map(k => <option key={k.id} value={k.id}>{k.nazev}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <input value={editPopis} onChange={e => setEditPopis(e.target.value)} className="border p-2 rounded w-full" />
                  </td>
                  <td className="p-3 text-right">
                    <input type="number" value={editHodiny} onChange={e => setEditHodiny(e.target.value)} className="border p-2 rounded w-24 text-right" />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">Uložit</button>
                    <button onClick={cancelEdit} className="bg-gray-200 px-3 py-1 rounded">Zrušit</button>
                  </td>
                  {/* prazdne sloupecky pro zachování struktury */}
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
              ) : (
                <tr key={v.id} className="hover:bg-gray-50 text-black">
                  <td className="p-3">{v.datum}</td>
                  <td className="p-3 font-medium">{v.pracovnici?.jmeno}</td>
                  <td className="p-3">{v.klienti?.nazev}</td>
                  <td className="p-3 text-gray-500">{v.popis}</td>
                  <td className="p-3 text-right">{v.pocet_hodin} h</td>
                  <td className="p-3 text-right bg-green-50">{currency.format(v.prijem)}</td>
                  <td className="p-3 text-right bg-red-50">{currency.format(v.naklad)}</td>
                  <td className={`p-3 text-right font-bold ${v.zisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currency.format(v.zisk)}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => startEdit(v)} className="text-gray-700 mr-2">Upravit</button>
                    <button onClick={() => deleteVykaz(v.id)} className="text-red-500">Smazat</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}