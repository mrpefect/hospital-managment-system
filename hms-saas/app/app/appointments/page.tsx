import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: '#f1f5f9' },
  confirmed:   { label: 'Confirmed',   color: '#038bbf', bg: '#e0f4fc' },
  checked_in:  { label: 'Checked In',  color: '#059669', bg: '#d1fae5' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#ede9fe' },
  completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2' },
  no_show:     { label: 'No Show',     color: '#9f1239', bg: '#ffe4e6' },
  rescheduled: { label: 'Rescheduled', color: '#d97706', bg: '#fef3c7' },
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  opd:         { label: 'OPD',         color: '#0369a1', bg: '#e0f2fe' },
  ipd:         { label: 'IPD',         color: '#7c3aed', bg: '#ede9fe' },
  emergency:   { label: 'Emergency',   color: '#dc2626', bg: '#fee2e2' },
  follow_up:   { label: 'Follow Up',   color: '#b45309', bg: '#fef3c7' },
  teleconsult: { label: 'Teleconsult', color: '#0d9488', bg: '#ccfbf1' },
}

const VISIT_LABEL: Record<string, string> = {
  new:       'New',
  follow_up: 'Follow Up',
  review:    'Review',
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'checked_in',  label: 'Checked In' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

function buildDateFilter(filter: string): { gte?: string; lte?: string } | null {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  if (filter === 'today') return { gte: todayStr, lte: todayStr }
  if (filter === 'week') {
    const dow = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dow)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + (6 - dow))
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { gte: fmt(startOfWeek), lte: fmt(endOfWeek) }
  }
  return null
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; status?: string; page?: string }>
}) {
  const { filter = 'today', status = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id

  let query = supabase
    .from('appointments')
    .select(
      'id, appointment_date, start_time, end_time, appointment_type, visit_type, status, token_number, consultation_fee, is_paid, chief_complaint, patients(id, full_name, mrn), doctor_id, doctor_profiles!appointments_doctor_id_fkey(id, specialization, profiles!doctor_profiles_profile_id_fkey(full_name))',
      { count: 'exact' }
    )
    .eq('hospital_id', hid)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: true })
    .range(from, to)

  const dateRange = buildDateFilter(filter)
  if (dateRange?.gte) query = query.gte('appointment_date', dateRange.gte)
  if (dateRange?.lte) query = query.lte('appointment_date', dateRange.lte)
  if (status) query = query.eq('status', status)

  const { data: appointments, count } = await query

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageLink(p: number) {
    const params = new URLSearchParams()
    params.set('filter', filter)
    if (status) params.set('status', status)
    params.set('page', String(p))
    return `/app/appointments?${params.toString()}`
  }

  function filterLink(f: string) {
    const params = new URLSearchParams()
    params.set('filter', f)
    if (status) params.set('status', status)
    return `/app/appointments?${params.toString()}`
  }

  function statusLink(s: string) {
    const params = new URLSearchParams()
    params.set('filter', filter)
    if (s) params.set('status', s)
    return `/app/appointments?${params.toString()}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
            Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} appointment{total !== 1 ? 's' : ''}
            {filter === 'today' ? ' today' : filter === 'week' ? ' this week' : ' total'}
          </p>
        </div>
        <Link
          href="/app/appointments/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Date tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['today', 'week', 'all'] as const).map(f => (
            <Link
              key={f}
              href={filterLink(f)}
              className={[
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors capitalize',
                filter === f
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
              style={filter === f ? { background: 'linear-gradient(135deg, #038bbf, #00437b)' } : {}}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All'}
            </Link>
          ))}
        </div>

        {/* Status dropdown */}
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={filter} />
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition cursor-pointer"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!appointments?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {status
                ? 'No appointments match the selected status'
                : filter === 'today'
                ? 'No appointments scheduled for today'
                : filter === 'week'
                ? 'No appointments this week'
                : 'No appointments found'}
            </p>
            <Link
              href="/app/appointments/new"
              className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
            >
              Schedule an appointment →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Token</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Doctor</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date &amp; Time</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Visit</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(appointments as any[]).map((appt) => {
                    const patient = appt.patients
                    const doctorProfile = appt.doctor_profiles
                    const doctorName = doctorProfile?.profiles?.full_name ?? '—'
                    const statusMeta = STATUS_META[appt.status] ?? STATUS_META.scheduled
                    const typeMeta = TYPE_META[appt.appointment_type] ?? { label: appt.appointment_type, color: '#64748b', bg: '#f1f5f9' }
                    const patientInitials = patient?.full_name
                      ? patient.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?'

                    return (
                      <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          {appt.token_number ? (
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                              #{appt.token_number}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {patient ? (
                            <Link href={`/app/patients/${patient.id}`} className="flex items-center gap-3 group">
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                              >
                                {patientInitials}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 group-hover:text-[#038bbf] transition-colors leading-tight">
                                  {patient.full_name}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">{patient.mrn}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-slate-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">{doctorName}</p>
                          {doctorProfile?.specialization && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{doctorProfile.specialization}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-slate-700">
                            {new Date(appt.appointment_date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                          {appt.start_time && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {appt.start_time.slice(0, 5)}
                              {appt.end_time ? ` – ${appt.end_time.slice(0, 5)}` : ''}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: typeMeta.bg, color: typeMeta.color }}
                          >
                            {typeMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 capitalize text-sm">
                          {VISIT_LABEL[appt.visit_type] ?? appt.visit_type ?? '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: statusMeta.bg, color: statusMeta.color }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {appt.consultation_fee != null ? (
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                ₹{Number(appt.consultation_fee).toLocaleString('en-IN')}
                              </p>
                              <p className={`text-[11px] font-medium mt-0.5 ${appt.is_paid ? 'text-green-600' : 'text-amber-600'}`}>
                                {appt.is_paid ? 'Paid' : 'Unpaid'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                <p className="text-xs text-slate-400">
                  Showing {from + 1}–{Math.min(to + 1, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5">
                  {pageNum > 1 && (
                    <Link
                      href={pageLink(pageNum - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  )}
                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                    {pageNum} / {totalPages}
                  </span>
                  {pageNum < totalPages && (
                    <Link
                      href={pageLink(pageNum + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
