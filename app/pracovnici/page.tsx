'use client'
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, Transition } from '@headlessui/react'

export default function PracovniciPage() {
  // Data state
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Form state for adding new workers
  const [jmeno, setJmeno] = useState('')
  const [hodinovaMzda, setHodinovaMzda] = useState('')

  // State for inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editJmeno, setEditJmeno] = useState('')
  const [editHodinovaMzda, setEditHodinovaMzda] = useState('')

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
      
    if (data) setPracovnici(data)
    if (error) {
      console.error('Chyba při načítání pracovníků:', error)
      setStatusMessage('Chyba při načítání dat.')
    }
    setLoading(false)
  }

  async function pridatPracovnika() {
    if (!jmeno || !hodinovaMzda) return alert('Vyplňte jméno i hodinovou sazbu.')
    setLoading(true)
    
    const { error } = await supabase
      .from('pracovnici')
      .insert({ 
        jmeno: jmeno, 
        hodinova_mzda: parseFloat(hodinovaMzda)
      })

    if (!error) {
      setJmeno('')
      setHodinovaMzda('')
      setStatusMessage('Pracovník přidán')
      fetchData()
    } else {
      alert('Nepodařilo se přidat pracovníka: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setEditJmeno(p.jmeno)
    setEditHodinovaMzda(String(p.hodinova_mzda || ''))
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('pracovnici').update({ 
      jmeno: editJmeno, 
      hodinova_mzda: parseFloat(editHodinovaMzda) || 0
    }).eq('id', editingId)

    if (!error) {
      setStatusMessage('Pracovník upraven')
      cancelEdit()
      fetchData()
    } else {
      alert('Nepodařilo se uložit změny: ' + error.message)
    }
    setLoading(false)
  }

  async function deletePracovnik(id: number) {
    if (!confirm('Opravdu smazat pracovníka? Tato akce může ovlivnit historické výkazy.')) return
    setLoading(true)
    const { error } = await supabase.from('pracovnici').delete().eq('id', Number(id))
    if (error) {
      alert('Nepodařilo se smazat pracovníka: ' + error.message)
    } else {
      setStatusMessage('Pracovník smazán')
      fetchData()
    }
    setLoading(false)
  }
  
  async function toggleActive(id: number, currentStatus: boolean) {
    const actionText = currentStatus ? 'ukončit' : 'aktivovat';
    if (!confirm(`Opravdu chcete ${actionText} tohoto pracovníka?`)) return
    
    const { error } = await supabase
      .from('pracovnici')
      .update({ is_active: !currentStatus })
      .eq('id', id)
      
    if (error) {
      alert(`Nepodařilo se ${actionText} pracovníka: ` + error.message)
    } else {
      setStatusMessage(`Pracovník byl ${actionText}ován.`)
      fetchData()
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black">Správa pracovníků</h2>
      </div>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
      
      {/* Form to add new worker */}
      <div className="mb-8">
        <div className="bg-white/95 ring-1 ring-slate-200 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Jméno pracovníka</label>
            <input placeholder="Jan Novák" className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30" value={jmeno} onChange={e => setJmeno(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Hodinová sazba (Kč)</label>
            <input type="number" placeholder="250" className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30" value={hodinovaMzda} onChange={e => setHodinovaMzda(e.target.value)} />
          </div>
          <div className="md:col-span-1 flex justify-start md:justify-end w-full">
            <button type="button" onClick={pridatPracovnika} className="w-full md:w-auto inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              Uložit pracovníka
            </button>
          </div>
        </div>
      </div>

       {/* Table of workers */}
      <div className="overflow-x-auto">
        <div className="flex justify-end mb-4">
          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-gray-600">Zobrazit neaktivní</span>
            <span className="relative">
              <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(!showInactive)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-[#E30613]/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E30613]"></div>
            </span>
          </label>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 border-b">
            <tr>
              <th className="p-3">Jméno</th>
              <th className="p-3">Hodinová sazba</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={3} className="p-4 text-center">Načítám...</td></tr>
            )}
            {!loading && pracovnici.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">Žádní pracovníci nebyli nalezeni.</td></tr>
            )}
            {pracovnici.map((p) => (
              <Fragment key={p.id}>
                {editingId === p.id ? (
                  <tr className="bg-red-50">
                    <td className="p-2">
                      <input className="border p-2 rounded w-full bg-white" value={editJmeno} onChange={e => setEditJmeno(e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="number" className="border p-2 rounded w-24 bg-white" value={editHodinovaMzda} onChange={e => setEditHodinovaMzda(e.target.value)} />
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={saveEdit} className="bg-[#E30613] text-white px-3 py-1 rounded-md mr-2 text-sm">Uložit změny</button>
                      <button onClick={cancelEdit} className="bg-gray-200 px-3 py-1 rounded-md text-sm">Zrušit</button>
                    </td>
                  </tr>
                ) : (
                  <tr className={`hover:bg-gray-50 text-black ${!p.is_active ? 'bg-gray-50 text-gray-400' : ''}`}>
                    <td className={`p-3 font-medium ${!p.is_active ? 'line-through' : ''}`}>{p.jmeno}</td>
                    <td className="p-3">{p.hodinova_mzda} Kč/h</td>
                    <td className="p-3 text-right">
                       <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleActive(p.id, p.is_active)} 
                          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${p.is_active ? 'bg-red-100/80 text-red-800 hover:bg-red-100' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                        >
                          {p.is_active ? 'Ukončit' : 'Aktivovat'}
                        </button>
                        {p.is_active && (
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
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
                              <Menu.Items className="absolute right-0 bottom-full z-10 mb-2 w-32 origin-bottom-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button onClick={() => startEdit(p)} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}>
                                        Upravit
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button onClick={() => deletePracovnik(p.id)} className={`${active ? 'bg-gray-100 text-red-700' : 'text-red-600'} group flex items-center w-full px-4 py-2 text-sm`}>
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
    </div>
  )
}