import { createClient } from '@/lib/supabase/server'
import { FeatureFlagsClient } from '@/components/super-admin/FeatureFlagsClient'

export const dynamic = 'force-dynamic'

async function getData() {
  const supabase = await createClient()
  const [
    { data: flags },
    { data: hospitals },
  ] = await Promise.all([
    supabase
      .from('feature_flags')
      .select('*, hospitals(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('hospitals')
      .select('id, name')
      .eq('onboarding_status', 'approved')
      .is('deleted_at', null)
      .order('name'),
  ])
  return { flags: (flags ?? []) as any[], hospitals: (hospitals ?? []) as any[] }
}

export default async function FeatureFlagsPage() {
  const data = await getData()
  return <FeatureFlagsClient {...data} />
}
