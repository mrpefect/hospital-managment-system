import { createClient } from '@/lib/supabase/server'
import { PlansClient } from '@/components/super-admin/PlansClient'

export const dynamic = 'force-dynamic'

async function getPlans() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })
  return (data ?? []) as any[]
}

export default async function PlansPage() {
  const plans = await getPlans()
  return <PlansClient initialPlans={plans} />
}
