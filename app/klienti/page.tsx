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

  // State for delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Replaced deleteKlient to open modal instead of confirm()
  function openDeleteModal(id: number) {
    setDeleteId(id)
  }

  function closeDeleteModal() {
    setDeleteId(null)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setLoading(true)
    const { error } = await supabase.from('klienti').delete().eq('id', deleteId)

    if (error) {
      console.error('Chyba při mazání klienta', error)
      // Check for foreign key constraint violation (typical for PostgreSQL)
      if (error.code === '23503') {
        setStatusMessage('Nelze smazat: Klient má přiřazené výkazy nebo akce. Nejdříve promažte související záznamy.')
      } else {
        setStatusMessage('Nepodařilo se smazat klienta: ' + error.message)
      }
    } else {
      setStatusMessage('Klient smazán')
      fetchData()
      closeDeleteModal()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto relative dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black dark:text-white">Správa klientů</h2>
      </div>

      {statusMessage && (
        <div className={`mb-4 p-4 rounded ${statusMessage.includes('Nelze') || statusMessage.includes('Nepodařilo') || statusMessage.includes('Chyba') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
          {statusMessage}
        </div>
      )}

      {/* Form to add new client */}
      <div className="mb-8">
        <div className="bg-white/95 dark:bg-slate-900/95 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Název klienta</label>
            <input
              placeholder="Např. Google s.r.o."
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
              value={nazev}
              onChange={e => setNazev(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Poznámka</label>
            <textarea
              placeholder="Klient vyžaduje reporty..."
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
              value={poznamka}
              onChange={e => setPoznamka(e.target.value)}
              rows={1}
            ></textarea>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="button" onClick={pridatKlienta} className="inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              Uložit nového klienta
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View (visible on mobile, hidden on sm+) */}
      <div className="block sm:hidden space-y-4">
        {loading && !deleteId && <div className="text-center p-4">Načítám...</div>}
        {!loading && klienti.length === 0 && <div className="text-center p-4 text-gray-500 dark:text-gray-400">Žádní klienti nebyli nalezeni.</div>}

        {klienti.map((k) => (
          <div key={k.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            {editingId === k.id ? (
              <div className="space-y-3">
                <input className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 text-lg dark:text-white" value={editNazev} onChange={e => setEditNazev(e.target.value)} placeholder="Název" />
                <textarea className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white" value={editPoznamka} onChange={e => setEditPoznamka(e.target.value)} rows={2} placeholder="Poznámka"></textarea>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-[#E30613] text-white px-3 py-2 rounded-lg text-sm font-medium">Uložit</button>
                  <button onClick={cancelEdit} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium">Zrušit</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{k.nazev}</h3>
                </div>
                {k.poznamka && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{k.poznamka}</p>
                )}
                <div className="flex gap-3 mt-4 border-t dark:border-slate-700 pt-3">
                  <button onClick={() => startEdit(k)} className="flex-1 py-2 text-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition">Upravit</button>
                  <button onClick={() => openDeleteModal(k.id)} className="flex-1 py-2 text-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition">Smazat</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Desktop/Tablet Table View (hidden on mobile, visible on sm+) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-b dark:border-slate-700">
            <tr>
              <th className="p-3">Název</th>
              <th className="p-3 hidden lg:table-cell">Poznámka</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {loading && !deleteId && (
              <tr><td colSpan={3} className="p-4 text-center">Načítám...</td></tr>
            )}
            {!loading && klienti.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500 dark:text-gray-400">Žádní klienti nebyli nalezeni.</td></tr>
            )}
            {klienti.map((k) => (
              <Fragment key={k.id}>
                {editingId === k.id ? (
                  /* In-line editing row */
                  <tr className="bg-red-50 dark:bg-red-900/10">
                    <td className="p-2">
                      <input className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white" value={editNazev} onChange={e => setEditNazev(e.target.value)} />
                    </td>
                    <td className="p-2 hidden lg:table-cell">
                      <textarea className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white" value={editPoznamka} onChange={e => setEditPoznamka(e.target.value)} rows={2}></textarea>
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={saveEdit} className="bg-[#E30613] text-white px-3 py-1 rounded-md mr-2 text-sm">Uložit změny</button>
                      <button onClick={cancelEdit} className="bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-md text-sm dark:text-white">Zrušit</button>
                    </td>
                  </tr>
                ) : (
                  /* Standard display row */
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800 text-black dark:text-gray-100">
                    <td className="p-3 font-medium">{k.nazev}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 max-w-sm truncate hidden lg:table-cell" title={k.poznamka}>
                      {k.poznamka || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(k)} className="text-sm text-red-600 hover:underline mr-4">Upravit</button>
                      <button onClick={() => openDeleteModal(k.id)} className="text-sm text-red-500 hover:underline">Smazat</button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Opravdu smazat klienta?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tuto akci nelze vrátit. Pokud má klient přiřazené výkazy nebo akce, smazání se nemusí podařit.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition"
              >
                Zrušit
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition flex items-center"
              >
                {loading ? 'Mažu...' : 'Smazat klienta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// Re-import Fragment for clarity, though it might be available
