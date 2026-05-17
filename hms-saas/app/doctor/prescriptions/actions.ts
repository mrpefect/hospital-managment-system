'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PrescriptionItem {
  medicine_name: string
  dosage?: string
  frequency?: string
  duration?: string
  route?: string
  instructions?: string
  sort_order: number
}

export async function createPrescription(data: {
  patient_id: string
  prescription_date: string
  diagnosis?: string
  notes?: string
  follow_up_date?: string
  items: PrescriptionItem[]
}) {
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

  const { data: prescription, error: rxError } = await supabase
    .from('prescriptions')
    .insert({
      hospital_id:       profile.hospital_id,
      patient_id:        data.patient_id,
      doctor_profile_id: doctorProf.id,
      prescription_date: data.prescription_date,
      diagnosis:         data.diagnosis || null,
      notes:             data.notes || null,
      follow_up_date:    data.follow_up_date || null,
    })
    .select('id')
    .single()

  if (rxError) throw new Error(rxError.message)

  if (data.items.length > 0) {
    const itemRows = data.items.map(item => ({
      prescription_id: prescription.id,
      medicine_name:   item.medicine_name,
      dosage:          item.dosage || null,
      frequency:       item.frequency || null,
      duration:        item.duration || null,
      route:           item.route || null,
      instructions:    item.instructions || null,
      sort_order:      item.sort_order,
    }))

    const { error: itemsError } = await supabase
      .from('prescription_items')
      .insert(itemRows)

    if (itemsError) throw new Error(itemsError.message)
  }

  revalidatePath(`/doctor/patients/${data.patient_id}`)
  return { id: prescription.id }
}
