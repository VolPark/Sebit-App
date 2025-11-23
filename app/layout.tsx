import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Firemní Evidence',
  description: 'Správa firmy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs">
      <body className="bg-white min-h-screen flex flex-col">
        {/* Horní Menu */}
        <nav className="bg-gray-900 text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex gap-6 items-center">
            <h1 className="text-xl font-bold mr-4">Moje Firma</h1>
            <Link href="/" className="hover:text-blue-300">Klienti</Link>
            <Link href="/pracovnici" className="hover:text-blue-300">Pracovníci</Link>
            <Link href="/vykazy" className="hover:text-blue-300">Výkazy práce</Link>
            <Link href="/finance" className="hover:text-blue-300">Finance</Link>
          </div>
        </nav>

        {/* Obsah stránky */}
        <main className="flex-grow">
          {children}
        </main>
        
        <footer className="bg-gray-100 p-4 text-center text-gray-500 text-sm">
          © 2025 Firemní Systém
        </footer>
      </body>
    </html>
  )
}