import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Plus, Search, ChevronLeft, ChevronRight, UserCheck, Clock, Stethoscope } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  doctor:          { label: 'Doctor',          color: '#1d4ed8', bg: '#dbeafe' },
  nurse:           { label: 'Nurse',           color: '#be185d', bg: '#fce7f3' },
  pharmacist:      { label: 'Pharmacist',      color: '#0d9488', bg: '#ccfbf1' },
  lab_technician:  { label: 'Lab Technician',  color: '#7c3aed', bg: '#ede9fe' },
  radiologist:     { label: 'Radiologist',     color: '#6d28d9', bg: '#f3e8ff' },
  receptionist:    { label: 'Receptionist',    color: '#b45309', bg: '#fef3c7' },
  accountant:      { label: 'Accountant',      color: '#475569', bg: '#f1f5f9' },
  hr_manager:      { label: 'HR Manager',      color: '#0369a1', bg: '#e0f2fe' },
  ward_boy:        { label: 'Ward Boy',        color: '#4b5563', bg: '#f3f4f6' },
  driver:          { label: 'Driver',          color: '#374151', bg: '#e5e7eb' },
  other:           { label: 'Other',           color: '#6b7280', bg: '#f3f4f6' },
  hospital_admin:  { label: 'Admin',           color: '#059669', bg: '#d1fae5' },
}

const ROLE_OPTIONS = [
  { value: 'all',            label: 'All Roles' },
  { value: 'doctor',         label: 'Doctor' },
  { value: 'nurse',          label: 'Nurse' },
  { value: 'pharmacist',     label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiologist',    label: 'Radiologist' },
  { value: 'receptionist',   label: 'Receptionist' },
  { value: 'accountant',     label: 'Accountant' },
  { value: 'hr_manager',     label: 'HR Manager' },
  { value: 'ward_boy',       label: 'Ward Boy' },
  { value: 'driver',         label: 'Driver' },
  { value: 'other',          label: 'Other' },
]

function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, color: '#6b7280', bg: '#f3f4f6' }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; dept?: string; page?: string }>
}) {
  const { q = '', role = 'all', dept = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id
  const today = new Date().toISOString().split('T')[0]

  // Summary counts + departments in parallel
  const [
    { count: totalStaff },
    { count: activeStaff },
    { count: onLeaveToday },
    { count: doctorCount },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .neq('role', 'hospital_admin'),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .neq('role', 'hospital_admin')
      .eq('is_active', true),

    supabase
      .from('staff_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'on_leave')
      .eq('attendance_date', today),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('role', 'doctor'),

    supabase
      .from('departments')
      .select('id, name')
      .eq('hospital_id', hid)
      .eq('is_active', true)
      .order('name'),
  ])

  // Staff list query
  let staffQuery = supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, designation, is_active, created_at, departments(name)', {
      count: 'exact',
    })
    .eq('hospital_id', hid)
    .neq('role', 'hospital_admin')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (role && role !== 'all') {
    staffQuery = staffQuery.eq('role', role)
  }

  if (dept) {
    staffQuery = staffQuery.eq('department_id', dept)
  }

  if (q.trim()) {
    staffQuery = staffQuery.or(
      `full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`
    )
  }

  const { data: staffList, count: staffCount } = await staffQuery

  const total = staffCount ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildLink(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { q, role, dept, page, ...overrides }
    if (merged.q) params.set('q', merged.q)
    if (merged.role && merged.role !== 'all') params.set('role', merged.role)
    if (merged.dept) params.set('dept', merged.dept)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    const qs = params.toString()
    return `/app/staff${qs ? `?${qs}` : ''}`
  }

  const summaryCards = [
    {
      label: 'Total Staff',
      value: (totalStaff ?? 0).toLocaleString(),
      icon: Users,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
    },
    {
      label: 'Active',
      value: (activeStaff ?? 0).toLocaleString(),
      icon: UserCheck,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
    },
    {
      label: 'On Leave Today',
      value: (onLeaveToday ?? 0).toLocaleString(),
      icon: Clock,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
    },
    {
      label: 'Doctors',
      value: (doctorCount ?? 0).toLocaleString(),
      icon: Stethoscope,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Staff Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {(totalStaff ?? 0).toLocaleString()} team member
            {(totalStaff ?? 0) !== 1 ? 's' : ''} across all departments
          </p>
        </div>
        <Link
          href="/app/staff/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
              style={{ background: card.bg }}
            >
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <p
              className="text-2xl font-bold text-slate-900 mb-0.5"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {card.value}
            </p>
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <form method="get" className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
          />
        </div>

        {/* Role filter */}
        <select
          name="role"
          defaultValue={role}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition cursor-pointer"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Department filter */}
        <select
          name="dept"
          defaultValue={dept}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition cursor-pointer"
        >
          <option value="">All Departments</option>
          {(departments ?? []).map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Filter
        </button>

        {(q || (role && role !== 'all') || dept) && (
          <Link
            href="/app/staff"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!staffList?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {q || (role && role !== 'all') || dept
                ? 'No staff match your filters'
                : 'No staff members added yet'}
            </p>
            {!q && !dept && (!role || role === 'all') && (
              <Link
                href="/app/staff/new"
                className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
              >
                Add your first staff member →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Staff Member
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Role
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Department
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Designation
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Phone
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(staffList as any[]).map((member) => {
                    const meta = roleMeta(member.role)
                    const initials = getInitials(member.full_name)
                    const deptName = member.departments?.name ?? '—'
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 leading-tight">
                                {member.full_name}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{deptName}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {member.designation || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {member.phone || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {member.is_active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {new Date(member.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
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
                      href={buildLink({ page: String(pageNum - 1) })}
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
                      href={buildLink({ page: String(pageNum + 1) })}
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
