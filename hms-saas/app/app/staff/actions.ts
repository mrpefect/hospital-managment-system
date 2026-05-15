'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function generateTempPassword() {
  return Math.random().toString(36).slice(-10) + 'A1!'
}

export async function createStaffMember(data: {
  full_name: string
  email: string
  role: string
  phone?: string
  designation?: string
  department_id?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!callerProfile) throw new Error('Profile not found')

  const admin = createAdminClient()

  // 1. Create auth user with a temporary password
  const tempPassword = generateTempPassword()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name.trim(),
    },
  })

  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Failed to create auth user')

  // 2. Insert profile record
  const { data: newProfile, error: profileError } = await admin
    .from('profiles')
    .insert({
      auth_user_id:  authData.user.id,
      hospital_id:   callerProfile.hospital_id,
      full_name:     data.full_name.trim(),
      email:         data.email.trim().toLowerCase(),
      phone:         data.phone?.trim() || null,
      role:          data.role,
      designation:   data.designation?.trim() || null,
      department_id: data.department_id || null,
      is_active:     true,
    })
    .select('id')
    .single()

  if (profileError) {
    // Clean up the auth user if profile insert fails
    await admin.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  revalidatePath('/app/staff')
  return { profileId: newProfile.id }
}
