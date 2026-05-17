import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserSquare2, Building2, Phone, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StaffDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, designation, hospital_id, hospitals(id, name, phone, email, address)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  const hospital = profile.hospitals as any

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel = profile.role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase())

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-slate-900 mb-1"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Good {getGreeting()}!
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

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden mb-6 max-w-2xl">
        <div
          className="px-6 py-8 flex flex-col sm:flex-row items-center sm:items-start gap-5"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)' }}
        >
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {initials}
          </div>
          <div>
            <h2
              className="text-xl font-bold text-white mb-1"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {profile.full_name}
            </h2>
            {profile.designation && (
              <p className="text-sm text-white/70 mb-2">{profile.designation}</p>
            )}
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          {profile.email && (
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'rgba(100,116,139,0.08)' }}
              >
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <span className="text-sm text-slate-600">{profile.email}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'rgba(100,116,139,0.08)' }}
              >
                <Phone className="h-4 w-4 text-slate-400" />
              </div>
              <span className="text-sm text-slate-600">{profile.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hospital info card */}
      {hospital && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(100,116,139,0.08)' }}
            >
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <h3
                className="text-sm font-bold text-slate-800"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                {hospital.name}
              </h3>
              <p className="text-xs text-slate-400">Your Hospital</p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-2">
            {hospital.phone && (
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">Phone:</span> {hospital.phone}
              </p>
            )}
            {hospital.email && (
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">Email:</span> {hospital.email}
              </p>
            )}
            {hospital.address && (
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">Address:</span> {hospital.address}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
