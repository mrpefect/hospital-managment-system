import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditHospitalForm } from './EditHospitalForm'

export const dynamic = 'force-dynamic'

export default async function EditHospitalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')
  if (profile.role !== 'hospital_admin') redirect('/app/settings')

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('name, legal_name, phone, email, website, registration_number, total_beds, address_line1, address_line2, city, state, pincode')
    .eq('id', profile.hospital_id)
    .single()

  if (!hospital) redirect('/app/settings')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Edit Hospital Information
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Update your hospital profile, contact details, and address.
        </p>
      </div>
      <EditHospitalForm hospital={hospital} />
    </div>
  )
}
