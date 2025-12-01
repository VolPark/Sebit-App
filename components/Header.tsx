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

export default function Header() {
  const pathname = usePathname();

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
        </div>
        
        {/* RIGHT: Avatar (desktop) + Hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white shadow-sm hidden sm:block"></div>
          <MobileMenu />
        </div>

      </nav>
    </header>
  )
}
