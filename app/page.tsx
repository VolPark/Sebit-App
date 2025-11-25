'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [klienti, setKlienti] = useState([])
  const [jmeno, setJmeno] = useState('')
  const [sazbaInput, setSazbaInput] = useState('') // nové pole pro sazbu
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editSazba, setEditSazba] = useState('')

  // Načtení klientů při startu
  useEffect(() => {
    fetchKlienti()
  }, [])

  async function fetchKlienti() {
    setLoading(true)
    let { data, error } = await supabase.from('klienti').select('*')
    if (error) {
      console.error('Chyba načítání klientů', error)
      alert('Chyba při načítání klientů: ' + error.message)
    }
    if (data) setKlienti(data)
    setLoading(false)
  }

  // Funkce pro přidání klienta
  async function pridatKlienta() {
    if (!jmeno) return
    setLoading(true)
    // použijeme zadanou sazbu nebo fallback 1000
    const sazba = parseFloat(sazbaInput || '1000') || 1000
    const { error } = await supabase
      .from('klienti')
      .insert({ nazev: jmeno, sazba: sazba })

    if (!error) {
      setJmeno('')
      setSazbaInput('')
      fetchKlienti() // Znovu načíst seznam
      setStatusMessage('Klient přidán')
    } else {
      alert('Chyba: ' + error.message)
    }
    setLoading(false)
  }

  async function startEdit(klient: any) {
    setEditingId(klient.id)
    setEditName(klient.nazev)
    setEditSazba(String(klient.sazba))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditSazba('')
  }

  async function saveEdit() {
    if (!editingId || !editName) return
    setLoading(true)
    const { error } = await supabase.from('klienti').update({ nazev: editName, sazba: parseFloat(editSazba || '0') }).eq('id', editingId)
    if (!error) {
      setStatusMessage('Klient upraven')
      cancelEdit()
      fetchKlienti()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }

  async function deleteKlient(id: number) {
    if (!confirm('Opravdu smazat klienta?')) return
    setLoading(true)

    // 1) Zkontrolujeme, zda existují výkazy propojené na tohoto klienta
    const { data: praceDeps, error: depsError } = await supabase
      .from('prace')
      .select('id, datum')
      .eq('klient_id', Number(id))
      .limit(1) // stačí zjistit, že něco existuje; pro velké množiny se tím šetří
    if (depsError) {
      console.error('Chyba při kontrole závislostí', depsError)
      alert('Chyba při kontrole závislých záznamů: ' + depsError.message)
      setLoading(false)
      return
    }

    const hasDeps = Array.isArray(praceDeps) && praceDeps.length > 0

    if (hasDeps) {
      const cascade = confirm('Existují výkazy spojené s tímto klientem. Chcete je smazat také? (OK = smazat výkazy + klienta, Zrušit = neprovádět mazání)')
      if (!cascade) {
        setLoading(false)
        return
      }

      // 2) Smazat závislé výkazy (prace) nejprve
      const { error: delPraceError } = await supabase
        .from('prace')
        .delete()
        .eq('klient_id', Number(id))

      if (delPraceError) {
        console.error('Chyba při mazání výkazů klienta', delPraceError)
        alert('Nepodařilo se smazat výkazy klienta: ' + delPraceError.message)
        setLoading(false)
        return
      }
    }

    // 3) Nyní smazat samotného klienta
    const { data, error } = await supabase.from('klienti').delete().eq('id', Number(id))
    if (error) {
      console.error('Chyba při mazání klienta', error)
      alert('Nepodařilo se smazat klienta: ' + (error.message || JSON.stringify(error)))
    } else {
      setStatusMessage('Klient smazán')
      fetchKlienti()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Klienti</h1>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Formulář — Google 2025 card */}
      <div className="mb-6">
        <div className="bg-white/95 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md flex flex-col md:flex-row gap-3 items-end">
          <input id="klient_nazev" type="text" placeholder="Název klienta" className="flex-1 rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" value={jmeno} onChange={(e) => setJmeno(e.target.value)} />
          <input id="klient_sazba" type="number" placeholder="Sazba (Kč/h) — default 1000" className="w-40 rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" value={sazbaInput} onChange={(e) => setSazbaInput(e.target.value)} />
          <button type="button" onClick={pridatKlienta} className="bg-blue-700 text-white px-5 py-3 rounded-full shadow-sm hover:shadow-md">Přidat klienta</button>
        </div>
      </div>

      {/* Seznam */}
      <h2 className="text-xl font-semibold mb-3">Seznam klientů</h2>
      <ul className="space-y-2">
        {loading && <li className="p-4 bg-white rounded shadow animate-pulse">Načítám...</li>}

        {klienti.map((klient: any) => (
          <li key={klient.id} className="p-4 bg-gray-100 rounded shadow text-black flex flex-col md:flex-row md:items-center md:justify-between">
            {editingId === klient.id ? (
              <div className="w-full flex flex-col md:flex-row md:items-center md:gap-3">
                <input className="border p-2 rounded w-full md:w-auto md:flex-1 mb-2 md:mb-0" value={editName} onChange={e => setEditName(e.target.value)} />
                <input className="border p-2 rounded w-full md:w-40 mb-2 md:mb-0" value={editSazba} onChange={e => setEditSazba(e.target.value)} />
                <div className="flex gap-2 mt-2 md:mt-0">
                  <button type="button" onClick={saveEdit} className="bg-blue-600 text-white px-3 py-2 rounded h-10">Uložit</button>
                  <button type="button" onClick={cancelEdit} className="bg-gray-200 px-3 py-2 rounded h-10">Zrušit</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between w-full">
                  <div>
                    <span className="block font-medium">{klient.nazev}</span>
                    <span className="text-gray-500">{klient.sazba} Kč/h</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 md:mt-0">
                    <button type="button" onClick={() => startEdit(klient)} className="text-sm text-gray-700 hover:underline">Upravit</button>
                    <button type="button" onClick={() => deleteKlient(klient.id)} className="text-sm text-red-500 hover:underline">Smazat</button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
        {klienti.length === 0 && !loading && <p className="text-gray-500">Zatím žádní klienti.</p>}
      </ul>
    </div>
  )
}