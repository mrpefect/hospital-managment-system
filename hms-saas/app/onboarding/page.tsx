import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from './OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Block super admins
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (superAdmin) redirect('/super-admin/dashboard')

  // Fetch active plans
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, slug, description, price_monthly, price_yearly, max_beds, max_doctors, max_staff, max_patients, has_emr, has_pharmacy, has_lab, has_radiology, has_ot, has_icu')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('sort_order', { ascending: true })

  // Check if user already has a profile (mid-wizard or returning)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, full_name, phone, designation')
    .eq('auth_user_id', user.id)
    .single()

  let initialStep = 1
  let hospitalId: string | null = null
  let profileId: string | null = null
  let selectedPlanId: string | null = null
  let billingCycle: 'monthly' | 'yearly' = 'monthly'

  if (profile) {
    hospitalId = profile.hospital_id
    profileId  = profile.id

    // Load onboarding state to resume at the right step
    const { data: onboarding } = await supabase
      .from('hospital_onboarding')
      .select('step1_completed, step2_completed, step3_completed, step4_completed, submitted_for_review_at, selected_plan_id, billing_cycle')
      .eq('hospital_id', profile.hospital_id)
      .single()

    if (onboarding?.submitted_for_review_at) {
      redirect('/onboarding/pending')
    }

    if (onboarding?.step3_completed) initialStep = 4
    else if (onboarding?.step2_completed) initialStep = 3
    else if (onboarding?.step1_completed) initialStep = 2
    else initialStep = 1

    selectedPlanId = onboarding?.selected_plan_id ?? null
    billingCycle   = (onboarding?.billing_cycle as 'monthly' | 'yearly') ?? 'monthly'
  }

  return (
    <OnboardingWizard
      plans={(plans ?? []) as any[]}
      initialStep={initialStep}
      initialHospitalId={hospitalId}
      initialProfileId={profileId}
      initialSelectedPlanId={selectedPlanId}
      initialBillingCycle={billingCycle}
      userEmail={user.email ?? ''}
      userName={(user.user_metadata?.full_name as string) ?? ''}
    />
  )
}
