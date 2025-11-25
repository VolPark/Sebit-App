'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatDate'

export default function AkcePage() {
  const [akce, setAkce] = useState<any[]>([])
  const [klienti, setKlienti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // form
  const [nazev, setNazev] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [klientId, setKlientId] = useState('')
  const [novyKlient, setNovyKlient] = useState('')
  const [cenaKlient, setCenaKlient] = useState('')
  const [materialKlient, setMaterialKlient] = useState('')
  const [materialMy, setMaterialMy] = useState('')
  const [odhadHodin, setOdhadHodin] = useState('')

  useEffect(() => { fetchAll() }, [])

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

  async function ensureClient(): Promise<number | null> {
    if (klientId) return Number(klientId)
    if (novyKlient) {
      const sazbaDefault = 1000
      const { data, error } = await supabase
        .from('klienti')
        .insert({ nazev: novyKlient, sazba: sazbaDefault })
        .select('id')
        .single()
      if (error) {
        console.error('Chyba při vytváření klienta', error)
        alert('Nepodařilo se vytvořit klienta: ' + (error.message || JSON.stringify(error)))
        return null
      }
      // refresh klienti
      fetchAll()
      return (data as any).id
    }
    return null
  }

  async function ulozitAkci() {
    if (!nazev || !datum) return alert('Vyplňte název a datum')
    setLoading(true)
    const klient_id = await ensureClient()
    if (novyKlient && !klient_id) { setLoading(false); return }
    const payload = {
      nazev,
      datum,
      klient_id: klient_id || null,
      cena_klient: parseFloat(cenaKlient || '0') || 0,
      material_klient: parseFloat(materialKlient || '0') || 0,
      material_my: parseFloat(materialMy || '0') || 0,
      odhad_hodin: parseFloat(odhadHodin || '0') || 0
    }
    const { error } = await supabase.from('akce').insert([payload])
    if (error) {
      console.error('Chyba při ukládání akce', error)
      alert('Nepodařilo se uložit akci: ' + (error.message || JSON.stringify(error)))
    } else {
      setStatus('Akce uložena')
      // reset
      setNazev(''); setDatum(new Date().toISOString().split('T')[0]); setKlientId(''); setNovyKlient('')
      setCenaKlient(''); setMaterialKlient(''); setMaterialMy(''); setOdhadHodin('')
      fetchAll()
    }
    setLoading(false)
  }

  const currency = (v:number) => new Intl.NumberFormat('cs-CZ', { style:'currency', currency:'CZK', maximumFractionDigits:0 }).format(v)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold">Akce</h2>
        <div className="text-sm text-gray-500">{status}</div>
      </div>

      {/* form mobile-first */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <input className="border p-2 rounded w-full md:flex-1" placeholder="Název akce" value={nazev} onChange={e => setNazev(e.target.value)} />
          <input className="border p-2 rounded w-full md:w-40" type="date" value={datum} onChange={e => setDatum(e.target.value)} />
        </div>

        <div className="mt-3 flex flex-col md:flex-row gap-2 items-start">
          <select className="border p-2 rounded w-full md:w-60" value={klientId} onChange={e => { setKlientId(e.target.value); setNovyKlient('') }}>
            <option value="">-- Vyberte klienta --</option>
            {klienti.map((k:any) => <option key={k.id} value={k.id}>{k.nazev}</option>)}
          </select>
          <input className="border p-2 rounded w-full md:flex-1" placeholder="Nový klient (pokud zde není)" value={novyKlient} onChange={e => { setNovyKlient(e.target.value); if (e.target.value) setKlientId('') }} />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border p-2 rounded" placeholder="Částka pro klienta" value={cenaKlient} onChange={e => setCenaKlient(e.target.value)} type="number" />
          <input className="border p-2 rounded" placeholder="Materiál (klient)" value={materialKlient} onChange={e => setMaterialKlient(e.target.value)} type="number" />
          <input className="border p-2 rounded" placeholder="Materiál (my)" value={materialMy} onChange={e => setMaterialMy(e.target.value)} type="number" />
          <input className="border p-2 rounded" placeholder="Odhad hodin" value={odhadHodin} onChange={e => setOdhadHodin(e.target.value)} type="number" />
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={ulozitAkci} className="bg-blue-600 text-white px-4 py-2 rounded h-10">Uložit akci</button>
          <Link href="/pracovnici" className="text-sm text-gray-600 px-4 py-2 rounded border">Správa klientů</Link>
        </div>
      </div>

      {/* mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {akce.map(a => (
          <div key={a.id} className="bg-white p-4 rounded shadow-sm">
            <div className="flex justify-between">
              <div className="font-medium">{a.nazev}</div>
              <div className="text-sm text-gray-500">{formatDate(a.datum)}</div>
            </div>
            <div className="mt-2 text-sm text-gray-600">Klient: {a.klienti?.nazev || '—'}</div>
            <div className="mt-2 text-sm">
              <div>Částka pro klienta: {currency(Number(a.cena_klient || 0))}</div>
              <div>Materiál (klient): {currency(Number(a.material_klient || 0))}</div>
              <div>Materiál (my): {currency(Number(a.material_my || 0))}</div>
              <div>Odhad hodin: {a.odhad_hodin}</div>
            </div>
          </div>
        ))}
      </div>

      {/* desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">Název</th>
              <th className="p-3">Datum</th>
              <th className="p-3">Klient</th>
              <th className="p-3 text-right">Částka klient</th>
              <th className="p-3 text-right">Materiál klient</th>
              <th className="p-3 text-right">Materiál my</th>
              <th className="p-3 text-right">Odhad hodin</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {akce.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{a.nazev}</td>
                <td className="p-3">{formatDate(a.datum)}</td>
                <td className="p-3">{a.klienti?.nazev || '—'}</td>
                <td className="p-3 text-right">{currency(Number(a.cena_klient || 0))}</td>
                <td className="p-3 text-right">{currency(Number(a.material_klient || 0))}</td>
                <td className="p-3 text-right">{currency(Number(a.material_my || 0))}</td>
                <td className="p-3 text-right">{a.odhad_hodin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
