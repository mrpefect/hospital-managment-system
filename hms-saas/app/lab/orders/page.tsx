import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlaskConical } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_TABS = [
  { key: 'all',                label: 'All' },
  { key: 'pending_collection', label: 'Pending' },
  { key: 'processing',         label: 'In Progress' },
  { key: 'completed',          label: 'Completed' },
  { key: 'cancelled',          label: 'Cancelled' },
]

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  pending_collection: { label: 'Pending Collection', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  collected:          { label: 'Collected',           color: '#038bbf', bg: 'rgba(3,139,191,0.1)'   },
  processing:         { label: 'Processing',          color: '#d97706', bg: 'rgba(217,119,6,0.1)'   },
  completed:          { label: 'Completed',           color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  cancelled:          { label: 'Cancelled',           color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
}

const urgencyStyle: Record<string, { label: string; color: string; bg: string }> = {
  routine: { label: 'Routine', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  urgent:  { label: 'Urgent',  color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  stat:    { label: 'STAT',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
}

export default async function LabOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'lab_technician') redirect('/login')

  const params = await searchParams
  const statusFilter = params.status && params.status !== 'all' ? params.status : null

  let query = supabase
    .from('lab_orders')
    .select('id, order_number, status, urgency, ordered_at, patients(full_name, mrn)')
    .eq('hospital_id', profile.hospital_id)
    .order('ordered_at', { ascending: false })

  if (statusFilter) {
    // Handle pending which covers two statuses
    if (statusFilter === 'pending_collection') {
      query = query.in('status', ['pending_collection', 'collected'])
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  const { data: orders } = await query

  const activeTab = params.status ?? 'all'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Lab Orders
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {orders?.length ?? 0} order{(orders?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <a
              key={tab.key}
              href={`/lab/orders?status=${tab.key}`}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
              style={
                isActive
                  ? { background: '#d97706', color: '#fff' }
                  : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }
              }
            >
              {tab.label}
            </a>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!orders?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <FlaskConical className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ordered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order: any) => {
                  const patient = order.patients as any
                  const ss = statusStyle[order.status] ?? statusStyle.pending_collection
                  const us = urgencyStyle[order.urgency] ?? urgencyStyle.routine
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700">
                        {order.order_number ?? order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{patient?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">MRN: {patient?.mrn ?? '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: ss.bg, color: ss.color }}
                        >
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: us.bg, color: us.color }}
                        >
                          {us.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {order.ordered_at
                          ? new Date(order.ordered_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
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
