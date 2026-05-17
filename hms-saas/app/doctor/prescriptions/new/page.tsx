import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrescriptionForm } from './PrescriptionForm'

function calcAge(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string }>
}) {
  const { patient_id } = await searchParams
  if (!patient_id) redirect('/doctor/patients')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, mrn, gender, date_of_birth')
    .eq('id', patient_id)
    .eq('hospital_id', profile.hospital_id)
    .is('deleted_at', null)
    .single()

  if (!patient) notFound()

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
        Write Prescription
      </h1>
      <p className="text-sm text-slate-500 mb-8">Fill in the details and print when done</p>

      <PrescriptionForm
        patient={{
          id:        patient.id,
          full_name: patient.full_name,
          mrn:       patient.mrn,
          age:       calcAge(patient.date_of_birth),
          gender:    patient.gender,
        }}
        defaultDate={today}
      />
    </div>
  )
}
