import { createClient } from '@/lib/supabase/server'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getAuditLogs(page = 1) {
  const supabase = await createClient()
  const PAGE_SIZE = 50
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data, count } = await supabase
    .from('platform_audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  return { logs: data ?? [], total: count ?? 0, page, pageCount: Math.ceil((count ?? 0) / PAGE_SIZE) }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_COLORS: Record<string, string> = {
  'hospital.status.approved':   'text-green-600 font-medium',
  'hospital.status.suspended':  'text-orange-600 font-medium',
  'hospital.status.terminated': 'text-red-600 font-medium',
  'hospital.status.rejected':   'text-red-600 font-medium',
}

export default async function ActivityPage() {
  const { logs, total } = await getAuditLogs()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Platform Activity
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} audit log entries</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Activity className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No activity yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={ACTION_COLORS[log.action] ?? 'text-slate-900 font-medium'}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-xs">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="ml-1.5 text-slate-400 text-xs">{String(log.resource_id).slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.actor_type}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
