import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewAppointmentForm } from './NewAppointmentForm'

export const dynamic = 'force-dynamic'

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string }>
}) {
  const { patient_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id

  // Load doctors for this hospital
  const { data: doctors } = await supabase
    .from('doctor_profiles')
    .select('id, specialization, consultation_fee, consultation_duration_min, profiles!doctor_profiles_profile_id_fkey(full_name)')
    .eq('hospital_id', hid)
    .eq('is_available_today', true)
    .order('id')

  // Pre-fill patient if patient_id provided
  let prefillPatient = null
  if (patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, mrn')
      .eq('id', patient_id)
      .eq('hospital_id', hid)
      .is('deleted_at', null)
      .single()
    prefillPatient = patient ?? null
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          New Appointment
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Schedule an appointment for a patient with a doctor.
        </p>
      </div>
      <NewAppointmentForm
        prefillPatient={prefillPatient}
        doctors={(doctors ?? []) as any}
      />
    </div>
  )
}
