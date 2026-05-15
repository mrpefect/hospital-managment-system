'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function upsertPlan(plan: {
  id?: string
  name: string
  price_monthly: number
  price_yearly?: number
  max_beds?: number
  max_doctors?: number
  max_staff?: number
  features?: Record<string, boolean>
  is_active: boolean
}) {
  const supabase = createAdminClient()

  if (plan.id) {
    const { error } = await supabase
      .from('plans')
      .update({
        name:          plan.name,
        price_monthly: plan.price_monthly,
        price_yearly:  plan.price_yearly ?? null,
        max_beds:      plan.max_beds ?? null,
        max_doctors:   plan.max_doctors ?? null,
        max_staff:     plan.max_staff ?? null,
        features:      plan.features ?? {},
        is_active:     plan.is_active,
      })
      .eq('id', plan.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('plans')
      .insert({
        name:          plan.name,
        price_monthly: plan.price_monthly,
        price_yearly:  plan.price_yearly ?? null,
        max_beds:      plan.max_beds ?? null,
        max_doctors:   plan.max_doctors ?? null,
        max_staff:     plan.max_staff ?? null,
        features:      plan.features ?? {},
        is_active:     plan.is_active,
      })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/super-admin/plans')
}
