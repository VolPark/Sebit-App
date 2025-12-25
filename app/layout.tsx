import './globals.css'
import { Inter } from 'next/font/google'
import FaceAuthProvider from '@/components/FaceAuthProvider'
import FixedCostsAutomator from '@/components/FixedCostsAutomator'
import AppSidebar from '@/components/AppSidebar'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Horyna',
  description: 'Interní systém pro správu zakázek a fakturace',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/web-app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/web-app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#111827',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-slate-950 min-h-screen text-[#333333]`}>
        <ServiceWorkerRegister />
        <FaceAuthProvider>
          <FixedCostsAutomator />

          <div className="flex min-h-screen">
            {/* Sidebar Navigation */}
            <AppSidebar />

            {/* Main Content Area */}
            {/* 
                lg:pl-[260px] = Pushes content to right on desktop to make room for fixed sidebar.
                pt-16 = Adds top padding on mobile for the fixed mobile header. 
            */}
            <main className="flex-1 w-full lg:pl-[260px] pt-16 lg:pt-0">
              <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>

        </FaceAuthProvider>
      </body>
    </html>
  )
}