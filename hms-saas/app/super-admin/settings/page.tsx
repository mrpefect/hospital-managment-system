import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('super_admins')
    .select('id, full_name, email, role, created_at')
    .eq('auth_user_id', user.id)
    .single()
  return data
}

export default async function SettingsPage() {
  const admin = await getAdmin()

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform configuration</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Admin Profile</h2>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Name',         value: admin?.full_name },
            { label: 'Email',        value: admin?.email     },
            { label: 'Role',         value: admin?.role      },
            { label: 'Member since', value: admin?.created_at
                ? new Date(admin.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="text-xs text-slate-400 w-32">{label}</span>
              <span className="text-slate-700">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Platform Info</h2>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Version',      value: '1.0.0'                     },
            { label: 'Environment',  value: process.env.NODE_ENV        },
            { label: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '').split('.')[0] + '…' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="text-xs text-slate-400 w-32">{label}</span>
              <code className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 text-xs">{value}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 bg-red-50 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-xs text-slate-500 mb-4">Destructive actions. Contact your infrastructure team.</p>
        <div className="space-y-2 text-xs text-slate-500">
          <p>• Database migrations: run via Supabase dashboard</p>
          <p>• Seed data: run <code className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-xs">npm run seed</code></p>
          <p>• Environment variables: update in .env.local or deployment platform</p>
        </div>
      </div>
    </div>
  )
}
