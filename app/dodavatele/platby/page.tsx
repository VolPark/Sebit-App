'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PlatbyDodavatelumPage() {
  const [prace, setPrace] = useState<any[]>([])
  const [pracovnici, setPracovnici] = useState<any[]>([])
  const [platby, setPlatby] = useState<any[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    if (d.getFullYear() < 2025) return '2025-01';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
  })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: pData }, { data: prData }] = await Promise.all([
      supabase.from('pracovnici').select('*').order('id'),
      supabase.from('prace').select('*, pracovnici(jmeno, hodinova_mzda)').order('datum', { ascending: true })
    ])
    if (pData) setPracovnici(pData)
    if (prData) setPrace(prData)
    setLoading(false)
    fetchPlatbyForMonth(month)
  }

  async function fetchPlatbyForMonth(m: string) {
    // očekáváme formát YYYY-MM
    setLoading(true)
    // uložíme mesic jako první den měsíce a dotazujeme přesně na tento den (jednodušší a spolehlivější)
    const [y, mm] = m.split('-').map(Number)
    const mesic = `${y}-${String(mm).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('platby')
      .select('*')
      .eq('mesic', mesic)

    if (error) {
      // tabulka možná neexistuje — neházet fatal chybu, jen informovat
      console.info('Platby fetch error (může chybět tabulka platby):', error)
      setPlatby([])
      setStatus('Tabulka "platby" v DB nebyla nalezena (pokud chcete ukládat platby, vytvořte tabulku platby).')
    } else {
      setPlatby(data || [])
      setStatus('')
    }
    setLoading(false)
  }

  // agregace: pro zvolený měsíc spočítáme pro každého dodavatele hodiny a částku
  const aggregates = useMemo(() => {
    const [y, mm] = month.split('-').map(Number)
    const monthStart = new Date(y, mm - 1, 1)
    const monthEnd = new Date(y, mm, 0)
    const map = new Map<number, { id: number, jmeno: string, sazba: number, hodiny: number }>()
    prace.forEach((r) => {
      const d = new Date(r.datum)
      if (d >= monthStart && d <= monthEnd) {
        const pid = Number(r.pracovnik_id)
        const hod = Number(r.pocet_hodin) || 0
        const sazba = Number(r.pracovnici?.hodinova_mzda) || 0
        if (!map.has(pid)) map.set(pid, { id: pid, jmeno: r.pracovnici?.jmeno || '—', sazba, hodiny: hod })
        else map.get(pid)!.hodiny += hod
      }
    })
    // doplníme sazbu a jméno z pracovniků, ale necháme hodiny jen pokud byly
    pracovnici.forEach(p => {
      const id = Number(p.id)
      if (!map.has(id)) {
        // nezapisujeme dodavatele bez hodin do mapy - necháme je mimo seznam aggregátů
        return
      } else {
        const item = map.get(id)!
        if (!item.sazba) item.sazba = Number(p.hodinova_mzda) || 0
        if (!item.jmeno || item.jmeno === '—') item.jmeno = p.jmeno
      }
    })
    // vytvoříme pole pouze s dodavateli, kteří mají >0 hodin (hasHours)
    return Array.from(map.values())
      .map(i => ({ id: i.id, jmeno: i.jmeno, sazba: i.sazba, hodiny: i.hodiny, castka: Math.round(i.hodiny * i.sazba * 100) / 100, hasHours: (i.hodiny > 0) }))
  }, [prace, pracovnici, month])

  async function reconcile(supplierId: number) {
    if (!confirm('Opravdu označit jako zaplaceno pro vybraný měsíc?')) return
    setLoading(true)
    const entry = aggregates.find(a => a.id === supplierId)
    if (!entry) { alert('Dodavatel nenalezen'); setLoading(false); return }
    // připravíme payload — předpoklad: tabulka platby má sloupce: dodavatel_id, mesic (date), hodiny, sazba, castka, zaplaceno (boolean)
    const [y, mm] = month.split('-').map(Number)
    const mesic = `${y}-${String(mm).padStart(2, '0')}-01`

    // Použijeme upsert s onConflict (dodavatel_id, mesic) -> pokud již platba existuje, aktualizujeme ji.
    const payload = {
      dodavatel_id: supplierId,
      mesic,
      hodiny: entry.hodiny,
      sazba: entry.sazba,
      castka: entry.castka,
      zaplaceno: true
    }

    try {
      const { data, error } = await supabase
        .from('platby')
        .upsert([payload], { onConflict: 'dodavatel_id,mesic' })
        .select()

      if (error) {
        console.error('Chyba při ukládání platby', JSON.stringify(error), { payload })
        alert('Nepodařilo se uložit platbu: ' + (error.message || JSON.stringify(error)))
      } else if (!data) {
        console.error('Platba nevrátila data', { payload, data })
        alert('Ukládání platby proběhlo bez datové odpovědi. Zkontrolujte DB/přístupová oprávnění.')
      } else {
        setStatus('Platba uložena')
        fetchPlatbyForMonth(month)
      }
    } catch (e) {
      console.error('Nečekaná chyba při ukládání platby', e, payload)
      alert('Nečekaná chyba při ukládání platby. Zkontrolujte konzoli.')
    }
    setLoading(false)
  }

  function isPaid(supplierId: number) {
    // zjednodušeně: hledáme platbu se stejným dodavatelem v platby[] (pro zvolený měsíc)
    return platby.some(p => Number(p.dodavatel_id) === supplierId)
  }

  // simple currency formatter
  const currency = (v: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Platby dodavatelům — Rekonciliace</h2>

      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <label className="text-sm text-gray-600 mr-2">Vyberte měsíc</label>
        <input type="month" value={month} onChange={e => { setMonth(e.target.value); fetchPlatbyForMonth(e.target.value) }} className="border p-2 rounded" min="2025-01" />
        <div className="text-sm text-gray-500 ml-4">{status}</div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && <div className="p-4 bg-white rounded shadow animate-pulse">Načítám...</div>}
        {aggregates.map(a => (
          <div key={a.id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{a.jmeno}</div>
                <div className="text-xs text-gray-500">Sazba: {a.sazba} Kč/h</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{currency(a.castka)}</div>
                <div className="text-xs text-gray-500">{a.hodiny} h</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {a.hasHours ? (
                <button disabled={isPaid(a.id)} onClick={() => reconcile(a.id)} className={`px-3 py-2 rounded ${isPaid(a.id) ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'}`}>
                  {isPaid(a.id) ? 'Zaplaceno' : 'Označit jako zaplaceno'}
                </button>
              ) : (
                <div className="px-3 py-2 rounded bg-gray-50 text-gray-500 text-sm">Žádné vykázané hodiny</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3">Dodavatel</th>
              <th className="p-3 text-right">Hodiny</th>
              <th className="p-3 text-right">Sazba</th>
              <th className="p-3 text-right">Fakturováno</th>
              <th className="p-3 text-right">Stav</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {aggregates.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{a.jmeno}</td>
                <td className="p-3 text-right">{a.hodiny}</td>
                <td className="p-3 text-right">{a.sazba} Kč/h</td>
                <td className="p-3 text-right font-bold">{currency(a.castka)}</td>
                <td className="p-3 text-right">{isPaid(a.id) ? <span className="text-green-600">Zaplaceno</span> : <span className="text-gray-500">{a.hasHours ? 'Nezaplaceno' : 'Žádné hodiny'}</span>}</td>
                <td className="p-3 text-right">
                  {a.hasHours ? (
                    <button disabled={isPaid(a.id)} onClick={() => reconcile(a.id)} className={`px-3 py-1 rounded ${isPaid(a.id) ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'}`}>
                      {isPaid(a.id) ? 'Zaplaceno' : 'Označit jako zaplaceno'}
                    </button>
                  ) : (
                    <div className="px-3 py-1 rounded bg-gray-50 text-gray-500 text-sm inline-block">Žádné hodiny</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
