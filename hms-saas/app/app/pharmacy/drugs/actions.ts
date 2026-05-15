'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createDrug(data: {
  name: string
  generic_name: string
  form: string
  strength?: string
  unit?: string
  drug_class?: string
  schedule?: string
  manufacturer?: string
  purchase_price: number
  selling_price: number
  mrp?: number
  tax_percent?: number
  reorder_level?: number
  reorder_quantity?: number
  requires_prescription?: boolean
  is_narcotic?: boolean
  storage_instructions?: string
  contraindications?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) throw new Error('Profile not found')

  const admin = createAdminClient()

  const { data: drug, error } = await admin
    .from('drugs')
    .insert({
      hospital_id:           profile.hospital_id,
      name:                  data.name.trim(),
      generic_name:          data.generic_name.trim(),
      form:                  data.form,
      strength:              data.strength              || null,
      unit:                  data.unit                  || 'tablet',
      drug_class:            data.drug_class            || null,
      schedule:              data.schedule              || null,
      manufacturer:          data.manufacturer          || null,
      purchase_price:        data.purchase_price        ?? 0,
      selling_price:         data.selling_price         ?? 0,
      mrp:                   data.mrp                   ?? null,
      tax_percent:           data.tax_percent           ?? 0,
      reorder_level:         data.reorder_level         ?? 10,
      reorder_quantity:      data.reorder_quantity      ?? 50,
      requires_prescription: data.requires_prescription ?? true,
      is_narcotic:           data.is_narcotic           ?? false,
      storage_instructions:  data.storage_instructions  || null,
      contraindications:     data.contraindications     || null,
      is_active:             true,
      is_formulary:          true,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/app/pharmacy')
  return { id: drug.id }
}
