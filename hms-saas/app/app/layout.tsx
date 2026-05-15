import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/hospital/AppShell'

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, designation, hospital_id, hospitals(id, name, onboarding_status)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const hospital = profile.hospitals as any

  if (!hospital || hospital.onboarding_status !== 'approved') {
    if (hospital?.onboarding_status === 'suspended') redirect('/suspended')
    if (hospital?.onboarding_status === 'terminated') redirect('/terminated')
    redirect('/onboarding/pending')
  }

  return (
    <AppShell
      profile={{
        full_name:   profile.full_name,
        email:       profile.email,
        role:        profile.role,
        designation: profile.designation,
      }}
      hospital={{ name: hospital.name }}
    >
      {children}
    </AppShell>
  )
}
