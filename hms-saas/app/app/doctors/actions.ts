'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let pwd = ''
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

export async function createDoctor(data: {
  full_name: string
  email: string
  phone?: string
  specialization: string
  qualification?: string
  registration_number?: string
  years_of_experience: number
  consultation_fee: number
  consultation_duration_min: number
  bio?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!callerProfile) throw new Error('Profile not found')

  const admin = createAdminClient()

  // 1. Create auth user with a random password; email already confirmed
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    password: generatePassword(),
    email_confirm: true,
    user_metadata: { full_name: data.full_name.trim() },
  })
  if (authError) throw new Error(authError.message)

  const authUserId = authData.user.id

  // 2. Insert into profiles
  const { data: newProfile, error: profileError } = await admin
    .from('profiles')
    .insert({
      auth_user_id: authUserId,
      hospital_id:  callerProfile.hospital_id,
      full_name:    data.full_name.trim(),
      email:        data.email.trim().toLowerCase(),
      phone:        data.phone || null,
      role:         'doctor',
    })
    .select('id')
    .single()

  if (profileError) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(authUserId)
    throw new Error(profileError.message)
  }

  // 3. Insert into doctor_profiles
  const { data: newDoctor, error: doctorError } = await admin
    .from('doctor_profiles')
    .insert({
      hospital_id:              callerProfile.hospital_id,
      profile_id:               newProfile.id,
      specialization:           data.specialization.trim(),
      qualification:            data.qualification || null,
      registration_number:      data.registration_number || null,
      years_of_experience:      data.years_of_experience,
      consultation_fee:         data.consultation_fee,
      consultation_duration_min: data.consultation_duration_min,
      bio:                      data.bio || null,
      is_available_today:       true,
    })
    .select('id')
    .single()

  if (doctorError) {
    // Rollback profile and auth user
    await admin.from('profiles').delete().eq('id', newProfile.id)
    await admin.auth.admin.deleteUser(authUserId)
    throw new Error(doctorError.message)
  }

  revalidatePath('/app/doctors')
  return { profileId: newProfile.id, doctorId: newDoctor.id }
}
