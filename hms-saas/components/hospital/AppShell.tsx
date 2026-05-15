'use client'

import { useState, useEffect } from 'react'
import { Menu, Stethoscope } from 'lucide-react'
import { HospitalSidebar } from './Sidebar'

interface Props {
  profile: { full_name: string; email: string; role: string; designation?: string | null }
  hospital: { name: string }
  children: React.ReactNode
}

export function AppShell({ profile, hospital, children }: Props) {
  const [open, setOpen] = useState(false)

  // Close sidebar on route change on mobile
  useEffect(() => {
    setOpen(false)
  }, [])

  // Prevent body scroll when sidebar overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>

      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex shrink-0">
        <HospitalSidebar profile={profile} hospital={hospital} />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.55)' }}
        />
      )}

      {/* Mobile sidebar panel */}
      <div
        className="fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <HospitalSidebar
          profile={profile}
          hospital={hospital}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 md:hidden"
          style={{ background: '#fff' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={{ background: 'rgba(3,139,191,0.08)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(3,139,191,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(3,139,191,0.08)'}
          >
            <Menu className="h-5 w-5" style={{ color: '#038bbf' }} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
            >
              <Stethoscope className="h-3.5 w-3.5 text-white" />
            </div>
            <span
              className="font-bold text-slate-900 truncate"
              style={{ fontFamily: 'var(--font-lato)', fontSize: 15 }}
            >
              {hospital.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
