import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, CalendarDays, Clock, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DoctorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  // Look up doctor_profiles.id — appointments.doctor_id references this, not profiles.id
  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id, specialization, consultation_fee, is_available_today')
    .eq('profile_id', profile.id)
    .single()

  const hid = profile.hospital_id
  const today = new Date().toISOString().split('T')[0]

  const docId = doctorProf?.id

  const [
    { count: totalToday },
    { count: scheduledCount },
    { count: completedCount },
    { data: appointments },
  ] = await Promise.all([
    docId
      ? supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hid)
          .eq('doctor_id', docId)
          .eq('appointment_date', today)
      : Promise.resolve({ count: 0 }),

    docId
      ? supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hid)
          .eq('doctor_id', docId)
          .eq('appointment_date', today)
          .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress'])
      : Promise.resolve({ count: 0 }),

    docId
      ? supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hid)
          .eq('doctor_id', docId)
          .eq('appointment_date', today)
          .eq('status', 'completed')
      : Promise.resolve({ count: 0 }),

    docId
      ? supabase
          .from('appointments')
          .select('id, token_number, start_time, appointment_type, visit_type, status, consultation_fee, patients(full_name, mrn, phone)')
          .eq('hospital_id', hid)
          .eq('doctor_id', docId)
          .eq('appointment_date', today)
          .order('start_time', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const stats = [
    {
      label: "Today's Total",
      value: totalToday ?? 0,
      icon: CalendarDays,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
      sub: 'All appointments today',
    },
    {
      label: 'Scheduled',
      value: scheduledCount ?? 0,
      icon: Clock,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
      sub: 'Pending / in progress',
    },
    {
      label: 'Completed',
      value: completedCount ?? 0,
      icon: CheckCircle2,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      sub: 'Finished today',
    },
  ]

  const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
    scheduled:   { label: 'Scheduled',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    confirmed:   { label: 'Confirmed',   color: '#038bbf', bg: 'rgba(3,139,191,0.1)'   },
    checked_in:  { label: 'Checked In',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    in_progress: { label: 'In Progress', color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
    completed:   { label: 'Completed',   color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
    cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
    no_show:     { label: 'No Show',     color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
          Good {getGreeting()}, Dr. {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {doctorProf && (
          <p className="text-xs text-slate-400 mt-1">
            {doctorProf.specialization}
            {doctorProf.consultation_fee != null && ` · ₹${Number(doctorProf.consultation_fee).toLocaleString('en-IN')} / visit`}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: s.bg }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-lato)' }}>
              {s.value}
            </p>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's appointments table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
              Today's Appointments
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <LayoutDashboard className="h-4 w-4 text-slate-300" />
        </div>

        {!appointments?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <CalendarDays className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Token #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(appointments as any[]).map((appt) => {
                  const patient = appt.patients as any
                  const s = statusStyle[appt.status] ?? statusStyle.scheduled
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex h-7 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                        >
                          {appt.token_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{patient?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">MRN: {patient?.mrn ?? '—'} · {patient?.phone ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {appt.start_time ? appt.start_time.slice(0, 5) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 capitalize">
                          {appt.visit_type?.replace(/_/g, ' ') ?? appt.appointment_type ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {appt.consultation_fee != null ? `₹${Number(appt.consultation_fee).toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
