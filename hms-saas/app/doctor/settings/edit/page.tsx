import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditDoctorProfileForm } from './EditDoctorProfileForm'

export default async function EditDoctorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('specialization, qualification, registration_number, years_of_experience, consultation_fee, consultation_duration_min, bio')
    .eq('profile_id', profile.id)
    .single()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
        Edit Profile
      </h1>
      <p className="text-sm text-slate-500 mb-8">Update your professional information</p>

      <EditDoctorProfileForm
        initial={{
          full_name:                 profile.full_name ?? '',
          phone:                     profile.phone ?? '',
          specialization:            doctorProf?.specialization ?? '',
          qualification:             doctorProf?.qualification ?? '',
          registration_number:       doctorProf?.registration_number ?? '',
          years_of_experience:       doctorProf?.years_of_experience ?? 0,
          consultation_fee:          doctorProf?.consultation_fee ?? 0,
          consultation_duration_min: doctorProf?.consultation_duration_min ?? 20,
          bio:                       doctorProf?.bio ?? '',
        }}
      />
    </div>
  )
}
