import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getAnalytics() {
  const supabase = await createClient()

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    { data: hospitalsByMonth },
    { data: hospitalsByState },
    { data: hospitalsByType },
    { data: planDist },
  ] = await Promise.all([
    supabase
      .from('hospitals')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', start.toISOString()),
    supabase
      .from('hospitals')
      .select('state')
      .is('deleted_at', null),
    supabase
      .from('hospitals')
      .select('hospital_type')
      .is('deleted_at', null),
    supabase
      .from('subscriptions')
      .select('plan_id, plans(name)')
      .eq('status', 'active'),
  ])

  // Group by month
  const monthMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    monthMap[key] = 0
  }
  hospitalsByMonth?.forEach((h) => {
    const d = new Date(h.created_at)
    const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    if (key in monthMap) monthMap[key]++
  })

  // Group by state
  const stateMap: Record<string, number> = {}
  hospitalsByState?.forEach((h) => {
    if (!h.state) return
    stateMap[h.state] = (stateMap[h.state] ?? 0) + 1
  })
  const topStates = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Group by type
  const typeMap: Record<string, number> = {}
  hospitalsByType?.forEach((h) => {
    if (!h.hospital_type) return
    typeMap[h.hospital_type] = (typeMap[h.hospital_type] ?? 0) + 1
  })

  // Plan distribution
  const planMap: Record<string, number> = {}
  planDist?.forEach((s: any) => {
    const name = s.plans?.name ?? 'Unknown'
    planMap[name] = (planMap[name] ?? 0) + 1
  })

  return { monthMap, topStates, typeMap, planMap }
}

export default async function AnalyticsPage() {
  const { monthMap, topStates, typeMap, planMap } = await getAnalytics()

  const maxMonthVal = Math.max(...Object.values(monthMap), 1)
  const totalStates = topStates.reduce((a, [, v]) => a + v, 0) || 1
  const totalPlan   = Object.values(planMap).reduce((a, v) => a + v, 0) || 1

  const PLAN_COLORS: Record<string, string> = {
    Starter:    'bg-brand',
    Growth:     'bg-emerald-500',
    Enterprise: 'bg-violet-500',
    Custom:     'bg-amber-500',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform growth overview</p>
      </div>

      {/* Growth chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Hospital Registrations (6 months)</h2>
        <div className="flex items-end gap-3 h-40">
          {Object.entries(monthMap).map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">{count}</span>
              <div
                className="w-full rounded-t-md bg-brand transition-all"
                style={{ height: `${Math.max((count / maxMonthVal) * 120, count > 0 ? 4 : 0)}px` }}
              />
              <span className="text-[10px] text-slate-400">{month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By State */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">By State</h2>
          <div className="space-y-3">
            {topStates.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet</p>
            ) : topStates.map(([state, count]) => (
              <div key={state}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-700">{state}</span>
                  <span className="text-xs text-slate-500">{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(count / totalStates) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Plan Distribution</h2>
          <div className="space-y-3">
            {Object.keys(planMap).length === 0 ? (
              <p className="text-sm text-slate-500">No active subscriptions</p>
            ) : Object.entries(planMap).map(([plan, count]) => (
              <div key={plan}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-700">{plan}</span>
                  <span className="text-xs text-slate-500">{count} ({Math.round((count / totalPlan) * 100)}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${PLAN_COLORS[plan] ?? 'bg-slate-400'}`}
                    style={{ width: `${(count / totalPlan) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hospital Types */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Hospital Types</h2>
        <div className="flex flex-wrap gap-3">
          {Object.keys(typeMap).length === 0 ? (
            <p className="text-sm text-slate-500">No data yet</p>
          ) : Object.entries(typeMap).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-lg font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500">{type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
