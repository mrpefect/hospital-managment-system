import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.hospital_id) return NextResponse.json([])

  const { data } = await supabase
    .from('patients')
    .select('id, full_name, mrn, phone')
    .eq('hospital_id', profile.hospital_id)
    .is('deleted_at', null)
    .or(`full_name.ilike.%${q}%,mrn.ilike.%${q}%,phone.ilike.%${q}%`)
    .order('full_name', { ascending: true })
    .limit(10)

  return NextResponse.json(data ?? [])
}
