import { createClient } from '@/lib/supabase/server'
import { TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatINR(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

async function getRevenueData() {
  const supabase = await createClient()

  const [
    { data: activeSubs },
    { data: recentInvoices },
    { data: invoiceStats },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, hospital_id, plan_id, current_period_end, plans(name, price_monthly), hospitals(name, city)')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('subscription_invoices')
      .select('id, invoice_number, amount, status, due_date, paid_at, hospitals(name)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('subscription_invoices')
      .select('amount, status'),
  ])

  let mrr = 0
  activeSubs?.forEach((s: any) => { mrr += s.plans?.price_monthly ?? 0 })

  let totalPaid = 0, totalPending = 0
  invoiceStats?.forEach((inv: any) => {
    if (inv.status === 'paid')    totalPaid    += inv.amount ?? 0
    if (inv.status === 'pending') totalPending += inv.amount ?? 0
  })

  return {
    mrr,
    arr: mrr * 12,
    totalPaid,
    totalPending,
    activeSubs: (activeSubs ?? []) as any[],
    recentInvoices: (recentInvoices ?? []) as any[],
  }
}

export default async function RevenuePage() {
  const data = await getRevenueData()

  const STATUS_BADGE: Record<string, string> = {
    paid:    'bg-green-50 text-green-700 ring-1 ring-green-200',
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    overdue: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    void:    'bg-slate-100 text-slate-500',
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Revenue
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Subscription billing overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue (MRR)', value: formatINR(data.mrr),          icon: TrendingUp,   iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50'  },
          { label: 'Annual Revenue (ARR)',  value: formatINR(data.arr),          icon: ArrowUpRight, iconColor: 'text-blue-600',    iconBg: 'bg-blue-50'     },
          { label: 'Total Collected',       value: formatINR(data.totalPaid),    icon: DollarSign,   iconColor: 'text-violet-600',  iconBg: 'bg-violet-50'   },
          { label: 'Pending Amount',        value: formatINR(data.totalPending), icon: DollarSign,   iconColor: 'text-amber-600',   iconBg: 'bg-amber-50'    },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-500">{card.label}</p>
              <div className={`rounded-lg p-1.5 ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <p
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Active Subscriptions ({data.activeSubs.length})</h2>
        </div>
        {data.activeSubs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No active subscriptions</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Renews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.activeSubs.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{sub.hospitals?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{sub.hospitals?.city}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{sub.plans?.name}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                    {formatINR(sub.plans?.price_monthly ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(sub.current_period_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Invoices</h2>
        </div>
        {data.recentInvoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No invoices yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{inv.hospitals?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatINR(inv.amount ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[inv.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
