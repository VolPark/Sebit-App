'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'

export default function VykazyPage() {
  // Stavy pro data z databáze
  const [vykazy, setVykazy] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [allAkce, setAllAkce] = useState<any[]>([])        // všechny akce
  const [actionOptions, setActionOptions] = useState<any[]>([]) // akce filtrované podle klienta
  const [selectedAkceId, setSelectedAkceId] = useState('') // vybraná akce (povinné)

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
    const { data: aData } = await supabase.from('akce').select('*').order('datum', { ascending: false })
    if (kData) setKlienti(kData)
    if (pData) setPracovnici(pData)
    if (aData) { setAllAkce(aData); setActionOptions(aData) } // inicialně zobrazíme všechny akce

    // 2. Načteme výkazy A ZÁROVEŇ data z propojených tabulek
    // To 'klienti(nazev, sazba)' říká Supabase: "Sáhni si pro data vedle"
    const { data: vData, error } = await supabase
      .from('prace')
      .select('*, klienti(nazev, sazba), pracovnici(jmeno, hodinova_mzda), akce(nazev)')
      .order('datum', { ascending: false })
    
    if (vData) setVykazy(vData)
    if (error) console.error(error)
    setLoading(false)
  }

  // Pokud uživatel vybere klienta, nastavíme options jen pro tohoto klienta
  function onKlientChange(val: string) {
    setKlientId(val)
    setSelectedAkceId('') // vymazat vybranou akci (pokud patřila jinému klientovi)
    if (!val) {
      setActionOptions(allAkce)
      return
    }
    const filtered = allAkce.filter(a => String(a.klient_id) === String(val))
    setActionOptions(filtered)
  }
  
  // Pokud uživatel vybere akci, předvyplníme klienta a zúžíme options
  function onAkceChange(val: string) {
    setSelectedAkceId(val)
    if (!val) return
    const akc = allAkce.find(a => String(a.id) === String(val))
    if (!akc) return
    if (akc.klient_id) {
      setKlientId(String(akc.klient_id))
      // zúžíme options na tento klienta
      const filtered = allAkce.filter(a => String(a.klient_id) === String(akc.klient_id))
      setActionOptions(filtered)
    }
  }

  async function ulozitVykaz() {
    if (!pracovnikId || !selectedAkceId || !hodiny) return alert('Vyplňte povinná pole (pracovník, akce, hodiny)')
    setLoading(true)

    // připravíme payload; pokud existuje sloupec akce_id, uložíme ho, pokud ne, DB vrátí chybu (zachytíme)
    const payload: any = {
      datum: datum,
      pracovnik_id: pracovnikId,
      klient_id: klientId || null,
      pocet_hodin: parseFloat(hodiny),
      popis: popis
    }
    if (selectedAkceId) payload.akce_id = selectedAkceId

    const { error } = await supabase.from('prace').insert(payload)

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

  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), [])

  const monthNames = useMemo(() => ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"], []);

  const [expandedYears, setExpandedYears] = useState(new Set<string>());
  const [expandedMonths, setExpandedMonths] = useState(new Set<string>());

  const groupedVykazy = useMemo(() => {
    const grouped: { [year: string]: { [month: string]: any[] } } = {};
    const vykazyWithCalc = vykazy.map(v => {
      const hod = Number(v.pocet_hodin) || 0
      const sazba = Number(v.klienti?.sazba) || 0
      const mzda = Number(v.pracovnici?.hodinova_mzda) || 0
      const prijem = hod * sazba
      const naklad = hod * mzda
      return { ...v, prijem, naklad, zisk: prijem - naklad }
    });

    for (const vykaz of vykazyWithCalc) {
      const date = new Date(vykaz.datum);
      const year = date.getFullYear().toString();
      const month = date.getMonth().toString();
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(vykaz);
    }
    return grouped;
  }, [vykazy]);

  useEffect(() => {
    if (Object.keys(groupedVykazy).length > 0) {
      const latestYear = Object.keys(groupedVykazy).sort((a, b) => Number(b) - Number(a))[0];
      const latestMonth = Object.keys(groupedVykazy[latestYear]).sort((a, b) => Number(b) - Number(a))[0];
      setExpandedYears(prev => new Set(prev).add(latestYear));
      setExpandedMonths(prev => new Set(prev).add(`${latestYear}-${latestMonth}`));
    }
  }, [groupedVykazy]);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };
  
  // Přepočítaná data (odděleně od renderu)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Výkazy práce</h2>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Formulář - Google 2025 style (mobile‑first) */}
      <div className="mb-6">
        <div className="bg-white/90 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-1">Pracovník</label>
            <select
              id="pracovnik"
              className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition"
              value={pracovnikId} onChange={e => setPracovnikId(e.target.value)}
            >
              <option value="">— Vyberte —</option>
              {pracovnici.map(p => <option key={p.id} value={p.id}>{p.jmeno}</option>)}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-1">Klient</label>
            <select
              id="klient"
              className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition"
              value={klientId} onChange={e => onKlientChange(e.target.value)}
            >
              <option value="">— Vyberte —</option>
              {klienti.map(k => <option key={k.id} value={k.id}>{k.nazev}</option>)}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-1">Akce</label>
            <select
              id="akce"
              className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition"
              value={selectedAkceId} onChange={e => onAkceChange(e.target.value)}
            >
              <option value="">— Vyberte akci —</option>
              {actionOptions.map(a => (
                <option key={a.id} value={a.id}>{a.nazev} {a.datum ? `• ${formatDate(a.datum)}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="">
            <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
            <input id="datum" type="date"
              className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition"
              value={datum} onChange={e => setDatum(e.target.value)} />
          </div>

          <div className="">
            <label className="block text-sm font-medium text-gray-600 mb-1">Hodiny</label>
            <input id="hodiny" type="number" step="0.5" placeholder="8.5" className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition" value={hodiny} onChange={e => setHodiny(e.target.value)} />
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-600 mb-1">Popis činnosti</label>
            <input id="popis" type="text" placeholder="Co bylo uděláno?" className="w-full rounded-lg bg-white border border-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 p-3 transition" value={popis} onChange={e => setPopis(e.target.value)} />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button type="button" onClick={ulozitVykaz}
              className="inline-flex items-center justify-center bg-blue-700 text-white rounded-full px-8 py-3 text-base shadow-sm hover:shadow-md transition">
              Uložit výkaz
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden mb-6">
        {loading && <div className="p-4 bg-white rounded-lg shadow animate-pulse">Načítám...</div>}
        {Object.keys(groupedVykazy).sort((a, b) => Number(b) - Number(a)).map(year => (
          <div key={year} className="bg-slate-100 rounded-lg">
            <h3 onClick={() => toggleYear(year)} className="p-4 text-lg font-bold cursor-pointer flex items-center">
              <svg className={`w-5 h-5 mr-2 transform transition-transform ${expandedYears.has(year) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              {year}
            </h3>
            {expandedYears.has(year) && (
              <div className="pl-4 pb-2 space-y-2">
                {Object.keys(groupedVykazy[year]).sort((a, b) => Number(b) - Number(a)).map(month => {
                  const monthKey = `${year}-${month}`;
                  return (
                    <div key={monthKey} className="bg-white rounded-lg">
                      <h4 onClick={() => toggleMonth(monthKey)} className="p-3 font-semibold cursor-pointer flex items-center">
                        <svg className={`w-4 h-4 mr-2 transform transition-transform ${expandedMonths.has(monthKey) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        {monthNames[Number(month)]}
                      </h4>
                      {expandedMonths.has(monthKey) && (
                        <div className="px-3 pb-3 space-y-3">
                          {groupedVykazy[year][month].map(v => (
                            <div key={v.id} className="bg-slate-50 rounded-lg p-4 shadow-sm">
                              {editingId === v.id ? (
                                <div className="flex flex-col gap-2">
                                  {/* In-line editing is disabled in grouped view for now */}
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium">{formatDate(v.datum)}</div>
                                    <div className={`text-sm font-semibold ${v.zisk >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency.format(v.zisk)}</div>
                                  </div>
                                  <div className="text-sm text-gray-700">{v.pracovnici?.jmeno} • {v.klienti?.nazev}</div>
                                  <div className="font-bold text-sm text-gray-700">{v.akce?.nazev}</div>
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
                      )}
                    </div>
                  );
                })}
              </div>
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
              <th className="p-3">Akce</th>
              <th className="p-3 text-right">Hodiny</th>
              <th className="p-3 text-right text-green-700 bg-green-50">Fakturace (Příjem)</th>
              <th className="p-3 text-right text-red-700 bg-red-50">Mzda (Náklad)</th>
              <th className="p-3 text-right font-bold">Zisk</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
          {Object.keys(groupedVykazy).sort((a, b) => Number(b) - Number(a)).map(year => (
              <Fragment key={year}>
                <tr onClick={() => toggleYear(year)} className="bg-slate-100 hover:bg-slate-200 cursor-pointer">
                  <td colSpan={9} className="p-2 font-bold text-lg">
                    <div className="flex items-center">
                      <svg className={`w-5 h-5 mr-2 transform transition-transform ${expandedYears.has(year) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      {year}
                    </div>
                  </td>
                </tr>
                {expandedYears.has(year) && Object.keys(groupedVykazy[year]).sort((a, b) => Number(b) - Number(a)).map(month => {
                  const monthKey = `${year}-${month}`;
                  const monthData = groupedVykazy[year][month];
                  return (
                    <Fragment key={monthKey}>
                      <tr onClick={() => toggleMonth(monthKey)} className="bg-slate-50 hover:bg-slate-100 cursor-pointer">
                        <td colSpan={9} className="p-2 font-semibold pl-8">
                          <div className="flex items-center">
                            <svg className={`w-4 h-4 mr-2 transform transition-transform ${expandedMonths.has(monthKey) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            {monthNames[Number(month)]}
                          </div>
                        </td>
                      </tr>
                      {expandedMonths.has(monthKey) && monthData.map(v => (
                        <Fragment key={v.id}>
                          <tr className="hover:bg-gray-50 text-black">
                            <td className="p-3">{formatDate(v.datum)}</td>
                            <td className="p-3 font-medium">{v.pracovnici?.jmeno}</td>
                            <td className="p-3">{v.klienti?.nazev}</td>
                            <td className="p-3 font-medium">{v.akce?.nazev}</td>
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
                          {v.popis && (
                            <tr className="hover:bg-gray-50 text-black">
                              <td colSpan={9} className="p-3 pt-0 text-gray-500 pl-10">
                                {v.popis}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}