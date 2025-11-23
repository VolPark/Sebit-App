'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [klienti, setKlienti] = useState([])
  const [jmeno, setJmeno] = useState('')

  // Načtení klientů při startu
  useEffect(() => {
    fetchKlienti()
  }, [])

  async function fetchKlienti() {
    let { data, error } = await supabase.from('klienti').select('*')
    if (data) setKlienti(data)
  }

  // Funkce pro přidání klienta
  async function pridatKlienta() {
    if (!jmeno) return
    const { error } = await supabase
      .from('klienti')
      .insert({ nazev: jmeno, sazba: 1000 }) // Pevná sazba pro test
      
    if (!error) {
      setJmeno('')
      fetchKlienti() // Znovu načíst seznam
    } else {
      alert('Chyba: ' + error.message)
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Firemní Evidence</h1>

      {/* Formulář */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Název nového klienta"
          className="border p-2 rounded w-full text-black"
          value={jmeno}
          onChange={(e) => setJmeno(e.target.value)}
        />
        <button 
          onClick={pridatKlienta}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Přidat
        </button>
      </div>

      {/* Seznam */}
      <h2 className="text-xl font-semibold mb-4">Seznam klientů:</h2>
      <ul className="space-y-2">
        {klienti.map((klient) => (
          <li key={klient.id} className="p-4 bg-gray-100 rounded shadow text-black flex justify-between">
            <span>{klient.nazev}</span>
            <span className="text-gray-500">{klient.sazba} Kč/h</span>
          </li>
        ))}
        {klienti.length === 0 && <p className="text-gray-500">Zatím žádní klienti.</p>}
      </ul>
    </div>
  )
}