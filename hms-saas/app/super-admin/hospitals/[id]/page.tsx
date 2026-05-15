import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { HospitalDetailClient } from '@/components/super-admin/HospitalDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getHospitalDetail(id: string) {
  const supabase = await createClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select(`
      id, name, slug, legal_name,
      address_line1, address_line2, city, state, pincode, country,
      phone, email, website, registration_number, total_beds,
      type, onboarding_status, created_at, updated_at
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!hospital) return null

  const [
    { data: onboarding },
    { data: notes },
    { data: subscription },
    { data: staffCount },
    { data: patientCount },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from('hospital_onboarding')
      .select('*')
      .eq('hospital_id', id)
      .single(),
    supabase
      .from('onboarding_notes')
      .select('id, note, is_internal, created_at, author_type, author_id')
      .eq('hospital_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('subscriptions')
      .select('id, status, current_period_start, current_period_end, plan_id, plans(name, price_monthly, max_beds, max_doctors, max_staff)')
      .eq('hospital_id', id)
      .eq('status', 'active')
      .single(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', id)
      .eq('is_active', true),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', id)
      .is('deleted_at', null),
    supabase
      .from('platform_audit_logs')
      .select('id, action, created_at, new_values, old_values, actor_type')
      .eq('resource_id', id)
      .eq('resource_type', 'hospital')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return {
    hospital: hospital as any,
    onboarding: onboarding as any,
    notes: notes ?? [],
    subscription: subscription as any,
    staffCount: (staffCount as any)?.count ?? 0,
    patientCount: (patientCount as any)?.count ?? 0,
    auditLogs: auditLogs ?? [],
  }
}

export default async function HospitalDetailPage({ params }: PageProps) {
  const { id } = await params
  const data = await getHospitalDetail(id)
  if (!data) notFound()

  return <HospitalDetailClient data={data} />
}
