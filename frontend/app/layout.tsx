import './globals.css'
import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import AuthProvider from '@/components/AuthProvider'

export const metadata = {
  title: 'Manthaan OS — RITI Planning Intelligence',
  description: 'Viksit Rajasthan 2047 Planning Intelligence Dashboard'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'var(--bg)', color: 'var(--t1)' }}>
        <AuthProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
