'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createInventoryItem(data: {
  name: string
  code?: string
  item_type: string
  unit_of_measure: string
  category_id?: string
  reorder_level?: number
  reorder_quantity?: number
  description?: string
  // initial stock
  initial_quantity?: number
  location_name?: string
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

  const { data: item, error: itemErr } = await admin
    .from('inventory_items')
    .insert({
      hospital_id:      profile.hospital_id,
      name:             data.name.trim(),
      code:             data.code?.trim() || null,
      item_type:        data.item_type,
      unit_of_measure:  data.unit_of_measure.trim(),
      category_id:      data.category_id || null,
      reorder_level:    data.reorder_level ?? 0,
      reorder_quantity: data.reorder_quantity ?? 0,
      description:      data.description?.trim() || null,
      is_active:        true,
    })
    .select('id')
    .single()

  if (itemErr) throw new Error(itemErr.message)

  if ((data.initial_quantity ?? 0) > 0) {
    const { error: stockErr } = await admin
      .from('inventory_stock')
      .insert({
        hospital_id:        profile.hospital_id,
        item_id:            item.id,
        quantity_on_hand:   data.initial_quantity,
        quantity_available: data.initial_quantity,
        location_name:      data.location_name?.trim() || null,
      })
    if (stockErr) throw new Error(stockErr.message)
  }

  revalidatePath('/app/inventory')
  return { id: item.id }
}

export async function updateHospitalInfo(data: {
  name: string
  legal_name?: string
  phone?: string
  email?: string
  website?: string
  registration_number?: string
  total_beds?: number
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) throw new Error('No hospital found')
  if (profile.role !== 'hospital_admin') throw new Error('Only admins can update hospital info')

  const admin = createAdminClient()
  const { error } = await admin
    .from('hospitals')
    .update({
      name:                data.name.trim(),
      legal_name:          data.legal_name?.trim() || null,
      phone:               data.phone?.trim() || null,
      email:               data.email?.trim() || null,
      website:             data.website?.trim() || null,
      registration_number: data.registration_number?.trim() || null,
      total_beds:          data.total_beds ?? null,
      address_line1:       data.address_line1?.trim() || null,
      address_line2:       data.address_line2?.trim() || null,
      city:                data.city?.trim() || null,
      state:               data.state?.trim() || null,
      pincode:             data.pincode?.trim() || null,
    })
    .eq('id', profile.hospital_id)

  if (error) throw new Error(error.message)
  revalidatePath('/app/settings')
}
