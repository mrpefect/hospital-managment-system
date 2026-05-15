'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createAppointment(data: {
  patient_id: string
  doctor_id: string
  appointment_date: string
  start_time: string
  appointment_type: 'opd' | 'ipd' | 'emergency' | 'follow_up' | 'teleconsult'
  visit_type: 'new' | 'follow_up' | 'review'
  chief_complaint?: string
  consultation_fee?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) throw new Error('Profile not found')

  const admin = createAdminClient()

  // Fetch doctor's consultation_duration_min to compute end_time
  const { data: doctorProfile } = await admin
    .from('doctor_profiles')
    .select('consultation_duration_min, consultation_fee')
    .eq('id', data.doctor_id)
    .single()

  const durationMin = doctorProfile?.consultation_duration_min ?? 20

  // Compute end_time = start_time + durationMin
  const [startHour, startMin] = data.start_time.split(':').map(Number)
  const startTotalMin = startHour * 60 + startMin
  const endTotalMin = startTotalMin + durationMin
  const endHour = Math.floor(endTotalMin / 60) % 24
  const endMin = endTotalMin % 60
  const end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`

  const fee =
    data.consultation_fee != null
      ? data.consultation_fee
      : doctorProfile?.consultation_fee ?? null

  const { data: appointment, error } = await admin
    .from('appointments')
    .insert({
      hospital_id:      profile.hospital_id,
      patient_id:       data.patient_id,
      doctor_id:        data.doctor_id,
      appointment_date: data.appointment_date,
      start_time:       data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
      end_time,
      appointment_type: data.appointment_type,
      visit_type:       data.visit_type,
      status:           'scheduled',
      chief_complaint:  data.chief_complaint || null,
      consultation_fee: fee,
      is_paid:          false,
      booking_source:   'reception',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/app/appointments')
  return { id: appointment.id }
}
