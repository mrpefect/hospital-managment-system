import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalShell } from '@/components/portal/PortalShell'

const SPECIALIZED_ROLES = ['hospital_admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacist']

const NAV = [
  { href: '/staff-portal/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
]

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, designation, hospital_id, hospitals(id, name, onboarding_status)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Redirect specialized roles to their own portals
  if (SPECIALIZED_ROLES.includes(profile.role)) {
    if (profile.role === 'hospital_admin') redirect('/app/dashboard')
    if (profile.role === 'doctor') redirect('/doctor/dashboard')
    if (profile.role === 'receptionist') redirect('/receptionist/dashboard')
    if (profile.role === 'lab_technician') redirect('/lab/dashboard')
    if (profile.role === 'pharmacist') redirect('/pharmacist/dashboard')
  }

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
      accentColor="#64748b"
      gradientFrom="#1e293b"
      gradientTo="#475569"
    >
      {children}
    </PortalShell>
  )
}
