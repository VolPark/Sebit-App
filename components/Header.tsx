'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MobileMenu from '@/components/MobileMenu'

// Helper component for navigation links
function NavLink({ href, children, pathname }: { href: string, children: React.ReactNode, pathname: string }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${isActive ? 'bg-white text-[#E30613] shadow-md ring-1 ring-black/5 font-bold scale-105' : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700'}`}
    >
      {children}
    </Link>
  )
}

import { useFaceAuth } from '@/context/FaceAuthContext';

// ... previous imports

export default function Header() {
  const pathname = usePathname();
  const { userImage } = useFaceAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 flex justify-center">
      <nav role="navigation" aria-label="Hlavní navigace" className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/50 rounded-2xl sm:rounded-full px-3 sm:px-6 py-2.5 flex items-center justify-between w-full max-w-7xl transition-all">

        {/* Logo sekce */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#E30613] to-[#A3000A] rounded-xl flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
              <span className="text-sm">IH</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white group-hover:text-[#E30613] transition-colors">
              Interiéry Horyna
            </span>
          </Link>
        </div>

        {/* DESKTOP LINKS */}
        <div className="hidden lg:flex items-center gap-1 bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-full border border-gray-200/50 dark:border-slate-700">
          <NavLink href="/dashboard" pathname={pathname}>Dashboard</NavLink>
          <NavLink href="/klienti" pathname={pathname}>Klienti</NavLink>
          <NavLink href="/pracovnici" pathname={pathname}>Pracovníci</NavLink>
          <NavLink href="/akce" pathname={pathname}>Akce</NavLink>
          <NavLink href="/vykazy" pathname={pathname}>Výkazy</NavLink>
          <NavLink href="/mzdy" pathname={pathname}>Mzdy</NavLink>
          <NavLink href="/naklady" pathname={pathname}>Náklady</NavLink>
        </div>

        {/* RIGHT: Avatar (desktop) + Hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-white dark:border-slate-800 shadow-sm overflow-hidden hidden sm:block bg-gray-100 dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">
            {userImage ? (
              <img src={userImage} alt="Uživatel" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <MobileMenu />
        </div>

      </nav>
    </header>
  )
}
