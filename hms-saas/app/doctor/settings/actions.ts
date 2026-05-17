'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateDoctorProfile(data: {
  full_name: string
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) throw new Error('Profile not found')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name.trim(),
      phone:     data.phone || null,
    })
    .eq('id', profile.id)

  if (profileError) throw new Error(profileError.message)

  const { error: doctorError } = await supabase
    .from('doctor_profiles')
    .update({
      specialization:            data.specialization,
      qualification:             data.qualification || null,
      registration_number:       data.registration_number || null,
      years_of_experience:       data.years_of_experience,
      consultation_fee:          data.consultation_fee,
      consultation_duration_min: data.consultation_duration_min,
      bio:                       data.bio || null,
    })
    .eq('profile_id', profile.id)

  if (doctorError) throw new Error(doctorError.message)

  revalidatePath('/doctor/settings')
  revalidatePath('/doctor/dashboard')
}
