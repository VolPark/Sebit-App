'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [prace, setPrace] = useState<any[]>([])
  const [finance, setFinance] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // načteme pracovní výkazy s propojenými klienty a pracovníky
    const { data: pData } = await supabase
      .from('prace')
      .select('*, klienti(nazev, sazba), pracovnici(jmeno, hodinova_mzda)')
      .order('datum', { ascending: false })

    // načteme finance
    const { data: fData } = await supabase
      .from('finance')
      .select('*')
      .order('datum', { ascending: false })

    if (pData) setPrace(pData)
    if (fData) setFinance(fData)
    setStatusMessage('Aktualizováno')
    setLoading(false)
  }

  // formátování měny
  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), [])

  // součty z prace a finance
  const { revenue, payrollCost, cashIn, cashOut, cashFlow, overall } = useMemo(() => {
    let rev = 0
    let pay = 0
    prace.forEach(v => {
      const hod = Number(v.pocet_hodin) || 0
      const sazba = Number(v.klienti?.sazba) || 0
      const mzda = Number(v.pracovnici?.hodinova_mzda) || 0
      rev += hod * sazba
      pay += hod * mzda
    })
    let cin = 0
    let cout = 0
    finance.forEach(t => {
      const c = Number(t.castka) || 0
      if (t.typ === 'Příjem') cin += c
      if (t.typ === 'Výdej') cout += c
    })
    const cf = cin - cout
    const ov = rev - pay + cf
    return { revenue: rev, payrollCost: pay, cashIn: cin, cashOut: cout, cashFlow: cf, overall: ov }
  }, [prace, finance])

  const recentPrace = prace.slice(0, 5)
  const recentFinance = finance.slice(0, 5)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Dashboard — Výsledky firmy</h2>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Přehledové karty (mobile-first) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-xs font-semibold text-gray-500 uppercase">Fakturace (příjmy z práce)</p>
          <p className="text-2xl font-bold mt-2">{currency.format(revenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Z vyúčtovaných hodin</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-xs font-semibold text-gray-500 uppercase">Mzdy (náklad)</p>
          <p className="text-2xl font-bold mt-2">{currency.format(payrollCost)}</p>
          <p className="text-sm text-gray-500 mt-1">Vyplacené mzdy dle hodin</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-xs font-semibold text-gray-500 uppercase">Cash Flow (finance)</p>
          <p className={`text-2xl font-bold mt-2 ${cashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>{currency.format(cashFlow)}</p>
          <p className="text-sm text-gray-500 mt-1">Příjmy/Výdaje z financí</p>
        </div>

        <div className="sm:col-span-2 md:col-span-1 bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-xs font-semibold text-gray-500 uppercase">Celkový výsledek</p>
          <p className={`text-2xl font-bold mt-2 ${overall >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{currency.format(overall)}</p>
          <p className="text-sm text-gray-500 mt-1">Revenue − Payroll + CashFlow</p>
        </div>
      </div>

      {/* Sekce: poslední výkazy a transakce */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section aria-labelledby="recent-vykazy" className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 id="recent-vykazy" className="text-sm font-semibold mb-3">Poslední výkazy</h3>
          {loading && <div className="text-sm text-gray-500">Načítám...</div>}
          {!loading && recentPrace.length === 0 && <div className="text-sm text-gray-500">Žádné záznamy.</div>}
          <ul className="space-y-2">
            {recentPrace.map(v => (
              <li key={v.id} className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">{v.datum} — {v.pracovnici?.jmeno}</div>
                  <div className="text-xs text-gray-500">{v.klienti?.nazev} · {v.pocet_hodin} h</div>
                </div>
                <div className="text-sm font-semibold text-right">
                  {currency.format((Number(v.pocet_hodin) || 0) * (Number(v.klienti?.sazba) || 0))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recent-finance" className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 id="recent-finance" className="text-sm font-semibold mb-3">Poslední transakce</h3>
          {loading && <div className="text-sm text-gray-500">Načítám...</div>}
          {!loading && recentFinance.length === 0 && <div className="text-sm text-gray-500">Žádné záznamy.</div>}
          <ul className="space-y-2">
            {recentFinance.map(t => (
              <li key={t.id} className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">{t.datum} — {t.popis}</div>
                  <div className="text-xs text-gray-500">{t.typ}</div>
                </div>
                <div className={`text-sm font-semibold ${t.typ === 'Příjem' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.typ === 'Příjem' ? '+' : '-'}{currency.format(Number(t.castka) || 0)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
