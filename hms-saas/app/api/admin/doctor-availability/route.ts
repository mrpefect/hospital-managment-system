import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'hospital_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { doctorProfileId, hospitalId, slots } = body

  // Ensure the doctor belongs to this hospital
  if (hospitalId !== profile.hospital_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = slots.map((s: { day_of_week: number; is_available: boolean; start_time: string; end_time: string }) => ({
    doctor_profile_id: doctorProfileId,
    hospital_id:       hospitalId,
    day_of_week:       s.day_of_week,
    is_available:      s.is_available,
    start_time:        s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
    end_time:          s.end_time.length === 5 ? s.end_time + ':00' : s.end_time,
  }))

  const { error } = await supabase
    .from('doctor_availability')
    .upsert(rows, { onConflict: 'doctor_profile_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
