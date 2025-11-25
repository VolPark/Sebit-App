'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // zavřít menu při změně cesty
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // lock scroll když je menu otevřené
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <div className="md:hidden">
      <div className="relative">
        <button
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center justify-center p-2 rounded-full bg-white/60 hover:bg-white/80 shadow-sm"
          title={open ? 'Zavřít menu' : 'Otevřít menu'}
        >
          {!open ? (
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {open && (
          <div id="mobile-menu" className="fixed top-16 left-0 right-0 px-4 z-40">
            <div className="w-full bg-white/95 backdrop-blur rounded-b-lg shadow-md p-3 flex flex-col gap-2">
              <Link href="/dashboard" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100">Dashboard</Link>
              <Link href="/" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100">Klienti</Link>
              <Link href="/pracovnici" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100">Dodavatelé</Link>
              <Link href="/vykazy" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100">Výkazy</Link>
              <Link href="/finance" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-100">Finance</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
