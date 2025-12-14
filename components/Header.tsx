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
      className={`px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200 ${isActive ? 'bg-[#F5F5F5] text-[#E30613] shadow-sm' : ''}`}
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
    <header className="fixed top-0 left-0 right-0 z-50 p-3 md:p-4 flex justify-center">
      <nav role="navigation" aria-label="Hlavní navigace" className="relative bg-white/80 backdrop-blur-xl border border-white/20 shadow-sm rounded-full px-5 py-2 flex items-center gap-2 md:gap-8 max-w-4xl w-full justify-between transition-all hover:shadow-md">

        {/* Logo sekce */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 bg-[#E30613] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/30">
            H
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900 hidden sm:block">
            Interiéry Horyna
          </span>
        </div>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
          <NavLink href="/dashboard" pathname={pathname}>Dashboard</NavLink>
          <NavLink href="/klienti" pathname={pathname}>Klienti</NavLink>
          <NavLink href="/pracovnici" pathname={pathname}>Pracovníci</NavLink>
          <NavLink href="/akce" pathname={pathname}>Akce</NavLink>
          <NavLink href="/vykazy" pathname={pathname}>Výkazy</NavLink>
          <NavLink href="/mzdy" pathname={pathname}>Mzdy</NavLink>
          <NavLink href="/naklady" pathname={pathname}>Náklady</NavLink>
        </div>

        {/* RIGHT: Avatar (desktop) + Hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden hidden sm:block bg-gray-200">
            {userImage ? (
              <img src={userImage} alt="Uživatel" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
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
