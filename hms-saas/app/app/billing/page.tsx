import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Receipt, Plus, Search, ChevronLeft, ChevronRight,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

function formatINR(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)
}

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; ring: string; strikethrough?: boolean }
> = {
  draft:    { label: 'Draft',    color: '#64748b', bg: 'rgba(100,116,139,0.08)', ring: 'rgba(100,116,139,0.2)' },
  pending:  { label: 'Pending',  color: '#d97706', bg: 'rgba(217,119,6,0.08)',   ring: 'rgba(217,119,6,0.2)'   },
  partial:  { label: 'Partial',  color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   ring: 'rgba(234,88,12,0.2)'   },
  paid:     { label: 'Paid',     color: '#059669', bg: 'rgba(5,150,105,0.08)',   ring: 'rgba(5,150,105,0.2)'   },
  void:     { label: 'Void',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', ring: 'rgba(148,163,184,0.2)', strikethrough: true },
  refunded: { label: 'Refunded', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', ring: 'rgba(124,58,237,0.2)'  },
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  opd:       { label: 'OPD',       color: '#038bbf', bg: 'rgba(3,139,191,0.08)'    },
  ipd:       { label: 'IPD',       color: '#00437b', bg: 'rgba(0,67,123,0.08)'     },
  pharmacy:  { label: 'Pharmacy',  color: '#059669', bg: 'rgba(5,150,105,0.08)'    },
  lab:       { label: 'Lab',       color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'   },
  radiology: { label: 'Radiology', color: '#db2777', bg: 'rgba(219,39,119,0.08)'   },
  procedure: { label: 'Procedure', color: '#d97706', bg: 'rgba(217,119,6,0.08)'    },
  misc:      { label: 'Misc',      color: '#64748b', bg: 'rgba(100,116,139,0.08)'  },
}

const INVOICE_TYPES = ['all', 'opd', 'ipd', 'pharmacy', 'lab', 'radiology', 'procedure', 'misc'] as const

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; type?: string }>
}) {
  const { q = '', page = '1', status = 'active', type = 'all' } = await searchParams
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
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  // Parallel stat queries
  const [
    { data: revenueData },
    { data: pendingData },
    { count: totalThisMonth },
    { count: paidToday },
  ] = await Promise.all([
    supabase
      .from('hospital_invoices')
      .select('paid_amount')
      .eq('hospital_id', hid)
      .eq('status', 'paid')
      .gte('invoice_date', monthStart),
    supabase
      .from('hospital_invoices')
      .select('balance_due')
      .eq('hospital_id', hid)
      .in('status', ['pending', 'partial']),
    supabase
      .from('hospital_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .gte('invoice_date', monthStart),
    supabase
      .from('hospital_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'paid')
      .eq('invoice_date', todayStr),
  ])

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, row: any) => sum + (row.paid_amount ?? 0), 0
  )
  const pendingAmount = (pendingData ?? []).reduce(
    (sum: number, row: any) => sum + (row.balance_due ?? 0), 0
  )

  const stats = [
    {
      label: 'Total Revenue',
      value: formatINR(totalRevenue),
      sub: 'Paid invoices this month',
      icon: TrendingUp,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
    },
    {
      label: 'Pending Amount',
      value: formatINR(pendingAmount),
      sub: 'Pending + partial invoices',
      icon: Clock,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
    },
    {
      label: 'Invoices This Month',
      value: (totalThisMonth ?? 0).toLocaleString(),
      sub: 'All invoice types',
      icon: Receipt,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
    },
    {
      label: 'Paid Today',
      value: (paidToday ?? 0).toLocaleString(),
      sub: 'Invoices settled today',
      icon: CheckCircle2,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
    },
  ]

  // Main invoice query
  let invoiceQuery = supabase
    .from('hospital_invoices')
    .select(
      'id, invoice_number, invoice_date, invoice_type, total_amount, paid_amount, balance_due, status, patients(full_name, mrn)',
      { count: 'exact' }
    )
    .eq('hospital_id', hid)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  // Status filter
  if (status === 'active' || status === 'all' || !status) {
    if (status === 'active' || !status || status === 'all') {
      // Default view excludes draft and void
      if (status === 'active' || !status) {
        invoiceQuery = invoiceQuery.in('status', ['pending', 'partial', 'paid', 'refunded'])
      }
    }
  } else {
    invoiceQuery = invoiceQuery.eq('status', status)
  }

  if (type && type !== 'all') {
    invoiceQuery = invoiceQuery.eq('invoice_type', type)
  }

  if (q.trim()) {
    invoiceQuery = invoiceQuery.or(
      `invoice_number.ilike.%${q.trim()}%`
    )
  }

  const { data: invoices, count } = await invoiceQuery

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildParams = (overrides: Record<string, string>) => {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (status) base.status = status
    if (type) base.type = type
    return new URLSearchParams({ ...base, ...overrides }).toString()
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
            Billing & Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-0.5" style={{ fontFamily: 'var(--font-open-sans)' }}>
            {total.toLocaleString()} invoice{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/app/billing/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
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
            <p className="text-sm font-medium text-slate-600" style={{ fontFamily: 'var(--font-open-sans)' }}>
              {s.label}
            </p>
            <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'var(--font-open-sans)' }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <form method="get" className="flex-1 flex gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search invoice number…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
              style={{ fontFamily: 'var(--font-open-sans)' }}
            />
          </div>
          {status && status !== 'all' && <input type="hidden" name="status" value={status} />}
          {type && type !== 'all' && <input type="hidden" name="type" value={type} />}
        </form>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['active', 'pending', 'partial', 'paid', 'draft', 'void', 'refunded', 'all'] as const).map((s) => (
            <Link
              key={s}
              href={`/app/billing?${buildParams({ status: s, page: '1' })}`}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                (status === s || (!status && s === 'active'))
                  ? 'bg-[#038bbf] text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-[#038bbf] hover:text-[#038bbf]',
              ].join(' ')}
            >
              {s === 'active' ? 'Active' : s}
            </Link>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {INVOICE_TYPES.map((t) => (
            <Link
              key={t}
              href={`/app/billing?${buildParams({ type: t, page: '1' })}`}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                type === t
                  ? 'bg-[#00437b] text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-[#00437b] hover:text-[#00437b]',
              ].join(' ')}
            >
              {t === 'all' ? 'All Types' : TYPE_META[t]?.label ?? t}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!invoices?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400" style={{ fontFamily: 'var(--font-open-sans)' }}>
              {q ? 'No invoices match your search' : 'No invoices found'}
            </p>
            {!q && (
              <Link
                href="/app/billing/new"
                className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
              >
                Create your first invoice →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      'Invoice #',
                      'Patient',
                      'Date',
                      'Type',
                      'Total',
                      'Paid',
                      'Balance Due',
                      'Status',
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                        style={{ fontFamily: 'var(--font-open-sans)' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(invoices as any[]).map((inv) => {
                    const statusMeta = STATUS_META[inv.status] ?? STATUS_META.pending
                    const typeMeta = TYPE_META[inv.invoice_type] ?? TYPE_META.misc
                    const patient = inv.patients as any
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group">
                        {/* Invoice # */}
                        <td className="px-5 py-4">
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            <span className="font-mono text-xs font-semibold text-[#038bbf] bg-[#038bbf]/8 rounded px-1.5 py-0.5 group-hover:underline">
                              {inv.invoice_number}
                            </span>
                          </Link>
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-4">
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            {patient ? (
                              <div>
                                <p className="font-medium text-slate-800" style={{ fontFamily: 'var(--font-open-sans)' }}>
                                  {patient.full_name}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                                  {patient.mrn}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </Link>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            {inv.invoice_date
                              ? new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </Link>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{ background: typeMeta.bg, color: typeMeta.color }}
                            >
                              {typeMeta.label}
                            </span>
                          </Link>
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 font-semibold text-slate-800 tabular-nums" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            {formatINR(inv.total_amount)}
                          </Link>
                        </td>

                        {/* Paid */}
                        <td className="px-5 py-4 text-slate-600 tabular-nums" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            {formatINR(inv.paid_amount)}
                          </Link>
                        </td>

                        {/* Balance Due */}
                        <td className="px-5 py-4 tabular-nums">
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            {(inv.balance_due ?? 0) > 0 ? (
                              <span className="font-semibold text-red-600">
                                {formatINR(inv.balance_due)}
                              </span>
                            ) : (
                              <span className="text-slate-400">{formatINR(0)}</span>
                            )}
                          </Link>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <Link href={`/app/billing/${inv.id}`} className="block">
                            <span
                              className={[
                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                statusMeta.strikethrough ? 'line-through' : '',
                              ].join(' ')}
                              style={{ background: statusMeta.bg, color: statusMeta.color }}
                            >
                              {statusMeta.label}
                            </span>
                          </Link>
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
                <p className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  Showing {from + 1}–{Math.min(to + 1, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5">
                  {pageNum > 1 && (
                    <Link
                      href={`/app/billing?${buildParams({ page: String(pageNum - 1) })}`}
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
                      href={`/app/billing?${buildParams({ page: String(pageNum + 1) })}`}
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
