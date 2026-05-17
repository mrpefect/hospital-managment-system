import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewInventoryItemForm } from './NewInventoryItemForm'

export const dynamic = 'force-dynamic'

export default async function NewInventoryItemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('id, name')
    .eq('hospital_id', profile.hospital_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Add Inventory Item
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Add a new item to your inventory with stock settings.
        </p>
      </div>
      <NewInventoryItemForm categories={categories ?? []} />
    </div>
  )
}
