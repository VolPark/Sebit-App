'use client'
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Klient } from '@/lib/types/klient-types'

export default function KlientiPage() {
  const [klienti, setKlienti] = useState<Klient[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // State for the main form (creating new clients)
  const [nazev, setNazev] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [kontaktniOsoba, setKontaktniOsoba] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [web, setWeb] = useState('')
  const [ico, setIco] = useState('')
  const [dic, setDic] = useState('')
  const [showExtended, setShowExtended] = useState(false)

  // State for inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNazev, setEditNazev] = useState('')
  const [editPoznamka, setEditPoznamka] = useState('')
  const [editKontaktniOsoba, setEditKontaktniOsoba] = useState('')
  const [editTelefon, setEditTelefon] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editWeb, setEditWeb] = useState('')
  const [editIco, setEditIco] = useState('')
  const [editDic, setEditDic] = useState('')

  // State for delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase.from('klienti').select('*').order('nazev')
    if (data) setKlienti(data)
    if (error) {
      console.error('Chyba při načítání klientů:', error)
      setStatusMessage('Chyba při načítání dat.')
    }
    setLoading(false)
  }

  function resetForm() {
    setNazev('')
    setPoznamka('')
    setKontaktniOsoba('')
    setTelefon('')
    setEmail('')
    setAddress('')
    setWeb('')
    setIco('')
    setDic('')
    setShowExtended(false)
  }

  async function pridatKlienta() {
    if (!nazev) return alert('Vyplňte alespoň název klienta.')
    setLoading(true)

    const { error } = await supabase
      .from('klienti')
      .insert({
        nazev,
        poznamka: poznamka || null,
        kontaktni_osoba: kontaktniOsoba || null,
        telefon: telefon || null,
        email: email || null,
        address: address || null,
        web: web || null,
        ico: ico || null,
        dic: dic || null,
      })

    if (!error) {
      resetForm()
      setStatusMessage('Klient přidán')
      fetchData()
    } else {
      alert('Nepodařilo se přidat klienta: ' + error.message)
    }
    setLoading(false)
  }

  function startEdit(k: Klient) {
    setEditingId(k.id)
    setEditNazev(k.nazev)
    setEditPoznamka(k.poznamka || '')
    setEditKontaktniOsoba(k.kontaktni_osoba || '')
    setEditTelefon(k.telefon || '')
    setEditEmail(k.email || '')
    setEditAddress(k.address || '')
    setEditWeb(k.web || '')
    setEditIco(k.ico || '')
    setEditDic(k.dic || '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    const { error } = await supabase.from('klienti').update({
      nazev: editNazev,
      poznamka: editPoznamka || null,
      kontaktni_osoba: editKontaktniOsoba || null,
      telefon: editTelefon || null,
      email: editEmail || null,
      address: editAddress || null,
      web: editWeb || null,
      ico: editIco || null,
      dic: editDic || null,
    }).eq('id', editingId)

    if (!error) {
      setStatusMessage('Klient upraven')
      cancelEdit()
      fetchData()
    } else {
      alert('Nepodařilo se uložit změny: ' + error.message)
    }
    setLoading(false)
  }

  function openDeleteModal(id: number) {
    setDeleteId(id)
  }

  function closeDeleteModal() {
    setDeleteId(null)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setLoading(true)
    const { error } = await supabase.from('klienti').delete().eq('id', deleteId)

    if (error) {
      console.error('Chyba při mazání klienta', error)
      if (error.code === '23503') {
        setStatusMessage('Nelze smazat: Klient má přiřazené výkazy nebo akce. Nejdříve promažte související záznamy.')
      } else {
        setStatusMessage('Nepodařilo se smazat klienta: ' + error.message)
      }
    } else {
      setStatusMessage('Klient smazán')
      fetchData()
      closeDeleteModal()
    }
    setLoading(false)
  }

  const inputClass = "w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 dark:text-white"
  const editInputClass = "border dark:border-slate-700 p-2 rounded w-full bg-white dark:bg-slate-950 dark:text-white text-sm"

  /** Helper: zobrazí kontaktní údaje klienta pod názvem */
  function renderClientMeta(k: Klient) {
    const parts: string[] = []
    if (k.ico) parts.push(`IČO: ${k.ico}`)
    if (k.kontaktni_osoba) parts.push(k.kontaktni_osoba)
    if (k.telefon) parts.push(k.telefon)
    if (k.email) parts.push(k.email)
    if (parts.length === 0) return null
    return <span className="text-xs text-gray-500 dark:text-gray-400">{parts.join(' · ')}</span>
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto relative dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-black dark:text-white">Správa klientů</h2>
      </div>

      {statusMessage && (
        <div className={`mb-4 p-4 rounded ${statusMessage.includes('Nelze') || statusMessage.includes('Nepodařilo') || statusMessage.includes('Chyba') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'}`}>
          {statusMessage}
        </div>
      )}

      {/* Form to add new client */}
      <div className="mb-8">
        <div className="bg-white/95 dark:bg-slate-900/95 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl p-4 md:p-6 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Název klienta *</label>
              <input
                placeholder="Např. Google s.r.o."
                className={inputClass}
                value={nazev}
                onChange={e => setNazev(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Poznámka</label>
              <textarea
                placeholder="Klient vyžaduje reporty..."
                className={inputClass}
                value={poznamka}
                onChange={e => setPoznamka(e.target.value)}
                rows={1}
              ></textarea>
            </div>
          </div>

          {/* Toggle rozšířených údajů */}
          <button
            type="button"
            onClick={() => setShowExtended(!showExtended)}
            className="mt-4 text-sm text-[#E30613] hover:underline flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform ${showExtended ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            {showExtended ? 'Skrýt rozšířené údaje' : 'Zobrazit rozšířené údaje (IČO, DIČ, kontakt, ...)'}
          </button>

          {showExtended && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Kontaktní osoba</label>
                <input placeholder="Jan Novák" className={inputClass} value={kontaktniOsoba} onChange={e => setKontaktniOsoba(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Telefon</label>
                <input placeholder="+420 123 456 789" className={inputClass} value={telefon} onChange={e => setTelefon(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">E-mail</label>
                <input placeholder="info@firma.cz" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Adresa</label>
                <input placeholder="Ulice 123, 110 00 Praha" className={inputClass} value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Web</label>
                <input placeholder="https://www.firma.cz" className={inputClass} value={web} onChange={e => setWeb(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">IČO</label>
                <input placeholder="12345678" className={inputClass} value={ico} onChange={e => setIco(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">DIČ</label>
                <input placeholder="CZ12345678" className={inputClass} value={dic} onChange={e => setDic(e.target.value)} />
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={pridatKlienta} className="inline-flex items-center justify-center bg-[#E30613] text-white rounded-full px-8 py-3 text-base shadow-sm hover:bg-[#C00000] transition">
              Uložit nového klienta
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View (visible on mobile, hidden on sm+) */}
      <div className="block sm:hidden space-y-4">
        {loading && !deleteId && <div className="text-center p-4">Načítám...</div>}
        {!loading && klienti.length === 0 && <div className="text-center p-4 text-gray-500 dark:text-gray-400">Žádní klienti nebyli nalezeni.</div>}

        {klienti.map((k) => (
          <div key={k.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            {editingId === k.id ? (
              <div className="space-y-3">
                <input className={editInputClass} value={editNazev} onChange={e => setEditNazev(e.target.value)} placeholder="Název" />
                <textarea className={editInputClass} value={editPoznamka} onChange={e => setEditPoznamka(e.target.value)} rows={2} placeholder="Poznámka"></textarea>
                <input className={editInputClass} value={editKontaktniOsoba} onChange={e => setEditKontaktniOsoba(e.target.value)} placeholder="Kontaktní osoba" />
                <div className="grid grid-cols-2 gap-2">
                  <input className={editInputClass} value={editTelefon} onChange={e => setEditTelefon(e.target.value)} placeholder="Telefon" />
                  <input className={editInputClass} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-mail" />
                </div>
                <input className={editInputClass} value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Adresa" />
                <div className="grid grid-cols-3 gap-2">
                  <input className={editInputClass} value={editWeb} onChange={e => setEditWeb(e.target.value)} placeholder="Web" />
                  <input className={editInputClass} value={editIco} onChange={e => setEditIco(e.target.value)} placeholder="IČO" />
                  <input className={editInputClass} value={editDic} onChange={e => setEditDic(e.target.value)} placeholder="DIČ" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-[#E30613] text-white px-3 py-2 rounded-lg text-sm font-medium">Uložit</button>
                  <button onClick={cancelEdit} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium">Zrušit</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{k.nazev}</h3>
                </div>
                {renderClientMeta(k)}
                {k.poznamka && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{k.poznamka}</p>
                )}
                <div className="flex gap-3 mt-4 border-t dark:border-slate-700 pt-3">
                  <button onClick={() => startEdit(k)} className="flex-1 py-2 text-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition">Upravit</button>
                  <button onClick={() => openDeleteModal(k.id)} className="flex-1 py-2 text-center text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition">Smazat</button>
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
              <th className="p-3">Název</th>
              <th className="p-3 hidden xl:table-cell">IČO</th>
              <th className="p-3 hidden lg:table-cell">Kontakt</th>
              <th className="p-3 hidden lg:table-cell">Poznámka</th>
              <th className="p-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {loading && !deleteId && (
              <tr><td colSpan={5} className="p-4 text-center">Načítám...</td></tr>
            )}
            {!loading && klienti.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">Žádní klienti nebyli nalezeni.</td></tr>
            )}
            {klienti.map((k) => (
              <Fragment key={k.id}>
                {editingId === k.id ? (
                  <tr className="bg-red-50 dark:bg-red-900/10">
                    <td className="p-2" colSpan={5}>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <input className={editInputClass} value={editNazev} onChange={e => setEditNazev(e.target.value)} placeholder="Název" />
                        <input className={editInputClass} value={editKontaktniOsoba} onChange={e => setEditKontaktniOsoba(e.target.value)} placeholder="Kontaktní osoba" />
                        <input className={editInputClass} value={editTelefon} onChange={e => setEditTelefon(e.target.value)} placeholder="Telefon" />
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <input className={editInputClass} value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-mail" />
                        <input className={editInputClass} value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Adresa" />
                        <input className={editInputClass} value={editIco} onChange={e => setEditIco(e.target.value)} placeholder="IČO" />
                        <input className={editInputClass} value={editDic} onChange={e => setEditDic(e.target.value)} placeholder="DIČ" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <input className={editInputClass} value={editWeb} onChange={e => setEditWeb(e.target.value)} placeholder="Web" />
                        <textarea className={editInputClass} value={editPoznamka} onChange={e => setEditPoznamka(e.target.value)} rows={1} placeholder="Poznámka"></textarea>
                        <div className="flex gap-2 items-center justify-end">
                          <button onClick={saveEdit} className="bg-[#E30613] text-white px-4 py-2 rounded-md text-sm">Uložit</button>
                          <button onClick={cancelEdit} className="bg-gray-200 dark:bg-slate-700 px-4 py-2 rounded-md text-sm dark:text-white">Zrušit</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800 text-black dark:text-gray-100">
                    <td className="p-3">
                      <div className="font-medium">{k.nazev}</div>
                      {k.address && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{k.address}</div>}
                    </td>
                    <td className="p-3 hidden xl:table-cell text-gray-600 dark:text-gray-400 text-sm">
                      {k.ico || '—'}
                      {k.dic && <div className="text-xs text-gray-400">{k.dic}</div>}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-sm">
                      {k.kontaktni_osoba && <div className="text-gray-700 dark:text-gray-300">{k.kontaktni_osoba}</div>}
                      {k.telefon && <div className="text-xs text-gray-500 dark:text-gray-400">{k.telefon}</div>}
                      {k.email && <div className="text-xs text-gray-500 dark:text-gray-400">{k.email}</div>}
                      {!k.kontaktni_osoba && !k.telefon && !k.email && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 max-w-sm truncate hidden lg:table-cell" title={k.poznamka || undefined}>
                      {k.poznamka || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(k)} className="p-2 text-gray-400 hover:text-blue-600 transition" title="Upravit">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button onClick={() => openDeleteModal(k.id)} className="p-2 text-gray-400 hover:text-red-600 transition" title="Smazat">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Opravdu smazat klienta?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Tuto akci nelze vrátit. Pokud má klient přiřazené výkazy nebo akce, smazání se nemusí podařit.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition"
              >
                Zrušit
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition flex items-center"
              >
                {loading ? 'Mažu...' : 'Smazat klienta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
