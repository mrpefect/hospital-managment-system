'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CalendarDays,
  Receipt, FlaskConical, Package, UserSquare2,
  Settings, LogOut, ChevronRight, Stethoscope, ShieldPlus, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/app/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/app/patients',     label: 'Patients',     icon: Users           },
      { href: '/app/appointments', label: 'Appointments', icon: CalendarDays    },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { href: '/app/doctors',  label: 'Doctors',     icon: Stethoscope },
      { href: '/app/pharmacy', label: 'Pharmacy',    icon: ShieldPlus  },
      { href: '/app/lab',      label: 'Laboratory',  icon: FlaskConical },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/app/billing',   label: 'Billing',   icon: Receipt      },
      { href: '/app/inventory', label: 'Inventory', icon: Package      },
      { href: '/app/staff',     label: 'Staff / HR', icon: UserSquare2 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
]

interface Props {
  profile: { full_name: string; email: string; role: string; designation?: string | null }
  hospital: { name: string }
  onClose?: () => void
}

export function HospitalSidebar({ profile, hospital, onClose }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col"
      style={{
        background: 'linear-gradient(160deg, #001f3f 0%, #00437b 45%, #038bbf 100%)',
      }}
    >
      {/* Logo */}
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
            style={{ fontFamily: 'var(--font-lato)', fontSize: 15 }}
          >
            {hospital.name}
          </p>
        </div>
        {/* Mobile close button */}
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
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
        {NAV.map((section) => (
          <div key={section.label} className='mb-0'>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
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
                          : { color: '#fff' }
                      }
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = ''
                      }}
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0"
                        style={{ color: active ? '#fff' : 'rgba(255,255,255,0.75)' }}
                      />
                      <span
                        className="font-medium"
                        style={{
                          fontFamily: 'var(--font-open-sans)',
                          fontSize: 16,
                          color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                          letterSpacing: '0.01em',
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
          </div>
        ))}
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
              style={{ fontSize: 14, fontFamily: 'var(--font-open-sans)' }}
            >
              {profile.full_name}
            </p>
            <p
              className="truncate"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-open-sans)' }}
            >
              {profile.designation ?? profile.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150"
          style={{ color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(239,68,68,0.15)'
            el.style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
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
