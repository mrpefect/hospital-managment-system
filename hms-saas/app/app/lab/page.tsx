import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FlaskConical,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  CheckCircle2,
  FileCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

function fmtDateTime(val: string | null | undefined): string {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    routine: { label: 'Routine', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
    urgent:  { label: 'Urgent',  cls: 'bg-amber-50 text-amber-600 ring-amber-100' },
    stat:    { label: 'STAT',    cls: 'bg-red-50 text-red-600 ring-red-100' },
    asap:    { label: 'ASAP',    cls: 'bg-orange-50 text-orange-600 ring-orange-100' },
  }
  const m = map[urgency] ?? { label: urgency, cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${m.cls}`}>
      {m.label}
    </span>
  )
}

function LabStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ordered:         { label: 'Ordered',          cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
    sample_pending:  { label: 'Sample Pending',   cls: 'bg-amber-50 text-amber-600 ring-amber-100' },
    sample_collected:{ label: 'Sample Collected', cls: 'bg-blue-50 text-blue-600 ring-blue-100' },
    processing:      { label: 'Processing',       cls: 'bg-purple-50 text-purple-600 ring-purple-100' },
    partial_results: { label: 'Partial Results',  cls: 'bg-indigo-50 text-indigo-600 ring-indigo-100' },
    results_ready:   { label: 'Results Ready',    cls: 'bg-green-50 text-green-600 ring-green-100' },
    reported:        { label: 'Reported',         cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    cancelled:       { label: 'Cancelled',        cls: 'bg-red-50 text-red-600 ring-red-100' },
  }
  const m = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${m.cls}`}>
      {m.label}
    </span>
  )
}

type FilterTab = 'all' | 'today' | 'pending' | 'results_ready'

export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>
}) {
  const { filter = 'all', q = '', page = '1' } = await searchParams
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
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Summary counts ───────────────────────────────────────────────────────────
  const pendingStatuses = ['ordered', 'sample_pending', 'sample_collected', 'processing']

  const [
    { count: totalToday },
    { count: pendingCount },
    { count: resultsReadyCount },
    { count: reportedCount },
  ] = await Promise.all([
    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .gte('ordered_at', `${todayStr}T00:00:00`)
      .lte('ordered_at', `${todayStr}T23:59:59`),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .in('status', pendingStatuses),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'results_ready'),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'reported'),
  ])

  // ── Orders query ─────────────────────────────────────────────────────────────
  let ordersQuery = supabase
    .from('lab_orders')
    .select(
      'id, order_number, urgency, status, ordered_at, reported_at, fasting, patients(full_name, mrn), doctor_profiles!lab_orders_doctor_id_fkey(profiles!doctor_profiles_profile_id_fkey(full_name))',
      { count: 'exact' }
    )
    .eq('hospital_id', hid)
    .order('ordered_at', { ascending: false })
    .range(from, to)

  if (filter === 'today') {
    ordersQuery = ordersQuery
      .gte('ordered_at', `${todayStr}T00:00:00`)
      .lte('ordered_at', `${todayStr}T23:59:59`)
  } else if (filter === 'pending') {
    ordersQuery = ordersQuery.in('status', pendingStatuses)
  } else if (filter === 'results_ready') {
    ordersQuery = ordersQuery.eq('status', 'results_ready')
  }

  if (q.trim()) {
    ordersQuery = ordersQuery.or(
      `order_number.ilike.%${q.trim()}%,patients.full_name.ilike.%${q.trim()}%`
    )
  }

  const { data: orders, count } = await ordersQuery

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const summaryCards = [
    {
      label: "Today's Orders",
      value: (totalToday ?? 0).toLocaleString(),
      icon: ClipboardList,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
      sub: 'Ordered today',
    },
    {
      label: 'Pending',
      value: (pendingCount ?? 0).toLocaleString(),
      icon: Loader2,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      sub: 'In progress',
    },
    {
      label: 'Results Ready',
      value: (resultsReadyCount ?? 0).toLocaleString(),
      icon: CheckCircle2,
      color: '#16a34a',
      bg: 'rgba(22,163,74,0.08)',
      sub: 'Awaiting report',
    },
    {
      label: 'Reported',
      value: (reportedCount ?? 0).toLocaleString(),
      icon: FileCheck,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      sub: 'Completed',
    },
  ]

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',           label: 'All' },
    { key: 'today',         label: 'Today' },
    { key: 'pending',       label: 'Pending' },
    { key: 'results_ready', label: 'Results Ready' },
  ]

  function buildHref(params: Record<string, string>) {
    return `/app/lab?${new URLSearchParams(params)}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Laboratory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} order{total !== 1 ? 's' : ''}
            {filter !== 'all' ? ` · ${filterTabs.find((t) => t.key === filter)?.label ?? filter}` : ''}
          </p>
        </div>
        <Link
          href="/app/lab/orders/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          New Lab Order
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {summaryCards.map((s) => (
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

      {/* Filter tabs + search row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-1 border-b border-slate-200 sm:border-none">
          {filterTabs.map((t) => {
            const isActive = filter === t.key
            return (
              <Link
                key={t.key}
                href={buildHref({
                  filter: t.key,
                  ...(q ? { q } : {}),
                })}
                className={`inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#038bbf]/10 text-[#038bbf]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </div>

        <form method="get" className="shrink-0">
          {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search order # or patient…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
            />
          </div>
        </form>
      </div>

      {/* Orders table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!orders?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FlaskConical className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {q ? 'No orders match your search' : 'No lab orders found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Order #
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Patient
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ordered By
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Urgency
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Ordered At
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Reported At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((order: any) => {
                    const patient = order.patients as any
                    const doctorProfile = order.doctor_profiles as any
                    const doctorName =
                      doctorProfile?.profiles?.full_name ?? '—'
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                            {order.order_number}
                          </span>
                          {order.fasting && (
                            <span className="ml-2 text-[10px] font-semibold text-orange-500 bg-orange-50 rounded px-1.5 py-0.5 ring-1 ring-orange-100">
                              Fasting
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {patient?.full_name ?? '—'}
                          </p>
                          {patient?.mrn && (
                            <p className="text-xs text-slate-400 mt-0.5">MRN: {patient.mrn}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{doctorName}</td>
                        <td className="px-5 py-4">
                          <UrgencyBadge urgency={order.urgency} />
                        </td>
                        <td className="px-5 py-4">
                          <LabStatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {fmtDateTime(order.ordered_at)}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {fmtDateTime(order.reported_at)}
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
                      href={buildHref({
                        ...(filter !== 'all' ? { filter } : {}),
                        ...(q ? { q } : {}),
                        page: String(pageNum - 1),
                      })}
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
                      href={buildHref({
                        ...(filter !== 'all' ? { filter } : {}),
                        ...(q ? { q } : {}),
                        page: String(pageNum + 1),
                      })}
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
