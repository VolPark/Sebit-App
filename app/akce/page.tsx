'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'
import ComboBox from '@/components/ComboBox'
import { Menu, Transition } from '@headlessui/react'

export default function AkcePage() {
  const [akce, setAkce] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    type: 'DELETE' | 'TOGGLE' | null,
    id: number | null,
    title: string,
    message: string,
    actionLabel: string,
    actionClass: string,
    data?: any
  }>({
    type: null,
    id: null,
    title: '',
    message: '',
    actionLabel: '',
    actionClass: '',
  })

  // Stavy pro formulář
  const [nazev, setNazev] = useState('')
  const [datum, setDatum] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today < '2025-01-01' ? '2025-01-01' : today;
  })
  const [selectedKlient, setSelectedKlient] = useState<{ id: string | number, name: string } | null>(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [cenaKlient, setCenaKlient] = useState('')
  const [materialKlient, setMaterialKlient] = useState('')
  const [materialMy, setMaterialMy] = useState('')
  const [odhadHodin, setOdhadHodin] = useState('')

  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchAll()
  }, [showCompleted])

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedAkce = useMemo(() => {
    let sortableItems = [...akce]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]
        if (sortConfig.key === 'klient') {
          aValue = a.klienti?.nazev || ''
          bValue = b.klienti?.nazev || ''
        }
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [akce, sortConfig])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const formattedKlienti = useMemo(() => klienti.map(k => ({ id: k.id, name: k.nazev })), [klienti]);

  async function fetchAll() {
    setLoading(true)
    const [kResp, aResp] = await Promise.all([
      supabase.from('klienti').select('*').order('nazev'),
      supabase.from('akce').select('*, klienti(nazev)').eq('is_completed', showCompleted).order('datum', { ascending: false })
    ])
    if (kResp.data) setKlienti(kResp.data)
    if (aResp.data) setAkce(aResp.data)
    setLoading(false)
  }

  function resetForm() {
    setNazev('')
    setDatum(new Date().toISOString().split('T')[0])
    setSelectedKlient(null)
    setCenaKlient('')
    setMaterialKlient('')
    setMaterialMy('')
    setOdhadHodin('')
    setShowNewClientForm(false)
    setNewClientName('')
  }

  function startEdit(a: any) {
    setEditingId(a.id)
    setNazev(a.nazev || '')
    setDatum(a.datum ? a.datum.split('T')[0] : '')
    if (a.klient_id && a.klienti) {
      setSelectedKlient({ id: a.klient_id, name: a.klienti.nazev })
    } else {
      setSelectedKlient(null)
    }
    setCenaKlient(String(a.cena_klient || ''))
    setMaterialKlient(String(a.material_klient || ''))
    setMaterialMy(String(a.material_my || ''))
    setOdhadHodin(String(a.odhad_hodin || ''))
    setShowNewClientForm(false)
    setNewClientName('')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  async function saveAkce() {
    if (!nazev || !datum) {
      setStatusMessage('Chyba: Vyplňte název a datum')
      return
    }
    setLoading(true)

    const ensureClient = async (): Promise<number | null> => {
      if (selectedKlient) return Number(selectedKlient.id);
      if (showNewClientForm && newClientName) {
        const { data, error } = await supabase
          .from('klienti')
          .insert({ nazev: newClientName })
          .select('id')
          .single();
        if (error) {
          setStatusMessage('Nepodařilo se vytvořit nového klienta: ' + error.message)
          return null;
        }
        // Also select it in the form
        setSelectedKlient({ id: data.id, name: newClientName });
        return data.id;
      }
      return null;
    };

    const finalKlientId = await ensureClient();
    if ((showNewClientForm && newClientName && !finalKlientId)) {
      setLoading(false);
      return; // Stop if new client creation was intended but failed
    }

    const payload: any = {
      nazev,
      datum,
      klient_id: finalKlientId,
      cena_klient: parseFloat(cenaKlient || '0') || 0,
      material_klient: parseFloat(materialKlient || '0') || 0,
      material_my: parseFloat(materialMy || '0') || 0,
      odhad_hodin: parseFloat(odhadHodin || '0') || 0,
    };

    if (!editingId) {
      payload.is_completed = false;
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from('akce').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('akce').insert([payload]));
    }

    if (error) {
      console.error('Chyba při ukládání akce', error);
      setStatusMessage('Nepodařilo se uložit akci: ' + (error.message || JSON.stringify(error)))
    } else {
      setStatusMessage(editingId ? 'Akce upravena' : 'Akce uložena');
      cancelEdit();
      fetchAll();
    }
    setLoading(false);
  }

  function openDeleteModal(id: number) {
    setModalConfig({
      type: 'DELETE',
      id,
      title: 'Opravdu smazat tuto akci?',
      message: 'Tato akce bude trvale smazána.',
      actionLabel: 'Smazat akci',
      actionClass: 'bg-red-600 hover:bg-red-700'
    })
    setModalOpen(true)
  }

  function openToggleModal(id: number, currentStatus: boolean) {
    const actionText = currentStatus ? 'ukončit' : 'aktivovat'; // current=false (neukončeno) -> ukončit, current=true (ukončeno) -> aktivovat
    // currentStatus = is_completed
    // if is_completed (true), button says "Aktivovat", so actionText should be 'aktivovat'
    // if !is_completed (false), button says "Ukončit", so actionText should be 'ukončit'

    // Note: The logic in original toggleCompleteAkce:
    // const actionText = currentStatus ? 'aktivovat' : 'ukončit';
    // where currentStatus passed in is 'is_completed'.
    // if is_completed=true, actionText='aktivovat'. Correct.

    setModalConfig({
      type: 'TOGGLE',
      id,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} akci?`,
      message: `Opravdu chcete ${actionText} tuto akci?`,
      actionLabel: currentStatus ? 'Aktivovat' : 'Ukončit',
      actionClass: currentStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
      data: { currentStatus }
    })
    setModalOpen(true)
  }

  async function confirmAction() {
    if (!modalConfig.id) return
    setLoading(true)

    if (modalConfig.type === 'DELETE') {
      const { error } = await supabase.from('akce').delete().eq('id', modalConfig.id)
      if (error) {
        setStatusMessage('Nepodařilo se smazat akci: ' + error.message)
      } else {
        setStatusMessage('Akce smazána')
        fetchAll()
      }
    } else if (modalConfig.type === 'TOGGLE') {
      const { error } = await supabase
        .from('akce')
        .update({ is_completed: !modalConfig.data.currentStatus })
        .eq('id', modalConfig.id)

      if (error) {
        setStatusMessage(`Nepodařilo se změnit stav akce: ` + error.message)
      } else {
        setStatusMessage(`Stav akce změněn`)
        fetchAll()
      }
    }

    setModalOpen(false)
    setLoading(false)
  }

  const currency = (v: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Správa akcí</h2>

      {statusMessage && (
        <div className={`mb-4 p-4 rounded ${statusMessage.includes('Nepodařilo') || statusMessage.includes('Chyba') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
          {statusMessage}
        </div>
      )}

      {/* Form */}
      <div className="mb-6">
        <div className={`bg-white/90 dark:bg-slate-900/90 ring-1 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-4 transition-all ${editingId ? 'ring-[#E30613]' : 'ring-slate-200 dark:ring-slate-700'}`}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Název akce</label>
            <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" placeholder="Např. Realizace kuchyně" value={nazev} onChange={e => setNazev(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Datum</label>
            <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" type="date" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Klient</label>
            <div className="flex items-center gap-2">
              <div className="w-full">
                <ComboBox items={formattedKlienti} selected={selectedKlient} setSelected={setSelectedKlient} />
              </div>
              <button onClick={() => { setShowNewClientForm(!showNewClientForm); setSelectedKlient(null); }} className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition dark:text-white">
                +
              </button>
            </div>
            {showNewClientForm && (
              <input
                className="mt-2 w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
                placeholder="Jméno nového klienta"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
              />
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cena pro klienta</label>
              <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" placeholder="0" value={cenaKlient} onChange={e => setCenaKlient(e.target.value)} type="number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Odhad hodin</label>
              <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" placeholder="0" value={odhadHodin} onChange={e => setOdhadHodin(e.target.value)} type="number" />
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Materiál (klient)</label>
              <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" placeholder="0" value={materialKlient} onChange={e => setMaterialKlient(e.target.value)} type="number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Materiál (my)</label>
              <input className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white" placeholder="0" value={materialMy} onChange={e => setMaterialMy(e.target.value)} type="number" />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="inline-flex items-center justify-center bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full px-8 py-3 text-base shadow-sm hover:shadow-md transition">
                Zrušit
              </button>
            )}
            <button type="button" onClick={saveAkce} className="inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              {editingId ? 'Aktualizovat akci' : 'Uložit akci'}
            </button>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="overflow-x-auto">
        <div className="flex justify-end mb-4">
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-gray-600 dark:text-gray-400">Zobrazit ukončené</span>
            <span className="relative">
              <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-[#E30613]/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E30613]"></div>
            </span>
          </label>
        </div>
        {/* Mobile */}
        <div className="space-y-3 md:hidden">
          {loading && <div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow animate-pulse dark:text-white">Načítám...</div>}
          {sortedAkce.map(a => (
            <div key={a.id} className={`bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm ${a.is_completed ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div className={`font-medium dark:text-white ${a.is_completed ? 'line-through' : ''}`}>{a.nazev}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(a.datum)}</div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Klient: {a.klienti?.nazev || '—'}</div>
              <div className="mt-3 text-sm space-y-1 dark:text-gray-300">
                <div><span className="font-medium">Cena:</span> {currency(Number(a.cena_klient || 0))}</div>
                <div><span className="font-medium">Materiál (klient):</span> {currency(Number(a.material_klient || 0))}</div>
                <div><span className="font-medium">Materiál (my):</span> {currency(Number(a.material_my || 0))}</div>
                <div><span className="font-medium">Odhad:</span> {a.odhad_hodin} h</div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => openToggleModal(a.id, a.is_completed)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm transition-colors ${a.is_completed ? 'bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900' : 'bg-red-100/80 dark:bg-red-900/80 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900'}`}
                >
                  {a.is_completed ? 'Aktivovat' : 'Ukončit'}
                </button>
                {!a.is_completed && (
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 bottom-full mb-2 w-48 origin-bottom-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button onClick={() => startEdit(a)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} group flex items-center w-full px-4 py-2 text-sm`}>
                                Upravit
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button onClick={() => openDeleteModal(a.id)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-red-700 dark:text-red-400' : 'text-red-600 dark:text-red-400'} group flex items-center w-full px-4 py-2 text-sm`}>
                                Smazat
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-b dark:border-slate-700">
              <tr>
                <th className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('nazev')}>
                  <div className="flex items-center gap-1">Název {sortConfig?.key === 'nazev' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('datum')}>
                  <div className="flex items-center gap-1">Datum {sortConfig?.key === 'datum' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('klient')}>
                  <div className="flex items-center gap-1">Klient {sortConfig?.key === 'klient' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('cena_klient')}>
                  <div className="flex items-center justify-end gap-1">Částka klient {sortConfig?.key === 'cena_klient' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('material_klient')}>
                  <div className="flex items-center justify-end gap-1">Materiál klient {sortConfig?.key === 'material_klient' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('material_my')}>
                  <div className="flex items-center justify-end gap-1">Materiál my {sortConfig?.key === 'material_my' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors select-none" onClick={() => requestSort('odhad_hodin')}>
                  <div className="flex items-center justify-end gap-1">Odhad hodin {sortConfig?.key === 'odhad_hodin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {sortedAkce.map(a => (
                <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800 ${a.is_completed ? 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  <td className={`p-3 font-medium ${a.is_completed ? 'line-through' : ''}`}>{a.nazev}</td>
                  <td className="p-3">{formatDate(a.datum)}</td>
                  <td className="p-3">{a.klienti?.nazev || '—'}</td>
                  <td className="p-3 text-right">{currency(Number(a.cena_klient || 0))}</td>
                  <td className="p-3 text-right">{currency(Number(a.material_klient || 0))}</td>
                  <td className="p-3 text-right">{currency(Number(a.material_my || 0))}</td>
                  <td className="p-3 text-right">{a.odhad_hodin}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openToggleModal(a.id, a.is_completed)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${a.is_completed ? 'bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900' : 'bg-red-100/80 dark:bg-red-900/80 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900'}`}
                      >
                        {a.is_completed ? 'Aktivovat' : 'Ukončit'}
                      </button>
                      {!a.is_completed && (
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                            </svg>
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 bottom-full z-10 mb-2 w-32 origin-bottom-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button onClick={() => startEdit(a)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} group flex items-center w-full px-4 py-2 text-sm`}>
                                      Upravit
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button onClick={() => openDeleteModal(a.id)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-red-700 dark:text-red-400' : 'text-red-600 dark:text-red-400'} group flex items-center w-full px-4 py-2 text-sm`}>
                                      Smazat
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{modalConfig.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{modalConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition"
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

