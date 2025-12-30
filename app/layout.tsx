import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/AppShell'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import SignOutOverlay from '@/components/SignOutOverlay'
import { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna",
  description: "Správa zakázek a výroby",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Horyna App',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#111827',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-[#111827]`}>
        <AuthProvider>
          <ServiceWorkerRegister />
          <SignOutOverlay />
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}