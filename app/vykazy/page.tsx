'use client'
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
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
  }

  async function ulozitVykaz() {
    if (!pracovnikId || !klientId || !hodiny) return alert('Vyplňte povinná pole')

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
      fetchData() // Obnovit tabulku
    } else {
      alert('Chyba: ' + error.message)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">Výkazy práce</h2>

      {/* Formulář - horní lišta */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 bg-blue-50 p-6 rounded-lg shadow-sm items-end">
        
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-700 mb-1">Datum</label>
          <input type="date" className="w-full border p-2 rounded text-black" 
            value={datum} onChange={e => setDatum(e.target.value)} />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-700 mb-1">Pracovník</label>
          <select className="w-full border p-2 rounded text-black"
            value={pracovnikId} onChange={e => setPracovnikId(e.target.value)}>
            <option value="">-- Vyberte --</option>
            {pracovnici.map(p => <option key={p.id} value={p.id}>{p.jmeno}</option>)}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-700 mb-1">Klient</label>
          <select className="w-full border p-2 rounded text-black"
            value={klientId} onChange={e => setKlientId(e.target.value)}>
            <option value="">-- Vyberte --</option>
            {klienti.map(k => <option key={k.id} value={k.id}>{k.nazev}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">Popis činnosti</label>
          <input type="text" placeholder="Co se dělalo..." className="w-full border p-2 rounded text-black"
            value={popis} onChange={e => setPopis(e.target.value)} />
        </div>

        <div className="md:col-span-1 flex gap-2">
          <div className='flex-1'>
             <label className="block text-xs font-bold text-gray-700 mb-1">Hodiny</label>
             <input type="number" step="0.5" className="w-full border p-2 rounded text-black"
              value={hodiny} onChange={e => setHodiny(e.target.value)} />
          </div>
          <button onClick={ulozitVykaz} className="bg-blue-600 text-white px-4 py-2 rounded mb-[1px] hover:bg-blue-700 h-10 self-end">
            OK
          </button>
        </div>
      </div>

      {/* Tabulka s výpočty */}
      <div className="overflow-x-auto">
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
            {vykazy.map((v) => {
              // Výpočty přímo v renderování
              const prijem = v.pocet_hodin * (v.klienti?.sazba || 0)
              const naklad = v.pocet_hodin * (v.pracovnici?.hodinova_mzda || 0)
              const zisk = prijem - naklad

              return (
                <tr key={v.id} className="hover:bg-gray-50 text-black">
                  <td className="p-3">{v.datum}</td>
                  <td className="p-3 font-medium">{v.pracovnici?.jmeno}</td>
                  <td className="p-3">{v.klienti?.nazev}</td>
                  <td className="p-3 text-gray-500">{v.popis}</td>
                  <td className="p-3 text-right">{v.pocet_hodin} h</td>
                  <td className="p-3 text-right bg-green-50">{prijem.toLocaleString('cs-CZ')} Kč</td>
                  <td className="p-3 text-right bg-red-50">{naklad.toLocaleString('cs-CZ')} Kč</td>
                  <td className={`p-3 text-right font-bold ${zisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {zisk.toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}