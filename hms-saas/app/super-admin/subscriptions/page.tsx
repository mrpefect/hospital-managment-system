import { createClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getSubscriptions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, hospitals(id, name, city), plans(name, price_monthly)')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as any[]
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-50 text-green-700 ring-1 ring-green-200',
  trialing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  past_due: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  canceled: 'bg-slate-100 text-slate-500',
  unpaid:   'bg-red-50 text-red-700 ring-1 ring-red-200',
}

export default async function SubscriptionsPage() {
  const subs = await getSubscriptions()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Subscriptions
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{subs.length} total</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No subscriptions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Renews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{sub.hospitals?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{sub.hospitals?.city}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{sub.plans?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(sub.plans?.price_monthly ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {sub.status}
                      {sub.cancel_at_period_end && (
                        <span className="ml-1 text-slate-400">(cancels)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(sub.current_period_start)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(sub.current_period_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
