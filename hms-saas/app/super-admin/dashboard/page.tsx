import { createClient } from '@/lib/supabase/server'
import {
  Building2, Users, TrendingUp, Activity,
  Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

async function getPlatformStats() {
  const supabase = await createClient()

  const [
    { count: total },
    { count: approved },
    { count: pending },
    { count: suspended },
    { data: recentHospitals },
    { data: planBreakdown },
  ] = await Promise.all([
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).eq('onboarding_status', 'approved'),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).in('onboarding_status', ['pending', 'in_review']),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).eq('onboarding_status', 'suspended'),
    supabase.from('hospitals')
      .select('id, name, city, state, onboarding_status, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('subscriptions')
      .select('plan_id, plans(name, price_monthly)')
      .eq('status', 'active'),
  ])

  // Calculate MRR from active subscriptions
  let mrr = 0
  if (planBreakdown) {
    planBreakdown.forEach((sub: any) => {
      mrr += sub.plans?.price_monthly ?? 0
    })
  }

  return {
    totalHospitals: total ?? 0,
    approvedHospitals: approved ?? 0,
    pendingApprovals: pending ?? 0,
    suspendedHospitals: suspended ?? 0,
    mrr,
    arr: mrr * 12,
    recentHospitals: recentHospitals ?? [],
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',  ring: 'ring-1 ring-amber-200'  },
  in_review:  { label: 'In Review',  color: 'text-[#00437b]',  bg: 'bg-blue-50',   ring: 'ring-1 ring-blue-200'   },
  approved:   { label: 'Approved',   color: 'text-green-700',  bg: 'bg-green-50',  ring: 'ring-1 ring-green-200'  },
  suspended:  { label: 'Suspended',  color: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-1 ring-orange-200' },
  terminated: { label: 'Terminated', color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-1 ring-red-200'    },
  rejected:   { label: 'Rejected',   color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-1 ring-red-200'    },
}

const STATUS_DOT: Record<string, string> = {
  pending:    'bg-amber-500',
  in_review:  'bg-blue-600',
  approved:   'bg-green-600',
  suspended:  'bg-orange-500',
  terminated: 'bg-red-500',
  rejected:   'bg-red-500',
}

function formatINR(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default async function SuperAdminDashboard() {
  const stats = await getPlatformStats()

  const STAT_CARDS = [
    {
      label: 'Total Hospitals',
      value: stats.totalHospitals,
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#038bbf]',
      sub: `${stats.approvedHospitals} active`,
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      sub: 'Awaiting review',
      href: '/super-admin/hospitals?status=pending',
    },
    {
      label: 'Monthly Revenue',
      value: formatINR(stats.mrr),
      icon: TrendingUp,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      sub: `ARR ${formatINR(stats.arr)}`,
    },
    {
      label: 'Suspended',
      value: stats.suspendedHospitals,
      icon: AlertCircle,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      sub: 'Need attention',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Platform Overview
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          href="/super-admin/hospitals/new"
          className="flex items-center gap-2 rounded-lg bg-brand hover:bg-[#0299d0] px-3.5 py-2 text-sm font-medium text-white transition-colors"
        >
          <Building2 className="h-4 w-4" />
          Add Hospital
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <div className={`rounded-lg p-1.5 ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <p
              className="mt-3 text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent hospitals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Hospitals</h2>
          <Link
            href="/super-admin/hospitals"
            className="text-xs text-brand hover:text-[#0299d0] transition-colors"
          >
            View all →
          </Link>
        </div>

        {stats.recentHospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">No hospitals yet</p>
            <Link
              href="/super-admin/hospitals/new"
              className="mt-3 text-xs text-brand hover:text-[#0299d0] transition-colors"
            >
              Add the first hospital →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentHospitals.map((h: any) => {
              const status = STATUS_CONFIG[h.onboarding_status] ?? STATUS_CONFIG.pending
              const dot = STATUS_DOT[h.onboarding_status] ?? STATUS_DOT.pending
              return (
                <Link
                  key={h.id}
                  href={`/super-admin/hospitals/${h.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
                    {h.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.city}, {h.state}</p>
                  </div>
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color} ${status.ring}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {status.label}
                  </span>
                  {/* Time */}
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(h.created_at)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/super-admin/hospitals?status=pending', icon: Clock,      label: 'Review pending',  desc: `${stats.pendingApprovals} awaiting`, iconBg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
          { href: '/super-admin/hospitals',                icon: Building2,  label: 'All hospitals',   desc: `${stats.totalHospitals} total`,      iconBg: 'bg-blue-50',   iconColor: 'text-brand'  },
          { href: '/super-admin/revenue',                  icon: TrendingUp, label: 'Revenue report',  desc: `MRR ${formatINR(stats.mrr)}`,        iconBg: 'bg-green-50',  iconColor: 'text-green-600'  },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 px-4 py-3.5 transition-all"
          >
            <div className={`rounded-lg p-2 shrink-0 ${action.iconBg}`}>
              <action.icon className={`h-5 w-5 ${action.iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{action.label}</p>
              <p className="text-xs text-slate-500">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
