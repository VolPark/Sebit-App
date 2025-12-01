'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, Transition } from '@headlessui/react'

// Helper to get month name
const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

// Main component
export default function MzdyPage() {
  // Data state
  const [pracovnici, setPracovnici] = useState<any[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [editingPracovnikId, setEditingPracovnikId] = useState<number | null>(null)

  // Form state
  const [hrubaMzda, setHrubaMzda] = useState('')
  const [faktura, setFaktura] = useState('')
  const [priplatek, setPriplatek] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  async function fetchData() {
    setLoading(true);
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;

    // 1. Fetch all workers
    const { data: allPracovnici, error: pracError } = await supabase
        .from('pracovnici')
        .select('*')
        .order('jmeno');

    // 2. Fetch all salaries for the selected month
    const { data: monthlyMzdy, error: mzdyError } = await supabase
        .from('mzdy')
        .select('*')
        .eq('rok', year)
        .eq('mesic', month);

    if (pracError || mzdyError) {
        console.error('Chyba při načítání dat:', pracError || mzdyError);
        setStatusMessage('Nepodařilo se načíst data.');
        setLoading(false);
        return;
    }

    // 3. Combine the data
    const mzdyMap = new Map(monthlyMzdy.map(m => [m.pracovnik_id, m]));
    const combinedData = allPracovnici.map(p => ({
        ...p,
        mzda: mzdyMap.get(p.id) || null,
    }));
    
    // 4. Filter for display according to the new rule: show if active OR if they have a salary this month
    const filteredPracovnici = combinedData.filter(p => p.is_active || p.mzda !== null);

    setPracovnici(filteredPracovnici);
    setLoading(false);
  }

  // --- Date navigation ---
  const changeMonth = (offset: number) => {
    setEditingPracovnikId(null); // Close any open editors
    setSelectedDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  }
  
  // --- Form handling ---
  const startEditing = (pracovnik: any) => {
    // Prevent editing if worker is inactive
    if (!pracovnik.is_active) return;
    
    setEditingPracovnikId(pracovnik.id);
    const mzda = pracovnik.mzda;
    if (mzda) {
      setHrubaMzda(String(mzda.hruba_mzda || ''));
      setFaktura(String(mzda.faktura || ''));
      setPriplatek(String(mzda.priplatek || ''));
    } else {
      resetForm();
    }
  };

  const cancelEditing = () => {
    setEditingPracovnikId(null);
    resetForm();
  };
  
  const resetForm = () => {
    setHrubaMzda('');
    setFaktura('');
    setPriplatek('');
  }

  const handleSave = async (pracovnikId: number) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;

    const payload = {
      pracovnik_id: pracovnikId,
      rok: year,
      mesic: month,
      hruba_mzda: parseFloat(hrubaMzda) || null,
      faktura: parseFloat(faktura) || null,
      priplatek: parseFloat(priplatek) || null,
    };
    
    const { error } = await supabase.from('mzdy').upsert(payload);

    if (error) {
      alert('Nepodařilo se uložit mzdu: ' + error.message);
    } else {
      setStatusMessage('Mzda uložena.');
      await fetchData(); 
      cancelEditing();
    }
  };

  const handleDelete = async (mzdaId: number) => {
    if (!confirm('Opravdu smazat tento záznam o mzdě?')) return;
    
    const { error } = await supabase.from('mzdy').delete().eq('id', mzdaId);
    if (error) {
      alert('Nepodařilo se smazat mzdu: ' + error.message);
    } else {
      setStatusMessage('Záznam o mzdě byl smazán.');
      fetchData();
    }
  };

  // --- UI Render ---
  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);
  const totalMonthSalary = useMemo(() => {
    return pracovnici.reduce((sum, p) => {
      return sum + (p.mzda?.celkova_castka || 0);
    }, 0);
  }, [pracovnici]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-black mb-4">Správa mezd</h2>
      
      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4 mb-8 bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-md ring-1 ring-slate-200 max-w-md mx-auto">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-xl font-semibold w-48 text-center">
          {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Total for month */}
      <div className="text-right mb-4 pr-2 font-bold text-gray-700">
        Celkem za měsíc: {currency.format(totalMonthSalary)}
      </div>

      {/* Workers List */}
      <div className="space-y-3">
        {loading && <p className="text-center text-gray-500">Načítám pracovníky...</p>}
        {!loading && pracovnici.map(p => {
          const mzda = p.mzda;
          const isEditing = editingPracovnikId === p.id;
          const canEdit = p.is_active;
          
          return (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm ring-1 transition-all ${isEditing ? 'ring-[#E30613]' : 'ring-slate-200'} ${!canEdit ? 'bg-gray-50' : ''}`}>
              {/* --- Collapsed View --- */}
              {!isEditing && (
                <div className={`p-4 flex items-center justify-between`}>
                  <div 
                    className={`flex-grow ${canEdit && !mzda ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => canEdit && !mzda && startEditing(p)}
                  >
                    <span className={`font-medium ${!canEdit ? 'text-gray-400 line-through' : ''}`}>{p.jmeno}</span>
                  </div>

                  {mzda ? (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 hidden sm:block">
                        {currency.format(mzda.hruba_mzda || 0)} + {currency.format(mzda.faktura || 0)} + {currency.format(mzda.priplatek || 0)}
                      </span>
                      <span className={`font-bold text-lg ${!canEdit ? 'text-gray-500': ''}`}>{currency.format(mzda.celkova_castka)}</span>
                      {canEdit && (
                         <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
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
                              <Menu.Items className="absolute right-0 bottom-full z-10 mb-2 w-32 origin-bottom-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button onClick={() => startEditing(p)} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex items-center w-full px-4 py-2 text-sm`}>
                                        Upravit
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button onClick={() => handleDelete(mzda.id)} className={`${active ? 'bg-gray-100 text-red-700' : 'text-red-600'} group flex items-center w-full px-4 py-2 text-sm`}>
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
                  ) : (
                    <>
                      {canEdit ? (
                        <div className="px-4 py-1.5 rounded-full bg-[#E30613]/10 text-[#E30613] text-sm font-semibold cursor-pointer" onClick={() => startEditing(p)}>
                          Zadat mzdu
                        </div>
                      ) : (
                        <div className="px-4 py-1.5 rounded-full bg-gray-200 text-gray-500 text-sm font-semibold">
                          Ukončen
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* --- Expanded/Editing View --- */}
              {isEditing && (
                <div className="p-4">
                  <h3 className="font-semibold mb-3">{p.jmeno}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Hrubá mzda</label>
                      <input type="number" placeholder="0" value={hrubaMzda} onChange={e => setHrubaMzda(e.target.value)} className="w-full rounded-lg border-slate-300 p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Faktura</label>
                      <input type="number" placeholder="0" value={faktura} onChange={e => setFaktura(e.target.value)} className="w-full rounded-lg border-slate-300 p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Příplatek</label>
                      <input type="number" placeholder="0" value={priplatek} onChange={e => setPriplatek(e.target.value)} className="w-full rounded-lg border-slate-300 p-2" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-4">
                    <button onClick={cancelEditing} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full text-sm">Zrušit</button>
                    <button onClick={() => handleSave(p.id)} className="bg-[#E30613] text-white px-6 py-2 rounded-full text-sm font-semibold">Uložit</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
