'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X, Check } from 'lucide-react'
import { upsertFeatureFlag, deleteFeatureFlag } from '@/app/super-admin/feature-flags/actions'
import { toast } from 'sonner'

const FEATURE_KEYS = [
  'pharmacy', 'laboratory', 'inventory', 'hr_payroll',
  'telemedicine', 'radiology', 'insurance', 'advanced_reports',
  'api_access', 'custom_branding',
]

interface Flag {
  id: string
  hospital_id: string
  feature_key: string
  is_enabled: boolean
  expires_at: string | null
  reason: string | null
  hospitals?: { name: string }
}

interface Props {
  flags: Flag[]
  hospitals: { id: string; name: string }[]
}

const EMPTY = {
  hospital_id: '', feature_key: FEATURE_KEYS[0], is_enabled: true,
  expires_at: '', reason: '',
}

export function FeatureFlagsClient({ flags: initialFlags, hospitals }: Props) {
  const [flags, setFlags]             = useState(initialFlags)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ ...EMPTY })
  const [isPending, startTransition]  = useTransition()

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.hospital_id) { toast.error('Select a hospital'); return }
    startTransition(async () => {
      try {
        await upsertFeatureFlag({
          hospital_id: form.hospital_id,
          feature_key: form.feature_key,
          is_enabled:  form.is_enabled,
          expires_at:  form.expires_at || null,
          reason:      form.reason || null,
        })
        toast.success('Feature flag created')
        setShowForm(false)
        setForm({ ...EMPTY })
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteFeatureFlag(id)
        setFlags(fs => fs.filter(f => f.id !== id))
        toast.success('Flag deleted')
      } catch {
        toast.error('Delete failed')
      }
    })
  }

  function handleToggle(flag: Flag) {
    startTransition(async () => {
      try {
        await upsertFeatureFlag({ ...flag, is_enabled: !flag.is_enabled })
        setFlags(fs => fs.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f))
      } catch {
        toast.error('Toggle failed')
      }
    })
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Feature Flags</h1>
          <p className="text-sm text-slate-500 mt-0.5">Per-hospital feature overrides</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-3.5 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> New Override
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {flags.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500">No feature flag overrides yet</p>
            <p className="text-xs text-slate-400 mt-1">Overrides take precedence over plan defaults</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Feature</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reason</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flags.map((flag) => (
                <tr key={flag.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-900">{flag.hospitals?.name ?? flag.hospital_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <code className="bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-xs font-mono">{flag.feature_key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(flag)}
                      disabled={isPending}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        flag.is_enabled
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${flag.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(flag.expires_at)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{flag.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(flag.id)}
                      disabled={isPending}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">New Feature Override</h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Hospital *</label>
                <select
                  required
                  value={form.hospital_id}
                  onChange={e => set('hospital_id', e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                >
                  <option value="">Select hospital…</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Feature Key *</label>
                <select
                  value={form.feature_key}
                  onChange={e => set('feature_key', e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                >
                  {FEATURE_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={e => set('is_enabled', e.target.checked)}
                  className="rounded"
                />
                Enable this feature
              </label>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Expires At (optional)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => set('expires_at', e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Reason (optional)</label>
                <input
                  value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  placeholder="Trial period, promo…"
                  className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {isPending ? 'Saving…' : 'Create Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
