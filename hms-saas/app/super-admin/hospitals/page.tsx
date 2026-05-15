import { createClient } from '@/lib/supabase/server'
import { HospitalListClient } from '@/components/super-admin/HospitalListClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}

async function getHospitals(status?: string, q?: string, page = 1) {
  const supabase = await createClient()
  const PAGE_SIZE = 20
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('hospitals')
    .select(`
      id, name, city, state, phone, email,
      onboarding_status, created_at
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') {
    if (status === 'pending') {
      query = query.in('onboarding_status', ['pending', 'in_review'])
    } else {
      query = query.eq('onboarding_status', status)
    }
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, count, error } = await query

  return {
    hospitals: (data ?? []) as any[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil((count ?? 0) / PAGE_SIZE),
  }
}

async function getStatusCounts() {
  const supabase = await createClient()
  const [
    { count: total },
    { count: approved },
    { count: pending },
    { count: suspended },
    { count: terminated },
  ] = await Promise.all([
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).eq('onboarding_status', 'approved'),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).in('onboarding_status', ['pending', 'in_review']),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).eq('onboarding_status', 'suspended'),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }).eq('onboarding_status', 'terminated'),
  ])
  return {
    all: total ?? 0,
    approved: approved ?? 0,
    pending: pending ?? 0,
    suspended: suspended ?? 0,
    terminated: terminated ?? 0,
  }
}

export default async function HospitalsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status  = params.status
  const q       = params.q
  const page    = Number(params.page ?? 1)

  const [result, counts] = await Promise.all([
    getHospitals(status, q, page),
    getStatusCounts(),
  ])

  return (
    <HospitalListClient
      hospitals={result.hospitals}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      counts={counts}
      currentStatus={status}
      currentQ={q}
    />
  )
}
