import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewInvoiceForm } from './NewInvoiceForm'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ patient_id?: string; appointment_id?: string }>
}) {
  const { patient_id, appointment_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('hospital_id').eq('auth_user_id', user.id).single()
  if (!profile?.hospital_id) redirect('/onboarding')

  // Load service catalog for line-item suggestions
  const { data: services } = await supabase
    .from('service_catalog')
    .select('id, name, code, rate, tax_percent, unit')
    .eq('hospital_id', profile.hospital_id)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(200)

  // Pre-fill patient if provided
  let prefillPatient: { id: string; full_name: string; mrn: string } | null = null
  if (patient_id) {
    const { data: p } = await supabase
      .from('patients')
      .select('id, full_name, mrn')
      .eq('id', patient_id)
      .eq('hospital_id', profile.hospital_id)
      .single()
    if (p) prefillPatient = p
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          New Invoice
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a billing invoice for a patient visit or service.
        </p>
      </div>
      <NewInvoiceForm
        services={services ?? []}
        prefillPatient={prefillPatient}
        prefillAppointmentId={appointment_id ?? null}
      />
    </div>
  )
}
