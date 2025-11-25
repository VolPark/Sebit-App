'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link' // přidáno

export default function PracovniciPage() {
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [jmeno, setJmeno] = useState('')
  const [mzda, setMzda] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editJmeno, setEditJmeno] = useState('')
  const [editMzda, setEditMzda] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('pracovnici').select('*').order('id')
    if (data) setPracovnici(data)
    setLoading(false)
  }

  async function pridat() {
    if (!jmeno || !mzda) return alert('Vyplňte jméno a mzdu')
    setLoading(true)
    
    const { error } = await supabase
      .from('pracovnici')
      .insert({ jmeno: jmeno, hodinova_mzda: parseFloat(mzda) })

    if (!error) {
      setJmeno('')
      setMzda('')
      setStatusMessage('Pracovník přidán')
      fetchData()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setEditJmeno(p.jmeno)
    setEditMzda(String(p.hodinova_mzda))
  }
  function cancelEdit() {
    setEditingId(null)
    setEditJmeno('')
    setEditMzda('')
  }
  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('pracovnici').update({ jmeno: editJmeno, hodinova_mzda: parseFloat(editMzda || '0') }).eq('id', editingId)
    if (!error) {
      setStatusMessage('Dodavatel upraven')
      cancelEdit()
      fetchData()
    } else {
      alert(error.message)
    }
    setLoading(false)
  }
  async function deleteSupplier(id: number) {
    if (!confirm('Opravdu smazat?')) return
    setLoading(true)
    const { data, error } = await supabase.from('pracovnici').delete().eq('id', Number(id))
    if (error) {
      console.error('Chyba při mazání dodavatele', error)
      alert('Nepodařilo se smazat dodavatele: ' + error.message)
    } else {
      setStatusMessage('Dodavatel smazán')
      fetchData()
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black">Správa dodavatelů</h2>
        <div className="flex gap-2">
          <Link href="/dodavatele/platby" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm h-10 flex items-center">
            Platby dodavatelům
          </Link>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
      
      {/* Formulář — material card, Google 2025 */}
      <div className="mb-6">
        <div className="bg-white/95 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md flex flex-col md:flex-row gap-3 items-end">
          <input id="jmeno" placeholder="Jméno dodavatele" className="flex-1 rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" value={jmeno} onChange={e => setJmeno(e.target.value)} />
          <input id="mzda" type="number" placeholder="Sazba (Kč/h)" className="w-40 rounded-lg p-3 border border-transparent focus:ring-2 focus:ring-blue-200" value={mzda} onChange={e => setMzda(e.target.value)} />
          <button type="button" onClick={pridat} className="bg-green-600 text-white px-5 py-3 rounded-full shadow-sm hover:shadow-md">Uložit</button>
        </div>
      </div>

      {/* Mobile: cards (stack) */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {!loading && pracovnici.length === 0 && <div className="text-gray-500 p-3">Žádní dodavatelé.</div>}
        {pracovnici.map((p) => (
          <div key={p.id} className="p-4 bg-white rounded shadow-sm">
            {editingId === p.id ? (
              <div className="flex flex-col gap-2">
                <input value={editJmeno} onChange={e => setEditJmeno(e.target.value)} className="border p-2 rounded" />
                <input value={editMzda} onChange={e => setEditMzda(e.target.value)} className="border p-2 rounded" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-2 rounded">Uložit</button>
                  <button onClick={cancelEdit} className="bg-gray-200 px-3 py-2 rounded">Zrušit</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.jmeno}</div>
                  <div className="text-sm text-gray-500">{p.hodinova_mzda} Kč/h</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(p)} className="text-sm text-gray-700">Upravit</button>
                  <button onClick={() => deleteSupplier(p.id)} className="text-sm text-red-500">Smazat</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

       {/* Tabulka */}
      <table className="w-full text-left border-collapse hidden md:table">
         <thead>
           <tr className="border-b-2 border-gray-200 text-gray-600">
             <th className="p-3">Jméno</th>
             <th className="p-3">Hodinová mzda</th>
             <th className="p-3">Akce</th>
           </tr>
         </thead>
         <tbody>
           {pracovnici.map((p) => (
             <tr key={p.id} className="border-b hover:bg-gray-50 text-black">
               {editingId === p.id ? (
                 <>
                   <td className="p-3">
                     <input className="border p-2 rounded w-full" value={editJmeno} onChange={e => setEditJmeno(e.target.value)} />
                   </td>
                   <td className="p-3">
                     <input className="border p-2 rounded w-32" value={editMzda} onChange={e => setEditMzda(e.target.value)} />
                   </td>
                   <td className="p-3">
                     <button onClick={saveEdit} className="bg-blue-600 text-white px-3 py-1 rounded mr-2">Uložit</button>
                     <button onClick={cancelEdit} className="bg-gray-200 px-3 py-1 rounded">Zrušit</button>
                   </td>
                 </>
               ) : (
                 <>
                   <td className="p-3 font-medium">{p.jmeno}</td>
                   <td className="p-3">{p.hodinova_mzda} Kč/h</td>
                   <td className="p-3">
                     <button onClick={() => startEdit(p)} className="text-red-500 mr-4">Upravit</button>
                     <button onClick={() => deleteSupplier(p.id)} className="text-red-500">Smazat</button>
                   </td>
                 </>
               )}
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   )
}