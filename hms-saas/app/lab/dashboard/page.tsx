import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlaskConical, Clock, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react'

export const dynamic = 'force-dynamic'

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

export default async function LabDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'lab_technician') redirect('/login')

  const hid = profile.hospital_id
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00`

  const [
    { count: todayCount },
    { count: pendingCount },
    { count: processingCount },
    { count: completedCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .gte('ordered_at', todayStart),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .in('status', ['pending_collection', 'collected']),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'processing'),

    supabase
      .from('lab_orders')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .eq('status', 'completed'),

    supabase
      .from('lab_orders')
      .select('id, order_number, status, urgency, ordered_at, patients(full_name, mrn)')
      .eq('hospital_id', hid)
      .order('ordered_at', { ascending: false })
      .limit(20),
  ])

  const stats = [
    {
      label: 'Today\'s Orders',
      value: todayCount ?? 0,
      icon: CalendarDays,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      sub: 'Received today',
    },
    {
      label: 'Pending',
      value: pendingCount ?? 0,
      icon: Clock,
      color: '#64748b',
      bg: 'rgba(100,116,139,0.08)',
      sub: 'Collection & processing',
    },
    {
      label: 'In Progress',
      value: processingCount ?? 0,
      icon: AlertCircle,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
      sub: 'Being processed',
    },
    {
      label: 'Completed',
      value: completedCount ?? 0,
      icon: CheckCircle2,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      sub: 'Results ready',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-slate-900 mb-1"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Lab Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent orders table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              Recent Lab Orders
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest 20 orders</p>
          </div>
          <FlaskConical className="h-4 w-4 text-slate-300" />
        </div>

        {!recentOrders?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <FlaskConical className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No lab orders found</p>
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
                {recentOrders.map((order: any) => {
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
