import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalShell } from '@/components/portal/PortalShell'

const NAV = [
  { href: '/lab/dashboard', label: 'Dashboard',  icon: 'LayoutDashboard' },
  { href: '/lab/orders',    label: 'Lab Orders', icon: 'FlaskConical'    },
]

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, designation, hospital_id, hospitals(id, name, onboarding_status)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'lab_technician') redirect('/login')

  const hospital = profile.hospitals as any

  if (!hospital || hospital.onboarding_status !== 'approved') {
    if (hospital?.onboarding_status === 'suspended') redirect('/suspended')
    if (hospital?.onboarding_status === 'terminated') redirect('/terminated')
    redirect('/onboarding/pending')
  }

  return (
    <PortalShell
      profile={{
        full_name:   profile.full_name,
        email:       profile.email,
        role:        profile.role,
        designation: profile.designation,
      }}
      hospital={{ name: hospital.name }}
      nav={NAV}
      accentColor="#d97706"
      gradientFrom="#78350f"
      gradientTo="#d97706"
    >
      {children}
    </PortalShell>
  )
}
