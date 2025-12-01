'use client'
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'

export default function KlientiPage() {
  // State for data
  const [klienti, setKlienti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // State for the main form (creating new clients)
  const [nazev, setNazev] = useState('')
  const [poznamka, setPoznamka] = useState('')

  // State for inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNazev, setEditNazev] = useState('')
  const [editPoznamka, setEditPoznamka] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase.from('klienti').select('*').order('nazev')
    if (data) setKlienti(data)
    if (error) {
      console.error('Chyba při načítání klientů:', error)
      setStatusMessage('Chyba při načítání dat.')
    }
    setLoading(false)
  }

  async function pridatKlienta() {
    if (!nazev) return alert('Vyplňte alespoň název klienta.')
    setLoading(true)
    
    const { error } = await supabase
      .from('klienti')
      .insert({ 
        nazev: nazev, 
        poznamka: poznamka || null
      })

    if (!error) {
      setNazev('')
      setPoznamka('')
      setStatusMessage('Klient přidán')
      fetchData()
    } else {
      alert('Nepodařilo se přidat klienta: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(k: any) {
    setEditingId(k.id)
    setEditNazev(k.nazev)
    setEditPoznamka(k.poznamka || '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('klienti').update({ 
      nazev: editNazev, 
      poznamka: editPoznamka || null
    }).eq('id', editingId)

    if (!error) {
      setStatusMessage('Klient upraven')
      cancelEdit()
      fetchData()
    } else {
      alert('Nepodařilo se uložit změny: ' + error.message)
    }
    setLoading(false)
  }

  async function deleteKlient(id: number) {
    if (!confirm('Opravdu smazat klienta? Tuto akci nelze vrátit. Ujistěte se, že klient nemá žádné přiřazené výkazy nebo akce.')) return
    setLoading(true)
    const { error } = await supabase.from('klienti').delete().eq('id', Number(id))
    if (error) {
      console.error('Chyba při mazání klienta', error)
      alert('Nepodařilo se smazat klienta: ' + error.message)
    } else {
      setStatusMessage('Klient smazán')
      fetchData()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black">Správa klientů</h2>
      </div>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
      
      {/* Form to add new client */}
      <div className="mb-8">
        <div className="bg-white/95 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Název klienta</label>
            <input placeholder="Např. Google s.r.o." className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30" value={nazev} onChange={e => setNazev(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Poznámka</label>
            <textarea placeholder="Klient vyžaduje reporty..." className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30" value={poznamka} onChange={e => setPoznamka(e.target.value)} rows={1}></textarea>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="button" onClick={pridatKlienta} className="inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              Uložit nového klienta
            </button>
          </div>
        </div>
      </div>

       {/* Table of clients */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 border-b">
            <tr>
              <th className="p-3">Název</th>
              <th className="p-3 hidden lg:table-cell">Poznámka</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={3} className="p-4 text-center">Načítám...</td></tr>
            )}
            {!loading && klienti.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">Žádní klienti nebyli nalezeni.</td></tr>
            )}
            {klienti.map((k) => (
              <Fragment key={k.id}>
                {editingId === k.id ? (
                  /* In-line editing row */
                  <tr className="bg-red-50">
                    <td className="p-2">
                      <input className="border p-2 rounded w-full bg-white" value={editNazev} onChange={e => setEditNazev(e.target.value)} />
                    </td>
                    <td className="p-2 hidden lg:table-cell">
                      <textarea className="border p-2 rounded w-full bg-white" value={editPoznamka} onChange={e => setEditPoznamka(e.target.value)} rows={2}></textarea>
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={saveEdit} className="bg-[#E30613] text-white px-3 py-1 rounded-md mr-2 text-sm">Uložit změny</button>
                      <button onClick={cancelEdit} className="bg-gray-200 px-3 py-1 rounded-md text-sm">Zrušit</button>
                    </td>
                  </tr>
                ) : (
                  /* Standard display row */
                  <tr className="hover:bg-gray-50 text-black">
                    <td className="p-3 font-medium">{k.nazev}</td>
                    <td className="p-3 text-gray-600 max-w-sm truncate hidden lg:table-cell" title={k.poznamka}>
                      {k.poznamka || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(k)} className="text-sm text-red-600 hover:underline mr-4">Upravit</button>
                      <button onClick={() => deleteKlient(k.id)} className="text-sm text-red-500 hover:underline">Smazat</button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
// Re-import Fragment for clarity, though it might be available
