'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PracovniciPage() {
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [jmeno, setJmeno] = useState('')
  const [mzda, setMzda] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

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

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">Správa dodavatelů</h2>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
      
      {/* Formulář - mobile-first */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 bg-gray-50 p-3 rounded shadow-sm">
        <label htmlFor="jmeno" className="sr-only">Jméno dodavatele</label>
        <input
          id="jmeno"
          placeholder="Jméno dodavatele"
          className="border p-2 rounded w-full md:flex-1 text-black"
          value={jmeno}
          onChange={e => setJmeno(e.target.value)}
        />
        <label htmlFor="mzda" className="sr-only">Hodinová sazba</label>
        <input
          id="mzda"
          type="number"
          inputMode="decimal"
          placeholder="Sazba (Kč/h)"
          className="border p-2 rounded w-full md:w-36 text-black"
          value={mzda}
          onChange={e => setMzda(e.target.value)}
        />
        <button type="button" onClick={pridat} className="bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 h-12 w-full md:w-auto">
          Uložit
        </button>
      </div>

      {/* Mobile: cards (stack) */}
      <div className="space-y-3 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {!loading && pracovnici.length === 0 && <div className="text-gray-500 p-3">Žádní dodavatelé.</div>}
        {pracovnici.map((p) => (
          <div key={p.id} className="p-4 bg-white rounded shadow-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{p.jmeno}</div>
              <div className="text-sm text-gray-500">{p.hodinova_mzda} Kč/h</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Smazat ${p.jmeno}`}
                className="text-red-500 text-sm"
                onClick={async () => {
                  if (!confirm('Opravdu smazat?')) return
                  await supabase.from('pracovnici').delete().eq('id', p.id)
                  fetchData()
                }}
              >
                Smazat
              </button>
            </div>
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
               <td className="p-3 font-medium">{p.jmeno}</td>
               <td className="p-3">{p.hodinova_mzda} Kč/h</td>
               <td className="p-3">
                 <button 
                   type="button"
                   aria-label={`Smazat ${p.jmeno}`}
                   className="text-red-500 hover:underline"
                   onClick={async () => {
                      if (!confirm('Opravdu smazat?')) return
                      await supabase.from('pracovnici').delete().eq('id', p.id)
                      fetchData()
                   }}
                 >
                   Smazat
                 </button>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   )
}