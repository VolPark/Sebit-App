'use client'
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data } = await supabase
      .from('finance')
      .select('*')
      .order('datum', { ascending: false })

    if (data) {
      setTransakce(data)
      spocitatSouhrny(data)
    }
  }

  function spocitatSouhrny(data: any[]) {
    let p = 0
    let v = 0
    data.forEach(t => {
      if (t.typ === 'Příjem') p += Number(t.castka)
      if (t.typ === 'Výdej') v += Number(t.castka)
    })
    setCelkemPrijmy(p)
    setCelkemVydaje(v)
  }

  async function pridatTransakci() {
    if (!castka || !popis) return alert('Zadejte částku a popis')

    const { error } = await supabase.from('finance').insert({
      datum,
      typ,
      castka: parseFloat(castka),
      popis
    })

    if (!error) {
      setCastka('')
      setPopis('')
      fetchData()
    } else {
      alert(error.message)
    }
  }

  async function smazat(id: number) {
    if(!confirm('Opravdu smazat?')) return
    await supabase.from('finance').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">Finanční přehled (Cash Flow)</h2>

      {/* Karty s přehledem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-green-100 p-6 rounded-lg shadow-sm border border-green-200">
          <p className="text-green-800 text-sm font-bold uppercase">Celkové Příjmy</p>
          <p className="text-3xl font-bold text-green-700">{celkemPrijmy.toLocaleString('cs-CZ')} Kč</p>
        </div>
        <div className="bg-red-100 p-6 rounded-lg shadow-sm border border-red-200">
          <p className="text-red-800 text-sm font-bold uppercase">Celkové Výdaje</p>
          <p className="text-3xl font-bold text-red-700">{celkemVydaje.toLocaleString('cs-CZ')} Kč</p>
        </div>
        <div className="bg-blue-100 p-6 rounded-lg shadow-sm border border-blue-200">
          <p className="text-blue-800 text-sm font-bold uppercase">Aktuální Stav</p>
          <p className={`text-3xl font-bold ${(celkemPrijmy - celkemVydaje) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {(celkemPrijmy - celkemVydaje).toLocaleString('cs-CZ')} Kč
          </p>
        </div>
      </div>

      {/* Formulář */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end border border-gray-200">
        <div className='flex-1 w-full'>
          <label className="block text-xs font-bold text-gray-500 mb-1">Datum</label>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} 
            className="w-full border p-2 rounded text-black" />
        </div>
        
        <div className='w-full md:w-40'>
          <label className="block text-xs font-bold text-gray-500 mb-1">Typ pohybu</label>
          <select value={typ} onChange={e => setTyp(e.target.value)} 
            className="w-full border p-2 rounded text-black font-medium">
            <option value="Příjem">Příjem (+)</option>
            <option value="Výdej">Výdej (-)</option>
          </select>
        </div>

        <div className='flex-[2] w-full'>
          <label className="block text-xs font-bold text-gray-500 mb-1">Popis (Faktura č., Výplata...)</label>
          <input type="text" value={popis} onChange={e => setPopis(e.target.value)} placeholder="Např. Faktura 202301"
            className="w-full border p-2 rounded text-black" />
        </div>

        <div className='flex-1 w-full'>
          <label className="block text-xs font-bold text-gray-500 mb-1">Částka</label>
          <input type="number" value={castka} onChange={e => setCastka(e.target.value)} placeholder="0"
            className="w-full border p-2 rounded text-black" />
        </div>

        <button onClick={pridatTransakci} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 w-full md:w-auto mt-2 md:mt-0">
        Přidat transakci
        </button>
      </div>

      {/* Historie */}
      <table className="w-full text-left border-collapse">
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
                {t.typ === 'Příjem' ? '+' : '-'}{t.castka.toLocaleString('cs-CZ')} Kč
              </td>
              <td className="p-3 text-right w-20">
                <button onClick={() => smazat(t.id)} className="text-gray-400 hover:text-red-500 text-sm">
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