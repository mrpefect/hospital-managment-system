'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function upsertFeatureFlag(flag: {
  id?: string
  hospital_id: string
  feature_key: string
  is_enabled: boolean
  expires_at?: string | null
  reason?: string | null
}) {
  const supabase = createAdminClient()

  if (flag.id) {
    const { error } = await supabase
      .from('feature_flags')
      .update({
        is_enabled:  flag.is_enabled,
        expires_at:  flag.expires_at ?? null,
        reason:      flag.reason ?? null,
      })
      .eq('id', flag.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('feature_flags')
      .insert({
        hospital_id:  flag.hospital_id,
        feature_key:  flag.feature_key,
        is_enabled:   flag.is_enabled,
        expires_at:   flag.expires_at ?? null,
        reason:       flag.reason ?? null,
      })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/super-admin/feature-flags')
}

export async function deleteFeatureFlag(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('feature_flags').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/feature-flags')
}
