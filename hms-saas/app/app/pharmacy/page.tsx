import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Pill,
  Plus,
  Search,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val)
}

function StockStatusBadge({ row }: { row: { available_stock: number; reorder_level: number; expiring_soon_batches: number } }) {
  if (row.available_stock === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-100">
        Out of Stock
      </span>
    )
  }
  if (row.available_stock <= row.reorder_level) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-100">
        Low Stock
      </span>
    )
  }
  if (row.expiring_soon_batches > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-100">
        Expiring Soon
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-600 ring-1 ring-green-100">
      In Stock
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:              { label: 'Pending',              cls: 'bg-amber-50 text-amber-600 ring-amber-100' },
    processing:           { label: 'Processing',           cls: 'bg-blue-50 text-blue-600 ring-blue-100' },
    dispensed:            { label: 'Dispensed',            cls: 'bg-green-50 text-green-600 ring-green-100' },
    partially_dispensed:  { label: 'Partial',              cls: 'bg-sky-50 text-sky-600 ring-sky-100' },
    cancelled:            { label: 'Cancelled',            cls: 'bg-red-50 text-red-600 ring-red-100' },
    returned:             { label: 'Returned',             cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
  }
  const m = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-500 ring-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${m.cls}`}>
      {m.label}
    </span>
  )
}

function OrderTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    outpatient: { label: 'Outpatient', cls: 'bg-purple-50 text-purple-600 ring-purple-100' },
    inpatient:  { label: 'Inpatient',  cls: 'bg-indigo-50 text-indigo-600 ring-indigo-100' },
    emergency:  { label: 'Emergency',  cls: 'bg-red-50 text-red-600 ring-red-100' },
    counter:    { label: 'Counter',    cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
  }
  const m = map[type] ?? { label: type, cls: 'bg-slate-50 text-slate-500 ring-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${m.cls}`}>
      {m.label}
    </span>
  )
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const { tab = 'stock', q = '' } = await searchParams

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

  // ── Summary counts (always loaded) ──────────────────────────────────────────
  const ninetyDaysFromNow = new Date()
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)
  const expiryThreshold = ninetyDaysFromNow.toISOString().split('T')[0]

  const [
    { count: totalDrugs },
    { count: lowStockCount },
    { count: expiringSoonCount },
  ] = await Promise.all([
    supabase
      .from('drug_stock_levels')
      .select('drug_id', { count: 'exact', head: true })
      .eq('hospital_id', hid),

    supabase
      .from('drug_stock_levels')
      .select('drug_id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .filter('available_stock', 'lte', 'reorder_level'),

    supabase
      .from('drug_stock_levels')
      .select('drug_id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .gt('expiring_soon_batches', 0),
  ])

  // ── Stock tab data ───────────────────────────────────────────────────────────
  let stockRows: any[] = []
  if (tab === 'stock') {
    let stockQuery = supabase
      .from('drug_stock_levels')
      .select('drug_id, name, generic_name, form, strength, unit, reorder_level, total_stock, reserved_stock, available_stock, nearest_expiry, expiring_soon_batches')
      .eq('hospital_id', hid)
      .order('name', { ascending: true })

    if (q.trim()) {
      stockQuery = stockQuery.ilike('name', `%${q.trim()}%`)
    }

    const { data } = await stockQuery.limit(100)
    stockRows = data ?? []
  }

  // ── Orders tab data ──────────────────────────────────────────────────────────
  let orderRows: any[] = []
  if (tab === 'orders') {
    const { data } = await supabase
      .from('pharmacy_orders')
      .select('id, order_number, order_type, total_amount, status, dispensed_at, created_at, patients(full_name, mrn)')
      .eq('hospital_id', hid)
      .order('created_at', { ascending: false })
      .limit(30)

    orderRows = data ?? []
  }

  const summaryCards = [
    {
      label: 'Total Drugs',
      value: (totalDrugs ?? 0).toLocaleString(),
      icon: Pill,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
      sub: 'In formulary',
    },
    {
      label: 'Low Stock',
      value: (lowStockCount ?? 0).toLocaleString(),
      icon: AlertTriangle,
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      sub: 'At or below reorder level',
    },
    {
      label: 'Expiring Soon',
      value: (expiringSoonCount ?? 0).toLocaleString(),
      icon: Clock,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      sub: 'Within 90 days',
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
            Pharmacy
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Drug inventory and dispensing orders</p>
        </div>
        <Link
          href="/app/pharmacy/drugs/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          <Plus className="h-4 w-4" />
          Add Drug
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200">
        {(['stock', 'orders'] as const).map((t) => {
          const icons = { stock: Package, orders: ShoppingCart }
          const labels = { stock: 'Stock', orders: 'Orders' }
          const Icon = icons[t]
          const isActive = tab === t
          return (
            <Link
              key={t}
              href={`/app/pharmacy?tab=${t}`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-[#038bbf] text-[#038bbf]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {labels[t]}
            </Link>
          )
        })}
      </div>

      {/* Stock Tab */}
      {tab === 'stock' && (
        <>
          <form method="get" className="mb-5">
            <input type="hidden" name="tab" value="stock" />
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by drug name…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
              />
            </div>
          </form>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {!stockRows.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Pill className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400">
                  {q ? 'No drugs match your search' : 'No drug stock data available'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Drug
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Form / Strength
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Available
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Total
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Reorder At
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Nearest Expiry
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stockRows.map((row: any) => (
                      <tr key={row.drug_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{row.name}</p>
                          {row.generic_name && (
                            <p className="text-xs text-slate-400 mt-0.5">{row.generic_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <span className="capitalize">{row.form ?? '—'}</span>
                          {row.strength && (
                            <span className="text-slate-400"> · {row.strength}{row.unit ? ` ${row.unit}` : ''}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              row.available_stock === 0
                                ? 'text-red-500'
                                : row.available_stock <= row.reorder_level
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {(row.available_stock ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 tabular-nums">
                          {(row.total_stock ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 tabular-nums">
                          {(row.reorder_level ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {fmtDate(row.nearest_expiry)}
                        </td>
                        <td className="px-5 py-4">
                          <StockStatusBadge row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {!orderRows.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No pharmacy orders found</p>
            </div>
          ) : (
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
                      Type
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orderRows.map((order: any) => {
                    const patient = order.patients as any
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{patient?.full_name ?? '—'}</p>
                          {patient?.mrn && (
                            <p className="text-xs text-slate-400 mt-0.5">MRN: {patient.mrn}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <OrderTypeBadge type={order.order_type} />
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-800 tabular-nums">
                          {fmtCurrency(order.total_amount)}
                        </td>
                        <td className="px-5 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-xs">
                          {fmtDate(order.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
