'use client'
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, Transition } from '@headlessui/react'

export default function PracovniciPage() {
  // Data state
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([]) // Add profiles state
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Form state for adding new workers
  const [jmeno, setJmeno] = useState('')
  const [hodinovaMzda, setHodinovaMzda] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('') // Add selectedUserId state for form

  // State for inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editJmeno, setEditJmeno] = useState('')
  const [editHodinovaMzda, setEditHodinovaMzda] = useState('')
  const [editUserId, setEditUserId] = useState<string>('') // Add editUserId state for editing

  // State for filtering
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchData()
  }, [showInactive])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pracovnici')
      .select('*')
      .eq('is_active', !showInactive)
      .order('jmeno')

    // Fetch profiles for the dropdown
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, role')

    if (data) setPracovnici(data)
    if (profilesData) setProfiles(profilesData)

    if (error) {
      console.error('Chyba při načítání pracovníků:', error)
      setStatusMessage('Chyba při načítání dat.')
    }
    setLoading(false)
  }

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

  async function pridatPracovnika() {
    if (!jmeno || !hodinovaMzda) {
      setStatusMessage('Chyba: Vyplňte jméno i hodinovou sazbu.')
      return
    }
    setLoading(true)

    // Robust parseFloat
    const sazba = parseFloat(hodinovaMzda.replace(',', '.'))
    if (isNaN(sazba)) {
      setStatusMessage('Chyba: Neplatná hodinová sazba.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('pracovnici')
      .insert({
        jmeno: jmeno,
        hodinova_mzda: sazba,
        user_id: selectedUserId || null // Add user_id
      })

    if (!error) {
      setJmeno('')
      setHodinovaMzda('')
      setSelectedUserId('') // Reset user selection
      setStatusMessage('Pracovník úspěšně přidán')
      fetchData()
    } else {
      setStatusMessage('Nepodařilo se přidat pracovníka: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setEditJmeno(p.jmeno)
    setEditHodinovaMzda(String(p.hodinova_mzda || ''))
    setEditUserId(p.user_id || '') // Set editUserId
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('pracovnici').update({
      jmeno: editJmeno,
      hodinova_mzda: parseFloat(editHodinovaMzda.replace(',', '.')) || 0,
      user_id: editUserId || null // Update user_id
    }).eq('id', editingId)

    if (!error) {
      setStatusMessage('Pracovník upraven')
      cancelEdit()
      fetchData()
    } else {
      setStatusMessage('Nepodařilo se uložit změny: ' + error.message)
    }
    setLoading(false)
  }

  // OLD: deletePracovnik with confirm -> NEW: openDeleteModal
  function openDeleteModal(id: number) {
    setModalConfig({
      type: 'DELETE',
      id,
      title: 'Opravdu smazat pracovníka?',
      message: 'Tato akce může ovlivnit historické výkazy. Tuto akci nelze vrátit.',
      actionLabel: 'Smazat pracovníka',
      actionClass: 'bg-red-600 hover:bg-red-700'
    })
    setModalOpen(true)
  }

  function openToggleModal(id: number, currentStatus: boolean) {
    const actionText = currentStatus ? 'ukončit' : 'aktivovat';
    setModalConfig({
      type: 'TOGGLE',
      id,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} pracovníka?`,
      message: `Opravdu chcete ${actionText} tohoto pracovníka?`,
      actionLabel: currentStatus ? 'Ukončit spolupráci' : 'Aktivovat',
      actionClass: currentStatus ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
      data: { currentStatus }
    })
    setModalOpen(true)
  }

  async function confirmAction() {
    if (!modalConfig.id) return
    setLoading(true)

    if (modalConfig.type === 'DELETE') {
      const { error } = await supabase.from('pracovnici').delete().eq('id', modalConfig.id)
      if (error) {
        setStatusMessage('Nepodařilo se smazat pracovníka: ' + error.message)
      } else {
        setStatusMessage('Pracovník smazán')
        fetchData()
      }
    } else if (modalConfig.type === 'TOGGLE') {
      const { error } = await supabase
        .from('pracovnici')
        .update({ is_active: !modalConfig.data.currentStatus })
        .eq('id', modalConfig.id)

      if (error) {
        setStatusMessage(`Nepodařilo se změnit stav pracovníka: ` + error.message)
      } else {
        setStatusMessage(`Stav pracovníka byl změněn.`)
        fetchData()
      }
    }

    setModalOpen(false)
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black">Správa pracovníků</h2>
      </div>

      {statusMessage && (
        <div className={`mb-4 p-4 rounded ${statusMessage.includes('Nepodařilo') || statusMessage.includes('Chyba') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
          {statusMessage}
        </div>
      )}







      {/* Form to add new worker */}
      <div className="mb-8">
        <div className="bg-white/95 dark:bg-slate-900/95 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Jméno pracovníka</label>
            <input
              placeholder="Jan Novák"
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
              value={jmeno}
              onChange={e => setJmeno(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Hodinová sazba (Kč)</label>
            <input
              type="number"
              placeholder="250"
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
              value={hodinovaMzda}
              onChange={e => setHodinovaMzda(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Napárovat uživatele</label>
            <select
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Žádný --</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email || 'Uživatel bez jména'}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 flex justify-start md:justify-end w-full">
            <button type="button" onClick={pridatPracovnika} className="w-full md:w-auto inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              Uložit pracovníka
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View (visible on mobile, hidden on sm+) */}
      <div className="block sm:hidden space-y-4">
        {loading && !modalOpen && <div className="text-center p-4">Načítám...</div>}
        {!loading && pracovnici.length === 0 && <div className="text-center p-4 text-gray-500 dark:text-gray-400">Žádní pracovníci nebyli nalezeni.</div>}

        {pracovnici.map((p) => (
          <div key={p.id} className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 ${!p.is_active ? 'opacity-75' : ''}`}>
            {editingId === p.id ? (
              <div className="space-y-3">
                <input className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 text-lg dark:text-white" value={editJmeno} onChange={e => setEditJmeno(e.target.value)} placeholder="Jméno" />
                <input type="number" className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white" value={editHodinovaMzda} onChange={e => setEditHodinovaMzda(e.target.value)} placeholder="Sazba" />
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-[#E30613] text-white px-3 py-2 rounded-lg text-sm font-medium">Uložit</button>
                  <button onClick={cancelEdit} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium">Zrušit</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold text-lg text-gray-900 dark:text-white ${!p.is_active ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>{p.jmeno}</h3>
                  <div className="text-sm font-semibold bg-gray-100 dark:bg-slate-800 dark:text-gray-300 px-2 py-1 rounded">{p.hodinova_mzda} Kč/h</div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    onClick={() => openToggleModal(p.id, p.is_active)}
                    className={`w-full py-2 text-center rounded-lg text-sm font-medium transition ${p.is_active ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}
                  >
                    {p.is_active ? 'Ukončit spolupráci' : 'Aktivovat'}
                  </button>

                  {p.is_active && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="flex-1 py-2 text-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition">Upravit</button>
                      <button onClick={() => openDeleteModal(p.id)} className="flex-1 py-2 text-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition">Smazat</button>
                    </div>
                  )}
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
              <th className="p-3">Jméno</th>
              <th className="p-3">Hodinová sazba</th>
              <th className="p-3">Napárovaný uživatel</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {loading && !modalOpen && (
              <tr><td colSpan={3} className="p-4 text-center">Načítám...</td></tr>
            )}
            {!loading && pracovnici.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500 dark:text-gray-400">Žádní pracovníci nebyli nalezeni.</td></tr>
            )}
            {pracovnici.map((p) => (
              <Fragment key={p.id}>
                {editingId === p.id ? (
                  <tr className="bg-red-50 dark:bg-red-900/10">
                    <td className="p-2">
                      <input className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white" value={editJmeno} onChange={e => setEditJmeno(e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" className="border dark:border-slate-700 p-2 rounded w-24 bg-white dark:bg-slate-950 dark:text-white" value={editHodinovaMzda} onChange={e => setEditHodinovaMzda(e.target.value)} />
                    </td>
                    <td className="p-2">
                      <select
                        className="border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white"
                        value={editUserId}
                        onChange={e => setEditUserId(e.target.value)}
                      >
                        <option value="">-- Žádný --</option>
                        {profiles.map(profile => (
                          <option key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={saveEdit} className="bg-[#E30613] text-white px-3 py-1 rounded-md mr-2 text-sm">Uložit změny</button>
                      <button onClick={cancelEdit} className="bg-gray-200 dark:bg-slate-700 px-3 py-1 rounded-md text-sm dark:text-white">Zrušit</button>
                    </td>
                  </tr>
                ) : (
                  <tr className={`hover:bg-gray-50 dark:hover:bg-slate-800 text-black dark:text-gray-100 ${!p.is_active ? 'bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500' : ''}`}>
                    <td className={`p-3 font-medium ${!p.is_active ? 'line-through' : ''}`}>{p.jmeno}</td>
                    <td className="p-3">{p.hodinova_mzda} Kč/h</td>
                    <td className="p-3 text-sm text-gray-500">
                      {profiles.find(prof => prof.id === p.user_id)?.full_name || '-'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openToggleModal(p.id, p.is_active)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${p.is_active ? 'bg-red-100/80 dark:bg-red-900/80 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900' : 'bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900'}`}
                        >
                          {p.is_active ? 'Ukončit' : 'Aktivovat'}
                        </button>
                        {p.is_active && (
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-300">
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
                                      <button onClick={() => startEdit(p)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} group flex items-center w-full px-4 py-2 text-sm`}>
                                        Upravit
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button onClick={() => openDeleteModal(p.id)} className={`${active ? 'bg-gray-100 dark:bg-slate-700 text-red-700 dark:text-red-400' : 'text-red-600 dark:text-red-400'} group flex items-center w-full px-4 py-2 text-sm`}>
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
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
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