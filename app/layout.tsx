import './globals.css'
import { Inter } from 'next/font/google' // Import moderního fontu
import Header from '@/components/Header'

// Načtení fontu (Google standard)
const inter = Inter({ subsets: ['latin'] })

import { Viewport, type Metadata } from 'next';

export const metadata: Metadata = {
  title: "Interiéry Horyna",
  description: "Inteligentní nástroj pro řízení firmy, mezd a výkaznictví",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo_small.png",
    shortcut: "/logo_small.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Horyna",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#E30613',
}

import FaceAuthProvider from '@/components/FaceAuthProvider';
import FixedCostsAutomator from '@/components/FixedCostsAutomator';

// ... (imports)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.className} bg-white min-h-screen flex flex-col text-[#333333]`}>
        <FaceAuthProvider>
          <FixedCostsAutomator />
          {/* SKIP LINK for A11y */}
          <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-3 py-2 rounded shadow-md z-50">
            Přejít na obsah
          </a>

          <Header />

          {/* OBSAH STRÁNKY */}
          <main id="content" className="flex-grow pt-28 px-4 md:px-8 max-w-6xl mx-auto w-full">
            {children}
          </main>

          {/* Footer - Minimalistický a čistý */}
          <footer className="py-8 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} SEBIT Solutions &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Podmínky</span> &bull; <span className="hover:text-gray-600 cursor-pointer transition-colors">Soukromí</span></p>
          </footer>
        </FaceAuthProvider>
      </body>
    </html>
  )
}