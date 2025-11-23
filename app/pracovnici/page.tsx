'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PracovniciPage() {
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [jmeno, setJmeno] = useState('')
  const [mzda, setMzda] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data } = await supabase.from('pracovnici').select('*').order('id')
    if (data) setPracovnici(data)
  }

  async function pridat() {
    if (!jmeno || !mzda) return alert('Vyplňte jméno a mzdu')
    
    const { error } = await supabase
      .from('pracovnici')
      .insert({ jmeno: jmeno, hodinova_mzda: parseFloat(mzda) })

    if (!error) {
      setJmeno('')
      setMzda('')
      fetchData()
    } else {
      alert(error.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">Správa pracovníků</h2>

      {/* Formulář */}
      <div className="flex gap-4 mb-8 bg-gray-50 p-4 rounded shadow-sm">
        <input
          placeholder="Jméno a příjmení"
          className="border p-2 rounded flex-1 text-black"
          value={jmeno}
          onChange={e => setJmeno(e.target.value)}
        />
        <input
          type="number"
          placeholder="Hodinová mzda (Kč)"
          className="border p-2 rounded w-40 text-black"
          value={mzda}
          onChange={e => setMzda(e.target.value)}
        />
        <button onClick={pridat} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          Uložit
        </button>
      </div>

      {/* Tabulka */}
      <table className="w-full text-left border-collapse">
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
                  className="text-red-500 hover:underline"
                  onClick={async () => {
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