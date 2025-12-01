import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google' // Import moderního fontu
import MobileMenu from '@/components/MobileMenu' // přidáno near top imports

// Načtení fontu (Google standard)
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SEBIT Solutions',
  description: 'Moderní správa firmy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs">
      <body className={`${inter.className} bg-[#f8f9fa] min-h-screen flex flex-col text-gray-800`}>
        
        {/* SKIP LINK for A11y */}
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-3 py-2 rounded shadow-md z-50">
          Přejít na obsah
        </a>

        {/* HLAVNÍ NAVIGACE - GOOGLE STYLE 2025 */}
        <header className="fixed top-0 left-0 right-0 z-50 p-3 md:p-4 flex justify-center">
          <nav role="navigation" aria-label="Hlavní navigace" className="relative bg-white/80 backdrop-blur-xl border border-white/20 shadow-sm rounded-full px-5 py-2 flex items-center gap-2 md:gap-8 max-w-4xl w-full justify-between transition-all hover:shadow-md">
            
            {/* Logo sekce */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
                F
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 hidden sm:block">
                SEBIT Solutions
              </span>
            </div>

            {/* DESKTOP LINKS: zachovat styl, skryté na mobilu */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/klienti">Klienti</NavLink>
              <NavLink href="/pracovnici">Dodavatelé</NavLink>
              <NavLink href="/akce">Akce</NavLink>
              <NavLink href="/vykazy">Výkazy</NavLink>
              <NavLink href="/finance">Finance</NavLink>
            </div>
            
            {/* RIGHT: Avatar (desktop) + Hamburger (mobile) - replaced with client component */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white shadow-sm hidden sm:block"></div>

              <MobileMenu />
            </div>

          </nav>
        </header>

        {/* OBSAH STRÁNKY 
           - pt-28: Přidán padding nahoře, protože header je fixní a překrýval by obsah
        */}
        <main id="content" className="flex-grow pt-28 px-4 md:px-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
        
        {/* Footer - Minimalistický a čistý */}
        <footer className="py-8 text-center text-gray-400 text-sm">
          <p>© 2025 Firemní Systém &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Podmínky</span> &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Soukromí</span></p>
        </footer>

        {/* Mobile bottom navigation (only on small screens) */}
        {/* <nav role="navigation" aria-label="Dolní navigace" className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 md:hidden">
          <div className="bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-md flex items-center gap-2">
            <Link href="/" className="p-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
              Klienti
            </Link>
            <Link href="/pracovnici" className="p-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
              Prac.
            </Link>
            <Link href="/vykazy" className="p-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
              Výkazy
            </Link>
            <Link href="/finance" className="p-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
              Finance
            </Link>
          </div>
        </nav> */}

      </body>
    </html>
  )
}

// Pomocná komponenta pro hezčí odkazy přímo v souboru
function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200"
    >
      {children}
    </Link>
  )
}