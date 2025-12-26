'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'
import ComboBox from '@/components/ComboBox'
import { APP_START_DATE } from '@/lib/config'

export default function VykazyPage() {
  // Stavy pro data z databáze
  const [vykazy, setVykazy] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [allAkce, setAllAkce] = useState<any[]>([])        // všechny akce
  const [actionOptions, setActionOptions] = useState<any[]>([]) // akce filtrované podle klienta
  const [selectedAkce, setSelectedAkce] = useState<{ id: string | number, name: string } | null>(null)
  const [selectedPracovnik, setSelectedPracovnik] = useState<{ id: string | number, name: string } | null>(null)
  const [selectedKlient, setSelectedKlient] = useState<{ id: string | number, name: string } | null>(null)

  // Stavy pro formulář
  const [datum, setDatum] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today < APP_START_DATE ? APP_START_DATE : today;
  })
  const [popis, setPopis] = useState('')
  const [hodiny, setHodiny] = useState('')

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    type: 'DELETE' | null,
    id: number | null,
    title: string,
    message: string,
    actionLabel: string,
    actionClass: string
  }>({
    type: null,
    id: null,
    title: '',
    message: '',
    actionLabel: '',
    actionClass: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // 1. Načteme klienty a pracovníky do výběrových menu
    const { data: kData } = await supabase.from('klienti').select('*')
    const { data: pData } = await supabase.from('pracovnici').select('*').eq('is_active', true)
    // Filter actions >= APP_START_DATE
    const { data: aData } = await supabase.from('akce').select('*').eq('is_completed', false).gte('datum', APP_START_DATE).order('datum', { ascending: false })
    // 2. Worker Auto-Selection based on current User
    const { data: { user } } = await supabase.auth.getUser()

    if (kData) setKlienti(kData)
    if (pData) {
      setPracovnici(pData)
      if (user) {
        // Find worker linked to current user
        const linkedWorker = pData.find((p: any) => p.user_id === user.id)
        if (linkedWorker) {
          setSelectedPracovnik({ id: linkedWorker.id, name: linkedWorker.jmeno })
        }
      }
    }
    if (aData) { setAllAkce(aData); setActionOptions(aData) } // inicialně zobrazíme všechny akce

    // 2. Načteme výkazy A ZÁROVEŇ data z propojených tabulek
    // To 'klienti(nazev, sazba)' říká Supabase: "Sáhni si pro data vedle"
    // Filter work reports >= 2025-01-01
    const { data: vData, error } = await supabase
      .from('prace')
      .select('*, klienti(id, nazev, sazba), pracovnici(id, jmeno, hodinova_mzda), akce(id, nazev, klient_id, klienti(nazev))')
      .gte('datum', APP_START_DATE)
      .order('datum', { ascending: false })

    if (vData) setVykazy(vData)
    if (error) console.error(error)
    setLoading(false)
  }

  // Pokud uživatel vybere klienta, nastavíme options jen pro tohoto klienta
  function onKlientChange(klient: { id: string | number, name: string } | null) {
    setSelectedKlient(klient)
    setSelectedAkce(null) // vymazat vybranou akci (pokud patřila jinému klientovi)
    if (!klient) {
      setActionOptions(allAkce)
      return
    }
    const filtered = allAkce.filter(a => String(a.klient_id) === String(klient.id))
    setActionOptions(filtered)
  }

  // Pokud uživatel vybere akci, předvyplníme klienta a zúžíme options
  function onAkceChange(akce: { id: string | number, name: string } | null) {
    setSelectedAkce(akce)
    if (!akce) return
    const akc = allAkce.find(a => String(a.id) === String(akce.id))
    if (!akc) return
    if (akc.klient_id) {
      const correspondingKlient = klienti.find(k => k.id === akc.klient_id)
      if (correspondingKlient) setSelectedKlient({ id: correspondingKlient.id, name: correspondingKlient.nazev })
      // zúžíme options na tento klienta
      const filtered = allAkce.filter(a => String(a.klient_id) === String(akc.klient_id))
      setActionOptions(filtered)
    }
  }

  async function ulozitVykaz() {
    if (!selectedPracovnik?.id || !selectedAkce?.id || !hodiny) {
      setStatusMessage('Vyplňte povinná pole (pracovník, akce, hodiny)')
      return
    }
    setLoading(true)

    // připravíme payload; pokud existuje sloupec akce_id, uložíme ho, pokud ne, DB vrátí chybu (zachytíme)
    const payload: any = {
      datum: datum,
      pracovnik_id: selectedPracovnik.id,
      klient_id: selectedKlient?.id || null,
      pocet_hodin: parseFloat(hodiny),
      popis: popis,
      akce_id: selectedAkce.id
    }

    const { error } = await supabase.from('prace').insert(payload)

    if (!error) {
      setPopis('')
      setHodiny('')
      setStatusMessage('Výkaz uložen')
      fetchData() // Obnovit tabulku
    } else {
      setStatusMessage('Chyba: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(v: any) {
    setEditingId(v.id)
    setDatum(v.datum)
    if (v.pracovnici) setSelectedPracovnik({ id: v.pracovnici.id, name: v.pracovnici.jmeno })
    if (v.klienti) setSelectedKlient({ id: v.klienti.id, name: v.klienti.nazev })
    if (v.akce) {
      setSelectedAkce({ id: v.akce.id, name: v.akce.nazev })
    } else {
      setSelectedAkce(null)
    }
    setPopis(v.popis || '')
    setHodiny(String(v.pocet_hodin || ''))
  }
  function cancelEdit() {
    setEditingId(null)
    const today = new Date().toISOString().split('T')[0];
    setDatum(today < APP_START_DATE ? APP_START_DATE : today)
    setSelectedPracovnik(null)
    setSelectedKlient(null)
    setSelectedAkce(null)
    setPopis('')
    setHodiny('')
  }
  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('prace').update({
      datum: datum,
      pracovnik_id: selectedPracovnik?.id,
      klient_id: selectedKlient?.id,
      akce_id: selectedAkce?.id,
      popis: popis,
      pocet_hodin: parseFloat(hodiny || '0')
    }).eq('id', editingId)
    if (!error) {
      setStatusMessage('Výkaz upraven')
      cancelEdit()
      fetchData()
    } else {
      setStatusMessage(error.message)
    }
    setLoading(false)
  }
  function openDeleteModal(id: number) {
    setModalConfig({
      type: 'DELETE',
      id,
      title: 'Opravdu smazat výkaz?',
      message: 'Tato akce je nevratná.',
      actionLabel: 'Smazat výkaz',
      actionClass: 'bg-red-600 hover:bg-red-700'
    })
    setModalOpen(true)
  }

  async function confirmAction() {
    if (!modalConfig.id) return
    setLoading(true)

    if (modalConfig.type === 'DELETE') {
      const { error } = await supabase.from('prace').delete().eq('id', modalConfig.id)
      if (error) {
        setStatusMessage('Nepodařilo se smazat výkaz: ' + error.message)
      } else {
        setStatusMessage('Výkaz smazán')
        fetchData()
      }
    }

    setModalOpen(false)
    setLoading(false)
  }

  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), [])

  const monthNames = useMemo(() => ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"], []);

  const [expandedYears, setExpandedYears] = useState(new Set<string>());
  const [expandedMonths, setExpandedMonths] = useState(new Set<string>());

  const [selectedPracovnikFilter, setSelectedPracovnikFilter] = useState<{ id: string | number, name: string } | null>(null);
  const [selectedKlientFilter, setSelectedKlientFilter] = useState<{ id: string | number, name: string } | null>(null);
  const [selectedAkceFilter, setSelectedAkceFilter] = useState<{ id: string | number, name: string } | null>(null);

  const groupedVykazy = useMemo(() => {
    const grouped: { [year: string]: { [month: string]: any[] } } = {};

    const filteredVykazy = vykazy.filter(v => {
      const pracovnikMatch = !selectedPracovnikFilter || String(v.pracovnik_id) === String(selectedPracovnikFilter.id);
      const klientMatch = !selectedKlientFilter ||
        String(v.klient_id) === String(selectedKlientFilter.id) ||
        (v.akce && String(v.akce.klient_id) === String(selectedKlientFilter.id));
      const akceMatch = !selectedAkceFilter || String(v.akce_id) === String(selectedAkceFilter.id);
      return pracovnikMatch && klientMatch && akceMatch;
    });

    const vykazyWithCalc = filteredVykazy.map(v => {
      return { ...v }
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
  }, [vykazy, selectedPracovnikFilter, selectedKlientFilter, selectedAkceFilter]);

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

  const integrityStats = useMemo(() => {
    let direct = 0;
    let inferred = 0;
    let missing = 0;
    vykazy.forEach(v => {
      if (v.klient_id) {
        direct++;
      } else if (v.akce && v.akce.klient_id) {
        inferred++;
      } else {
        missing++;
      }
    });
    return { direct, inferred, missing, total: vykazy.length };
  }, [vykazy]);

  const formattedActionOptions = useMemo(() => actionOptions.map(a => ({ id: a.id, name: a.nazev })), [actionOptions]);
  const formattedAllActionOptions = useMemo(() => allAkce.map(a => ({ id: a.id, name: a.nazev })), [allAkce]);
  const formattedPracovnici = useMemo(() => pracovnici.map(p => ({ id: p.id, name: p.jmeno })), [pracovnici]);
  const formattedKlienti = useMemo(() => klienti.map(k => ({ id: k.id, name: k.nazev })), [klienti]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Výkazy práce</h2>

      {statusMessage && (
        <div className={`mb-4 p-4 rounded ${statusMessage.includes('Nepodařilo') || statusMessage.includes('Chyba') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
          {statusMessage}
        </div>
      )}



      {/* Formulář - Google 2025 style (mobile‑first) */}
      <div className="mb-6">
        <div className={`bg-white/90 dark:bg-slate-900/90 ring-1 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 transition-all ${editingId ? 'ring-[#E30613]' : 'ring-slate-200 dark:ring-slate-700'}`}>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pracovník</label>
            <ComboBox items={formattedPracovnici} selected={selectedPracovnik} setSelected={setSelectedPracovnik} />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Klient</label>
            <ComboBox items={formattedKlienti} selected={selectedKlient} setSelected={onKlientChange} />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Akce</label>
            <ComboBox items={formattedActionOptions} selected={selectedAkce} setSelected={onAkceChange} />
          </div>

          <div className="">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Datum</label>
            <input id="datum" type="date"
              className="appearance-none block w-full min-w-0 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white p-3 transition"
              value={datum} onChange={e => setDatum(e.target.value)} min={APP_START_DATE} />
          </div>

          <div className="">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Hodiny</label>
            <input id="hodiny" type="number" step="0.5" placeholder="8.5" className="appearance-none block w-full min-w-0 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white p-3 transition" value={hodiny} onChange={e => setHodiny(e.target.value)} />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Popis činnosti</label>
            <input id="popis" type="text" placeholder="Co bylo uděláno?" className="appearance-none block w-full min-w-0 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white p-3 transition" value={popis} onChange={e => setPopis(e.target.value)} />
          </div>

          <div className="md:col-span-3 flex justify-end gap-4">
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="inline-flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full px-8 py-3 text-base shadow-sm hover:shadow-md transition">
                Zrušit
              </button>
            )}
            <button type="button" onClick={editingId ? saveEdit : ulozitVykaz}
              className="inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              {editingId ? 'Aktualizovat' : 'Uložit výkaz'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtry tabulky */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Filtr: Pracovník</label>
          <ComboBox items={formattedPracovnici} selected={selectedPracovnikFilter} setSelected={setSelectedPracovnikFilter} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Filtr: Klient</label>
          <ComboBox items={formattedKlienti} selected={selectedKlientFilter} setSelected={setSelectedKlientFilter} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Filtr: Akce</label>
          <ComboBox items={formattedAllActionOptions} selected={selectedAkceFilter} setSelected={setSelectedAkceFilter} />
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden mb-6">
        {loading && <div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow animate-pulse dark:text-white">Načítám...</div>}
        {Object.keys(groupedVykazy).sort((a, b) => Number(b) - Number(a)).map(year => (
          <div key={year} className="bg-slate-100 dark:bg-slate-800 rounded-lg">
            <h3 onClick={() => toggleYear(year)} className="p-4 text-lg font-bold cursor-pointer flex items-center dark:text-white">
              <svg className={`w-5 h-5 mr-2 transform transition-transform ${expandedYears.has(year) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              {year}
            </h3>
            {expandedYears.has(year) && (
              <div className="pl-0 pb-2 space-y-2">
                {Object.keys(groupedVykazy[year]).sort((a, b) => Number(b) - Number(a)).map(month => {
                  const monthKey = `${year}-${month}`;
                  return (
                    <div key={monthKey} className="bg-white dark:bg-slate-900 rounded-lg">
                      <h4 onClick={() => toggleMonth(monthKey)} className="p-3 font-semibold cursor-pointer flex items-center border-b border-gray-100 dark:border-slate-800 dark:text-white">
                        <svg className={`w-4 h-4 mr-2 transform transition-transform ${expandedMonths.has(monthKey) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        {monthNames[Number(month)]}
                      </h4>
                      {expandedMonths.has(monthKey) && (
                        <div className="p-2 space-y-3">
                          {groupedVykazy[year][month].map(v => (
                            <div key={v.id} className="bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg p-3 shadow-sm">
                              {editingId === v.id ? (
                                <div className="flex flex-col gap-2">
                                  {/* In-line editing is disabled in grouped view for now */}
                                  <div className="text-sm italic text-gray-500">Editace probíhá ve formuláři nahoře...</div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium dark:text-white">{formatDate(v.datum)}</div>
                                    <div className="text-sm font-bold bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-900 dark:text-white">{v.pocet_hodin} h</div>
                                  </div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    <span className="font-semibold">{v.pracovnici?.jmeno}</span>
                                    <span className="mx-1 text-gray-400">|</span>
                                    {v.klienti?.nazev ? (
                                      v.klienti.nazev
                                    ) : v.akce?.klienti?.nazev ? (
                                      <span className="inline-flex items-center text-indigo-700 dark:text-indigo-400" title="Klient napárován z akce">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1 flex-shrink-0"><path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" /><path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" /></svg>
                                        <span className="truncate max-w-[150px] inline-block align-bottom">{v.akce.klienti.nazev}</span>
                                      </span>
                                    ) : (
                                      <span className="text-red-500 font-bold text-xs">Chybí</span>
                                    )}
                                  </div>
                                  <div className="font-bold text-sm text-[#E30613] dark:text-[#E30613] mb-2">{v.akce?.nazev}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words bg-gray-50 dark:bg-slate-900/50 p-2 rounded">{v.popis || <span className="italic text-gray-400">Bez popisu</span>}</div>
                                  <div className="flex gap-3 border-t border-gray-100 dark:border-slate-700 pt-2">
                                    <button onClick={() => startEdit(v)} className="flex-1 text-center py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded transition font-medium">Upravit</button>
                                    <button onClick={() => openDeleteModal(v.id)} className="flex-1 text-center py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition font-medium">Smazat</button>
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
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-b dark:border-slate-700">
            <tr>
              <th className="p-3">Datum</th>
              <th className="p-3">Pracovník</th>
              <th className="p-3">Klient</th>
              <th className="p-3">Akce</th>
              <th className="p-3 text-right">Hodiny</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {Object.keys(groupedVykazy).sort((a, b) => Number(b) - Number(a)).map(year => (
              <Fragment key={year}>
                <tr onClick={() => toggleYear(year)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer dark:text-white">
                  <td colSpan={6} className="p-2 font-bold text-lg">
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
                      <tr onClick={() => toggleMonth(monthKey)} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer dark:text-white">
                        <td colSpan={6} className="p-2 font-semibold pl-8">
                          <div className="flex items-center">
                            <svg className={`w-4 h-4 mr-2 transform transition-transform ${expandedMonths.has(monthKey) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            {monthNames[Number(month)]}
                          </div>
                        </td>
                      </tr>
                      {expandedMonths.has(monthKey) && monthData.map(v => (
                        <Fragment key={v.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-slate-800 text-black dark:text-gray-100">
                            <td className="p-3">{formatDate(v.datum)}</td>
                            <td className="p-3 font-medium">{v.pracovnici?.jmeno}</td>
                            <td className="p-3">                              {v.klienti?.nazev ? (
                              v.klienti.nazev
                            ) : v.akce?.klienti?.nazev ? (
                              <span className="flex items-center text-indigo-700 dark:text-indigo-400" title="Klient napárován z akce">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1"><path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" /><path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" /></svg>
                                {v.akce.klienti.nazev}
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold text-xs">Chybí</span>
                            )}</td>
                            <td className="p-3 font-medium">{v.akce?.nazev}</td>
                            <td className="p-3 text-right">{v.pocet_hodin} h</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => startEdit(v)} className="p-2 text-gray-400 hover:text-blue-600 transition" title="Upravit">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                  </svg>
                                </button>
                                <button onClick={() => openDeleteModal(v.id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Smazat">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {v.popis && (
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800 text-black dark:text-gray-100">
                              <td colSpan={6} className="p-3 pt-0 text-gray-500 dark:text-gray-400 pl-10">
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
      {/* Custom Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{modalConfig.title}</h3>
            <p className="text-gray-600 mb-6">{modalConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Zrušit
              </button>
              <button
                onClick={confirmAction}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md shadow-sm transition flex items-center ${modalConfig.actionClass}`}
              >
                {loading ? 'Pracuji...' : modalConfig.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}