'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [klienti, setKlienti] = useState([])
  const [jmeno, setJmeno] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Načtení klientů při startu
  useEffect(() => {
    fetchKlienti()
  }, [])

  async function fetchKlienti() {
    setLoading(true)
    let { data, error } = await supabase.from('klienti').select('*')
    if (data) setKlienti(data)
    setLoading(false)
  }

  // Funkce pro přidání klienta
  async function pridatKlienta() {
    if (!jmeno) return
    setLoading(true)
    const { error } = await supabase
      .from('klienti')
      .insert({ nazev: jmeno, sazba: 1000 }) // Pevná sazba pro test
      
    if (!error) {
      setJmeno('')
      fetchKlienti() // Znovu načíst seznam
      setStatusMessage('Klient přidán')
    } else {
      alert('Chyba: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Firemní Evidence</h1>

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {/* Formulář */}
      <div className="flex gap-2 mb-6">
        <label htmlFor="klient_nazev" className="sr-only">Název nového klienta</label>
        <input
          id="klient_nazev"
          type="text"
          placeholder="Název nového klienta"
          className="border p-2 rounded w-full text-black"
          value={jmeno}
          onChange={(e) => setJmeno(e.target.value)}
        />
        <button 
          type="button"
          onClick={pridatKlienta}
          className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 h-12"
        >
          Přidat
        </button>
      </div>

      {/* Seznam */}
      <h2 className="text-xl font-semibold mb-3">Seznam klientů:</h2>
      <ul className="space-y-2">
        {loading && <li className="p-4 bg-white rounded shadow animate-pulse">Načítám...</li>}
        {klienti.map((klient) => (
          <li key={klient.id} className="p-4 bg-gray-100 rounded shadow text-black flex justify-between">
            <span>{klient.nazev}</span>
            <span className="text-gray-500">{klient.sazba} Kč/h</span>
          </li>
        ))}
        {klienti.length === 0 && !loading && <p className="text-gray-500">Zatím žádní klienti.</p>}
      </ul>
    </div>
  )
}