import './globals.css'
import Link from 'next/link'
import { Inter } from 'next/font/google' // Import moderního fontu

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
        
        {/* HLAVNÍ NAVIGACE - GOOGLE STYLE 2025
           - Fixed position: plave nad obsahem
           - Backdrop blur: efekt mléčného skla
           - Rounded Full: tvar pilulky
        */}
        <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center">
          <nav className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-sm rounded-full px-6 py-3 flex items-center gap-2 md:gap-8 max-w-4xl w-full justify-between transition-all hover:shadow-md">
            
            {/* Logo sekce */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
                F
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 hidden sm:block">
                SEBIT Solutions
              </span>
            </div>

            {/* Odkazy - Pill shape hover efekty */}
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
              <NavLink href="/">Klienti</NavLink>
              <NavLink href="/pracovnici">Pracovníci</NavLink>
              <NavLink href="/vykazy">Výkazy</NavLink>
              <NavLink href="/finance">Finance</NavLink>
            </div>
            
            {/* Avatar / Profil (placeholder) */}
            <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white shadow-sm hidden sm:block"></div>
          </nav>
        </header>

        {/* OBSAH STRÁNKY 
           - pt-28: Přidán padding nahoře, protože header je fixní a překrýval by obsah
        */}
        <main className="flex-grow pt-28 px-4 md:px-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
        
        {/* Footer - Minimalistický a čistý */}
        <footer className="py-8 text-center text-gray-400 text-sm">
          <p>© 2025 Firemní Systém &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Podmínky</span> &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Soukromí</span></p>
        </footer>

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