import './globals.css'
import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'

export const metadata = {
  title: 'Manthaan OS',
  description: 'Planning intelligence for Viksit Rajasthan 2047'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <TopBar />
            <main className="flex-1 bg-[#FAFAFA] px-6 py-5">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
