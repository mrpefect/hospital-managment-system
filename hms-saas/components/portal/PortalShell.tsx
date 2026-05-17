'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, Stethoscope, ChevronRight, LogOut, X,
  LayoutDashboard, CalendarDays, Users, Receipt,
  FlaskConical, ShieldPlus, Package, UserSquare2,
  Clock, Settings, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard,
  CalendarDays,
  Users,
  Receipt,
  FlaskConical,
  ShieldPlus,
  Package,
  UserSquare2,
  Clock,
  Settings,
  FileText,
}

interface NavItem {
  href: string
  label: string
  icon: string   // key into ICON_MAP
}

interface Props {
  children: React.ReactNode
  profile: { full_name: string; email: string; role: string; designation?: string | null }
  hospital: { name: string }
  nav: NavItem[]
  accentColor: string
  gradientFrom: string
  gradientTo: string
}

function PortalSidebar({
  profile,
  hospital,
  nav,
  accentColor,
  gradientFrom,
  gradientTo,
  onClose,
}: Omit<Props, 'children'> & { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col"
      style={{
        background: `linear-gradient(160deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
      }}
    >
      {/* Logo / Hospital name */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <Stethoscope className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight min-w-0 flex-1">
          <p
            className="truncate font-bold text-white"
            style={{ fontFamily: 'var(--font-lato)', fontSize: 14 }}
          >
            {hospital.name}
          </p>
          <p
            className="truncate"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-open-sans)' }}
          >
            {profile.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:hidden"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <X className="h-4 w-4 text-white" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                  style={
                    active
                      ? {
                          background: 'rgba(255,255,255,0.18)',
                          borderLeft: '3px solid #fff',
                          paddingLeft: 9,
                        }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = ''
                  }}
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.75)' }}
                  />
                  <span
                    className="font-medium"
                    style={{
                      fontFamily: 'var(--font-open-sans)',
                      fontSize: 15,
                      color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/70" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div
          className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-semibold text-white"
              style={{ fontSize: 13, fontFamily: 'var(--font-open-sans)' }}
            >
              {profile.full_name}
            </p>
            <p
              className="truncate"
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-open-sans)' }}
            >
              {profile.designation ?? profile.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(239,68,68,0.15)'
            el.style.color = '#fca5a5'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.color = 'rgba(255,255,255,0.65)'
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span style={{ fontFamily: 'var(--font-open-sans)', fontSize: 15 }}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

export function PortalShell({
  children,
  profile,
  hospital,
  nav,
  accentColor,
  gradientFrom,
  gradientTo,
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const sidebarProps = { profile, hospital, nav, accentColor, gradientFrom, gradientTo }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <PortalSidebar {...sidebarProps} />
      </div>

      {/* Mobile overlay */}
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
        <PortalSidebar {...sidebarProps} onClose={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 md:hidden"
          style={{ background: '#fff' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={{ background: `rgba(${hexToRgb(accentColor)},0.08)` }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = `rgba(${hexToRgb(accentColor)},0.15)`)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = `rgba(${hexToRgb(accentColor)},0.08)`)
            }
          >
            <Menu className="h-5 w-5" style={{ color: accentColor }} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
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

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0,0,0'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
