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
          className="inline-flex items-center justify-center p-2 rounded-full bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 shadow-sm transition-colors"
          title={open ? 'Zavřít menu' : 'Otevřít menu'}
        >
          {!open ? (
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {open && (
          <div id="mobile-menu" className="fixed top-16 left-0 right-0 px-4 z-40">
            <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-b-lg shadow-md dark:shadow-black/50 p-3 flex flex-col gap-2 border border-gray-100 dark:border-slate-800">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/klienti', label: 'Klienti' },
                { href: '/pracovnici', label: 'Pracovníci' },
                { href: '/akce', label: 'Akce' },
                { href: '/nabidky', label: 'Nabídky' },
                { href: '/vykazy', label: 'Výkazy' },
                { href: '/mzdy', label: 'Mzdy' },
                { href: '/naklady', label: 'Náklady' },
              ].map((link) => {
                const isActive = link.href === '/' ? pathname === link.href : (pathname === link.href || pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${isActive ? 'bg-[#F5F5F5] dark:bg-slate-800 text-[#E30613]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
