import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Stethoscope, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page = '1' } = await searchParams
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
    .from('doctor_profiles')
    .select(
      'id, specialization, qualification, years_of_experience, consultation_fee, is_available_today, profiles!doctor_profiles_profile_id_fkey(full_name, email, phone, department_id)',
      { count: 'exact' }
    )
    .eq('hospital_id', hid)
    .range(from, to)

  if (q.trim()) {
    query = query.or(
      `specialization.ilike.%${q.trim()}%,qualification.ilike.%${q.trim()}%`
    )
  }

  const { data: doctors, count } = await query

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Appointment count today per doctor
  const todayStr = new Date().toISOString().split('T')[0]
  let apptCounts: Record<string, number> = {}
  if (doctors && doctors.length > 0) {
    const doctorIds = doctors.map((d: any) => d.id)
    const { data: apptRows } = await supabase
      .from('appointments')
      .select('doctor_id')
      .eq('hospital_id', hid)
      .eq('appointment_date', todayStr)
      .in('doctor_id', doctorIds)

    if (apptRows) {
      for (const row of apptRows) {
        apptCounts[row.doctor_id] = (apptCounts[row.doctor_id] ?? 0) + 1
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
            Doctors
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} doctor{total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link
          href="/app/doctors/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          Add Doctor
        </Link>
      </div>

      {/* Search */}
      <form method="get" className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or specialization…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
          />
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!doctors?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Stethoscope className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {q ? 'No doctors match your search' : 'No doctors added yet'}
            </p>
            {!q && (
              <Link
                href="/app/doctors/new"
                className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
              >
                Add your first doctor →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Doctor</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Specialization</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Qualification</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Experience</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Consult Fee</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Availability</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Appts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(doctors as any[]).map((doc) => {
                    const prof = doc.profiles
                    const name = prof?.full_name ?? 'Unknown Doctor'
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    const todayCount = apptCounts[doc.id] ?? 0

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          <Link href={`/app/doctors/${doc.id}`} className="flex items-center gap-3 group">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 group-hover:text-[#038bbf] transition-colors leading-tight">
                                {name}
                              </p>
                              {prof?.email && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{prof.email}</p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{doc.specialization ?? '—'}</td>
                        <td className="px-5 py-4 text-slate-600">{doc.qualification ?? '—'}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {doc.years_of_experience != null
                            ? `${doc.years_of_experience} yr${doc.years_of_experience !== 1 ? 's' : ''}`
                            : '—'}
                        </td>
                        <td className="px-5 py-4">
                          {doc.consultation_fee != null ? (
                            <span className="font-semibold text-slate-700">
                              ₹{Number(doc.consultation_fee).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: doc.is_available_today ? '#059669' : '#94a3b8' }}
                            />
                            <span className={doc.is_available_today ? 'text-emerald-700' : 'text-slate-400'}>
                              {doc.is_available_today ? 'Available' : 'Unavailable'}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={[
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                              todayCount > 0
                                ? 'text-[#038bbf] bg-[#e0f4fc]'
                                : 'text-slate-400 bg-slate-100',
                            ].join(' ')}
                          >
                            {todayCount}
                          </span>
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
                      href={`/app/doctors?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum - 1) })}`}
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
                      href={`/app/doctors?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum + 1) })}`}
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
