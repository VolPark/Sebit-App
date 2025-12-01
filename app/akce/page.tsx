'use client'
import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'
import ComboBox from '@/components/ComboBox'

export default function AkcePage() {
  const [akce, setAkce] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [nazev, setNazev] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [selectedKlient, setSelectedKlient] = useState<{id: string, name: string} | null>(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [cenaKlient, setCenaKlient] = useState('')
  const [materialKlient, setMaterialKlient] = useState('')
  const [materialMy, setMaterialMy] = useState('')
  const [odhadHodin, setOdhadHodin] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const formattedKlienti = useMemo(() => klienti.map(k => ({ id: k.id, name: k.nazev })), [klienti]);

  async function fetchAll() {
    setLoading(true)
    const [kResp, aResp] = await Promise.all([
      supabase.from('klienti').select('*').order('nazev'),
      supabase.from('akce').select('*, klienti(nazev)').order('datum', { ascending: false })
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
    if (!nazev || !datum) return alert('Vyplňte název a datum')
    setLoading(true)

    const ensureClient = async (): Promise<number | null> => {
      if (selectedKlient) return Number(selectedKlient.id);
      if (showNewClientForm && newClientName) {
        const { data, error } = await supabase
          .from('klienti')
          .insert({ nazev: newClientName, sazba: 1000 }) // Assuming a default sazba
          .select('id')
          .single();
        if (error) {
          alert('Nepodařilo se vytvořit nového klienta: ' + error.message);
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

    const payload = {
      nazev,
      datum,
      klient_id: finalKlientId,
      cena_klient: parseFloat(cenaKlient || '0') || 0,
      material_klient: parseFloat(materialKlient || '0') || 0,
      material_my: parseFloat(materialMy || '0') || 0,
      odhad_hodin: parseFloat(odhadHodin || '0') || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('akce').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('akce').insert([payload]));
    }
    
    if (error) {
      console.error('Chyba při ukládání akce', error);
      alert('Nepodařilo se uložit akci: ' + (error.message || JSON.stringify(error)));
    } else {
      setStatusMessage(editingId ? 'Akce upravena' : 'Akce uložena');
      cancelEdit();
      fetchAll();
    }
    setLoading(false);
  }

  async function deleteAkce(id: number) {
    if (!confirm('Opravdu smazat tuto akci?')) return
    await supabase.from('akce').delete().eq('id', id)
    fetchAll()
  }

  const currency = (v: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Správa akcí</h2>
      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Form */}
      <div className="mb-6">
        <div className={`bg-white/90 ring-1 rounded-2xl p-4 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-4 transition-all ${editingId ? 'ring-blue-500' : 'ring-slate-200'}`}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Název akce</label>
            <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" placeholder="Např. Vánoční večírek 2025" value={nazev} onChange={e => setNazev(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
            <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" type="date" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Klient</label>
            <div className="flex items-center gap-2">
              <div className="w-full">
                <ComboBox items={formattedKlienti} selected={selectedKlient} setSelected={setSelectedKlient} />
              </div>
              <button onClick={() => { setShowNewClientForm(!showNewClientForm); setSelectedKlient(null); }} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
                +
              </button>
            </div>
            {showNewClientForm && (
              <input 
                className="mt-2 w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" 
                placeholder="Jméno nového klienta" 
                value={newClientName} 
                onChange={e => setNewClientName(e.target.value)} 
              />
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Cena pro klienta</label>
              <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" placeholder="0" value={cenaKlient} onChange={e => setCenaKlient(e.target.value)} type="number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Odhad hodin</label>
              <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" placeholder="0" value={odhadHodin} onChange={e => setOdhadHodin(e.target.value)} type="number" />
            </div>
          </div>
          
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Materiál (klient)</label>
              <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" placeholder="0" value={materialKlient} onChange={e => setMaterialKlient(e.target.value)} type="number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Materiál (my)</label>
              <input className="w-full rounded-lg bg-white border border-slate-300 p-3 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200" placeholder="0" value={materialMy} onChange={e => setMaterialMy(e.target.value)} type="number" />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="inline-flex items-center justify-center bg-gray-200 text-gray-700 rounded-full px-8 py-3 text-base shadow-sm hover:shadow-md transition">
                Zrušit
              </button>
            )}
            <button type="button" onClick={saveAkce} className="inline-flex items-center justify-center bg-blue-700 text-white rounded-full px-8 py-3 text-base shadow-sm hover:shadow-md transition">
              {editingId ? 'Aktualizovat akci' : 'Uložit akci'}
            </button>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="overflow-x-auto">
        {/* Mobile */}
        <div className="space-y-3 md:hidden">
          {loading && <div className="p-4 bg-white rounded-lg shadow animate-pulse">Načítám...</div>}
          {akce.map(a => (
            <div key={a.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">{a.nazev}</div>
                <div className="text-sm text-gray-500">{formatDate(a.datum)}</div>
              </div>
              <div className="text-sm text-gray-700">Klient: {a.klienti?.nazev || '—'}</div>
              <div className="mt-3 text-sm space-y-1">
                <div><span className="font-medium">Cena:</span> {currency(Number(a.cena_klient || 0))}</div>
                <div><span className="font-medium">Odhad:</span> {a.odhad_hodin} h</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => startEdit(a)} className="text-sm text-blue-600">Upravit</button>
                <button onClick={() => deleteAkce(a.id)} className="text-sm text-red-500">Smazat</button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-600 border-b">
              <tr>
                <th className="p-3">Název</th>
                <th className="p-3">Datum</th>
                <th className="p-3">Klient</th>
                <th className="p-3 text-right">Částka klient</th>
                <th className="p-3 text-right">Odhad hodin</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {akce.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{a.nazev}</td>
                  <td className="p-3">{formatDate(a.datum)}</td>
                  <td className="p-3">{a.klienti?.nazev || '—'}</td>
                  <td className="p-3 text-right">{currency(Number(a.cena_klient || 0))}</td>
                  <td className="p-3 text-right">{a.odhad_hodin}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => startEdit(a)} className="text-sm text-blue-600 mr-2">Upravit</button>
                    <button onClick={() => deleteAkce(a.id)} className="text-sm text-red-500">Smazat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}