'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCurrentAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: admin } = await supabase
    .from('super_admins')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) throw new Error('Unauthorized')
  return admin
}

export async function updateHospitalStatus(
  hospitalId: string,
  status: 'approved' | 'suspended' | 'terminated' | 'in_review' | 'rejected',
  reason?: string
) {
  const admin  = await getCurrentAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('hospitals')
    .update({ onboarding_status: status, updated_at: new Date().toISOString() })
    .eq('id', hospitalId)

  if (error) throw new Error(error.message)

  // Audit log
  await supabase.from('platform_audit_logs').insert({
    actor_id:    admin.id,
    actor_type:  'super_admin',
    action:      `hospital.status.${status}`,
    resource_type: 'hospital',
    resource_id: hospitalId,
    new_values:  { status, reason },
  })

  revalidatePath('/super-admin/hospitals')
  revalidatePath(`/super-admin/hospitals/${hospitalId}`)
}

export async function addOnboardingNote(hospitalId: string, note: string, isInternal = true) {
  const admin  = await getCurrentAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('onboarding_notes').insert({
    hospital_id:  hospitalId,
    author_id:    admin.id,
    author_type:  'super_admin',
    note,
    is_internal:  isInternal,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/hospitals/${hospitalId}`)
}
