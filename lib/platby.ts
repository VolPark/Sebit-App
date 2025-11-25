import { supabase } from '@/lib/supabase'

export interface Platba {
  id?: number
  dodavatel_id: number
  mesic: string // YYYY-MM-DD (doporučeně první den měsíce)
  hodiny: number
  sazba: number
  castka: number
  zaplaceno?: boolean
  created_at?: string
}

/**
 * Vloží jednu platbu. Vrací objekt { data, error } z supabase.
 * Pokud potřebujete transakční logiku, rozšiřte (např. nejdřív smazat starší).
 */
export async function insertPayment(p: Platba) {
  return supabase.from('platby').insert([{
    dodavatel_id: p.dodavatel_id,
    mesic: p.mesic,
    hodiny: p.hodiny,
    sazba: p.sazba,
    castka: p.castka,
    zaplaceno: p.zaplaceno ?? true
  }])
}

/**
 * Načte platby pro zadaný month ve formátu "YYYY-MM" (vrací platby mezi prvním a posledním dnem).
 */
export async function getPaymentsByMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const endDate = new Date(y, m, 0)
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2,'0')}`

  return supabase
    .from('platby')
    .select('*')
    .gte('mesic', start)
    .lte('mesic', end)
    .order('mesic', { ascending: true })
}
