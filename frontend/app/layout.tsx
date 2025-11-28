import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'AtlasBuilder | Faster than no-code, simpler than low-code',
  description: 'Generate internal tools in minutes with dynamic models and auto CRUD dashboards.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <div className="min-h-screen flex flex-col">
          <header className="glass mx-6 mt-6 px-4 py-3 flex items-center justify-between">
            <div className="font-semibold text-lg">AtlasBuilder</div>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/workspaces">Workspaces</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/models">Models</a>
            </nav>
          </header>
          <main className="flex-1 w-full px-6 py-6">{children}</main>
          <footer className="text-center text-xs text-slate-500 pb-6">Built for operators who need software speed</footer>
        </div>
      </body>
    </html>
  )
}
