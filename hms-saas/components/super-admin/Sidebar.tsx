'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  Flag, Settings, LogOut, ChevronRight, Activity,
  Users, BadgeDollarSign, Stethoscope,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  {
    label: 'Platform',
    items: [
      { href: '/super-admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/super-admin/hospitals',     label: 'Hospitals',     icon: Building2       },
      { href: '/super-admin/analytics',     label: 'Analytics',     icon: BarChart3       },
      { href: '/super-admin/activity',      label: 'Activity',      icon: Activity        },
    ],
  },
  {
    label: 'Billing',
    items: [
      { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard      },
      { href: '/super-admin/revenue',       label: 'Revenue',       icon: BadgeDollarSign },
      { href: '/super-admin/plans',         label: 'Plans',         icon: Users           },
    ],
  },
  {
    label: 'Config',
    items: [
      { href: '/super-admin/feature-flags', label: 'Feature Flags', icon: Flag            },
      { href: '/super-admin/settings',      label: 'Settings',      icon: Settings        },
    ],
  },
]

interface Props {
  admin: { full_name: string; email: string; role: string }
}

export function SuperAdminSidebar({ admin }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = admin.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex w-64 shrink-0 flex-col"
      style={{ background: 'linear-gradient(180deg, #003d72 0%, #00437b 40%, #004f8c 100%)' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'linear-gradient(135deg, #038bbf, #0299d0)' }}
        >
          <Stethoscope className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-lato)' }}>HMS SaaS</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Super Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {NAV.map((section) => (
          <div key={section.label}>
            <p
              className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'text-white'
                          : 'hover:text-white'
                      )}
                      style={
                        active
                          ? { background: 'rgba(3,139,191,0.22)', color: '#fff' }
                          : { color: 'rgba(255,255,255,0.65)' }
                      }
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = ''
                      }}
                    >
                      <item.icon
                        className="h-4 w-4 shrink-0 transition-colors"
                        style={{ color: active ? '#038bbf' : undefined }}
                      />
                      <span style={{ fontFamily: 'var(--font-open-sans)' }}>{item.label}</span>
                      {active && (
                        <ChevronRight
                          className="ml-auto h-3.5 w-3.5 shrink-0"
                          style={{ color: '#038bbf' }}
                        />
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
          style={{ background: 'rgba(0,0,0,0.2)' }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{admin.full_name}</p>
            <p className="truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{admin.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(239,68,68,0.12)'
            el.style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span style={{ fontFamily: 'var(--font-open-sans)' }}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
