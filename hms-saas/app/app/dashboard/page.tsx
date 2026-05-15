import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Users, CalendarDays, BedDouble, Receipt,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, full_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id
  const today = new Date().toISOString().split('T')[0]

  // Run all stat queries in parallel
  const [
    { count: totalPatients },
    { count: todayAppts },
    { count: occupiedBeds },
    { count: pendingInvoices },
    { count: totalBeds },
    { data: recentPatients },
    { data: todayAppointments },
  ] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid).is('deleted_at', null),

    supabase.from('appointments').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid).eq('appointment_date', today)
      .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress']),

    supabase.from('beds').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid).eq('status', 'occupied'),

    supabase.from('hospital_invoices').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid).in('status', ['pending', 'partial']),

    supabase.from('beds').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid),

    supabase.from('patients').select('id, mrn, full_name, gender, phone, created_at')
      .eq('hospital_id', hid).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(5),

    supabase.from('appointments')
      .select('id, appointment_date, start_time, status, appointment_type, patients(full_name, mrn)')
      .eq('hospital_id', hid).eq('appointment_date', today)
      .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress'])
      .order('start_time', { ascending: true }).limit(6),
  ])

  const bedOccupancy = totalBeds ? Math.round(((occupiedBeds ?? 0) / totalBeds) * 100) : 0

  const stats = [
    {
      label: 'Total Patients',
      value: (totalPatients ?? 0).toLocaleString(),
      icon: Users,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
      sub: 'Registered patients',
    },
    {
      label: "Today's Appointments",
      value: (todayAppts ?? 0).toLocaleString(),
      icon: CalendarDays,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
      sub: 'Active today',
    },
    {
      label: 'Bed Occupancy',
      value: `${bedOccupancy}%`,
      icon: BedDouble,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      sub: `${occupiedBeds ?? 0} of ${totalBeds ?? 0} beds`,
    },
    {
      label: 'Pending Invoices',
      value: (pendingInvoices ?? 0).toLocaleString(),
      icon: Receipt,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      sub: 'Awaiting payment',
    },
  ]

  const statusMeta: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    scheduled:   { label: 'Scheduled',   color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: Clock        },
    confirmed:   { label: 'Confirmed',   color: '#038bbf', bg: 'rgba(3,139,191,0.1)',   icon: CheckCircle2 },
    checked_in:  { label: 'Checked In',  color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: CheckCircle2 },
    in_progress: { label: 'In Progress', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: TrendingUp   },
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-slate-900 mb-1"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Good {getGreeting()}, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: s.bg }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <p
              className="text-2xl font-bold text-slate-900 mb-0.5"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {s.value}
            </p>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Today's appointments */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                Today's Appointments
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Active & upcoming</p>
            </div>
            <CalendarDays className="h-4 w-4 text-slate-300" />
          </div>

          {!todayAppointments?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <CalendarDays className="h-8 w-8 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No appointments today</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {todayAppointments.map((appt: any) => {
                const meta = statusMeta[appt.status] ?? statusMeta.scheduled
                const StatusIcon = meta.icon
                return (
                  <li key={appt.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: meta.bg }}
                    >
                      <StatusIcon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {(appt.patients as any)?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {appt.start_time?.slice(0, 5)} · {appt.appointment_type ?? 'General'}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent patients */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2
                className="text-base font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                Recent Patients
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Newly registered</p>
            </div>
            <Users className="h-4 w-4 text-slate-300" />
          </div>

          {!recentPatients?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Users className="h-8 w-8 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No patients registered yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentPatients.map((p: any) => {
                const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <li key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{p.full_name}</p>
                      <p className="text-xs text-slate-400">
                        MRN: {p.mrn} · {p.gender ?? '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
