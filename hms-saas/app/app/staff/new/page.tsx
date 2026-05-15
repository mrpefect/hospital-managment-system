import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewStaffForm } from './NewStaffForm'

export const dynamic = 'force-dynamic'

export default async function NewStaffPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('hospital_id', profile.hospital_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Add Staff Member
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a new staff account. A temporary password will be generated and the account
          will be email-confirmed automatically.
        </p>
      </div>
      <NewStaffForm departments={departments ?? []} />
    </div>
  )
}
