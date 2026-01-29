import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/AppShell'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import SignOutOverlay from '@/components/SignOutOverlay'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_COMPANY_NAME || "Interiéry Horyna",
  description: "Správa zakázek a výroby",
  manifest: "/manifest.json",
  icons: {
    icon: process.env.NEXT_PUBLIC_FAVICON || "/icon.png",
    apple: process.env.NEXT_PUBLIC_FAVICON || "/icon.png",
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
      <body
        className={`${inter.className} min-h-screen bg-white dark:bg-[#111827]`}
        style={
          {
            '--brand-primary': process.env.NEXT_PUBLIC_BRAND_PRIMARY,
            '--brand-primary-foreground': process.env.NEXT_PUBLIC_BRAND_PRIMARY_FOREGROUND || '#ffffff',
            '--brand-accent': process.env.NEXT_PUBLIC_BRAND_ACCENT,
          } as React.CSSProperties
        }
      >
        <AuthProvider>
          <ServiceWorkerRegister />
          <SignOutOverlay />
          <ErrorBoundary>
            <AppShell>
              {children}
            </AppShell>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  )
}