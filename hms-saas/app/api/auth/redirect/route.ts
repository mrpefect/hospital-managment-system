import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', APP_URL))
  }

  // Super admin takes priority
  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (superAdmin) {
    return NextResponse.redirect(new URL('/super-admin/dashboard', APP_URL))
  }

  // Check for existing profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()

  // No profile → start onboarding wizard
  if (!profile) {
    return NextResponse.redirect(new URL('/onboarding', APP_URL))
  }

  // Get hospital status
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('onboarding_status')
    .eq('id', profile.hospital_id)
    .single()

  const status = hospital?.onboarding_status

  if (status === 'approved') {
    return NextResponse.redirect(new URL('/app/dashboard', APP_URL))
  }

  if (status === 'suspended') {
    return NextResponse.redirect(new URL('/suspended', APP_URL))
  }

  if (status === 'terminated') {
    return NextResponse.redirect(new URL('/terminated', APP_URL))
  }

  // For pending/in_review: check if wizard was submitted
  const { data: onboarding } = await supabase
    .from('hospital_onboarding')
    .select('submitted_for_review_at')
    .eq('hospital_id', profile.hospital_id)
    .single()

  // Not yet submitted → resume wizard
  if (!onboarding?.submitted_for_review_at) {
    return NextResponse.redirect(new URL('/onboarding', APP_URL))
  }

  // Submitted but awaiting approval / rejected
  return NextResponse.redirect(new URL('/onboarding/pending', APP_URL))
}
