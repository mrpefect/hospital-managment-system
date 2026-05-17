import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  confirmed:   { label: 'Confirmed',   color: '#038bbf', bg: 'rgba(3,139,191,0.1)'   },
  checked_in:  { label: 'Checked In',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  completed:   { label: 'Completed',   color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  no_show:     { label: 'No Show',     color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
}

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  // Look up the doctor_profiles row — appointments.doctor_id references doctor_profiles.id
  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = params.date ?? today

  const { data: appointments } = doctorProf
    ? await supabase
        .from('appointments')
        .select('id, token_number, appointment_date, start_time, appointment_type, visit_type, status, consultation_fee, patients(full_name, mrn, phone)')
        .eq('hospital_id', profile.hospital_id)
        .eq('doctor_id', doctorProf.id)
        .eq('appointment_date', selectedDate)
        .order('start_time', { ascending: true })
    : { data: [] }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
            My Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {appointments?.length ?? 0} appointment{(appointments?.length ?? 0) !== 1 ? 's' : ''} on {formatDate(selectedDate)}
          </p>
        </div>

        {/* Date filter */}
        <form method="GET">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Date:</label>
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: '#7c3aed' }}
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!appointments?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <CalendarDays className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No appointments on {formatDate(selectedDate)}</p>
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
                        <p className="text-xs text-slate-400">
                          MRN: {patient?.mrn ?? '—'} · {patient?.phone ?? ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {appt.start_time ? appt.start_time.slice(0, 5) : '—'}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {appt.visit_type?.replace(/_/g, ' ') ?? appt.appointment_type ?? '—'}
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

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
