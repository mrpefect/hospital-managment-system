'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AvailabilitySlot {
  day_of_week: number  // 0=Sun, 1=Mon … 6=Sat
  is_available: boolean
  start_time: string   // 'HH:MM'
  end_time: string     // 'HH:MM'
}

export async function saveMyAvailability(slots: AvailabilitySlot[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') throw new Error('Not a doctor')

  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  if (!doctorProf) throw new Error('Doctor profile not found')

  const rows = slots.map(s => ({
    doctor_profile_id: doctorProf.id,
    hospital_id:       profile.hospital_id,
    day_of_week:       s.day_of_week,
    is_available:      s.is_available,
    start_time:        s.start_time + ':00',
    end_time:          s.end_time + ':00',
  }))

  const { error } = await supabase
    .from('doctor_availability')
    .upsert(rows, { onConflict: 'doctor_profile_id,day_of_week' })

  if (error) throw new Error(error.message)

  revalidatePath('/doctor/availability')
  revalidatePath('/doctor/dashboard')
}
