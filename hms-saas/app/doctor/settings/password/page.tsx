import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function DoctorChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
        Change Password
      </h1>
      <p className="text-sm text-slate-500 mb-8">Choose a strong password to keep your account secure</p>
      <ChangePasswordForm />
    </div>
  )
}
