import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalShell } from '@/components/portal/PortalShell'

const NAV = [
  { href: '/doctor/dashboard',    label: 'Dashboard',       icon: 'LayoutDashboard' },
  { href: '/doctor/appointments', label: 'My Appointments', icon: 'CalendarDays'    },
  { href: '/doctor/patients',     label: 'Patients',        icon: 'Users'           },
  { href: '/doctor/prescriptions', label: 'Prescriptions',   icon: 'FileText'        },
  { href: '/doctor/availability', label: 'Availability',    icon: 'Clock'           },
  { href: '/doctor/settings',     label: 'Settings',        icon: 'Settings'        },
]

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, designation, hospital_id, hospitals(id, name, onboarding_status)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'doctor') redirect('/login')

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
      accentColor="#7c3aed"
      gradientFrom="#3b0764"
      gradientTo="#7c3aed"
    >
      {children}
    </PortalShell>
  )
}
