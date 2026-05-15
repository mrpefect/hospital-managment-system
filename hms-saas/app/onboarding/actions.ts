'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    + '-' + Date.now().toString(36)
}

// Step 1 — create hospital + profile record
export async function createHospital(data: {
  name: string
  type: string
  phone: string
  email: string
  city: string
  state: string
  pincode?: string
  registration_number?: string
  total_beds?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()

  // Create hospital (onboarding trigger auto-creates hospital_onboarding row)
  const { data: hospital, error: hErr } = await admin
    .from('hospitals')
    .insert({
      slug:                generateSlug(data.name),
      name:                data.name,
      type:                data.type,
      phone:               data.phone,
      email:               data.email,
      city:                data.city,
      state:               data.state,
      pincode:             data.pincode             || null,
      registration_number: data.registration_number || null,
      total_beds:          data.total_beds           ?? 0,
      onboarding_status:   'pending',
    })
    .select('id')
    .single()

  if (hErr) throw new Error(hErr.message)

  // Create profile for the registering user
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .insert({
      auth_user_id: user.id,
      hospital_id:  hospital.id,
      full_name:    (user.user_metadata?.full_name as string) || user.email!.split('@')[0],
      email:        user.email!,
      role:         'hospital_admin',
    })
    .select('id')
    .single()

  if (pErr) throw new Error(pErr.message)

  // Mark step 1 complete + store admin profile id
  await admin
    .from('hospital_onboarding')
    .update({
      step1_completed:    true,
      step1_completed_at: new Date().toISOString(),
      admin_profile_id:   profile.id,
    })
    .eq('hospital_id', hospital.id)

  return { hospitalId: hospital.id, profileId: profile.id }
}

// Step 2 — save selected plan + billing cycle
export async function savePlanSelection(hospitalId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
  const admin = createAdminClient()

  const { error } = await admin
    .from('hospital_onboarding')
    .update({
      step2_completed:    true,
      step2_completed_at: new Date().toISOString(),
      selected_plan_id:   planId,
      billing_cycle:      billingCycle,
    })
    .eq('hospital_id', hospitalId)

  if (error) throw new Error(error.message)
}

// Step 3 — update admin profile details
export async function saveAdminProfile(profileId: string, hospitalId: string, data: {
  full_name: string
  phone?: string
  designation?: string
}) {
  const admin = createAdminClient()

  await admin
    .from('profiles')
    .update({
      full_name:   data.full_name,
      phone:       data.phone       || null,
      designation: data.designation || null,
    })
    .eq('id', profileId)

  await admin
    .from('hospital_onboarding')
    .update({
      step3_completed:    true,
      step3_completed_at: new Date().toISOString(),
    })
    .eq('hospital_id', hospitalId)
}

// Step 4 — submit for review (documents optional, submitted via separate upload)
export async function submitForReview(hospitalId: string) {
  const admin = createAdminClient()

  await admin
    .from('hospital_onboarding')
    .update({
      step4_completed:         true,
      step4_completed_at:      new Date().toISOString(),
      submitted_for_review_at: new Date().toISOString(),
    })
    .eq('hospital_id', hospitalId)

  const { error } = await admin
    .from('hospitals')
    .update({ onboarding_status: 'in_review' })
    .eq('id', hospitalId)

  if (error) throw new Error(error.message)
}
