import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserCircle, KeyRound, ChevronRight } from 'lucide-react'

export default async function DoctorSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const ITEMS = [
    {
      href: '/doctor/settings/edit',
      icon: UserCircle,
      title: 'Edit Profile',
      desc: 'Update your name, specialization, fee, and professional details',
    },
    {
      href: '/doctor/settings/password',
      icon: KeyRound,
      title: 'Change Password',
      desc: 'Update your login password',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
        Settings
      </h1>
      <p className="text-sm text-slate-500 mb-8">Manage your account and profile</p>

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 mb-6 flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
        >
          {initials}
        </div>
        <div>
          <p className="font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>{profile.full_name}</p>
          <p className="text-sm text-slate-400">{profile.email}</p>
        </div>
      </div>

      {/* Setting links */}
      <div className="space-y-3">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-purple-300 transition-colors group"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(124,58,237,0.08)' }}
            >
              <item.icon className="h-5 w-5" style={{ color: '#7c3aed' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                {item.title}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-purple-400 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
