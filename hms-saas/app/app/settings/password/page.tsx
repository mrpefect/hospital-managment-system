import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Change Password
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Set a new password for your account.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}
