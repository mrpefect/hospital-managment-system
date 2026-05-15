import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

function calcAge(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: '—',
}

export default async function PatientsPage({
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

  let query = supabase
    .from('patients')
    .select('id, mrn, full_name, gender, date_of_birth, blood_group, phone, city, created_at', { count: 'exact' })
    .eq('hospital_id', profile.hospital_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q.trim()) {
    query = query.or(`full_name.ilike.%${q.trim()}%,mrn.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`)
  }

  const { data: patients, count } = await query

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
            Patients
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} registered patient{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/app/patients/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          New Patient
        </Link>
      </div>

      {/* Search */}
      <form method="get" className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, MRN, or phone…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
          />
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!patients?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {q ? 'No patients match your search' : 'No patients registered yet'}
            </p>
            {!q && (
              <Link
                href="/app/patients/new"
                className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
              >
                Register your first patient →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">MRN</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Age / Gender</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Blood</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">City</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {patients.map((p: any) => {
                    const age = calcAge(p.date_of_birth)
                    const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                            {p.mrn}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/app/patients/${p.id}`} className="flex items-center gap-3 group">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                            >
                              {initials}
                            </div>
                            <span className="font-medium text-slate-800 group-hover:text-[#038bbf] transition-colors">
                              {p.full_name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {age !== null ? `${age}y` : '—'} / {GENDER_LABEL[p.gender] ?? '—'}
                        </td>
                        <td className="px-5 py-4">
                          {p.blood_group ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-100">
                              {p.blood_group}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{p.phone ?? '—'}</td>
                        <td className="px-5 py-4 text-slate-600">{p.city ?? '—'}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                      href={`/app/patients?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum - 1) })}`}
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
                      href={`/app/patients?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum + 1) })}`}
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
