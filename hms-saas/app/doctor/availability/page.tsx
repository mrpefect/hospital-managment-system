import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityForm } from './AvailabilityForm'

export const dynamic = 'force-dynamic'

export default async function DoctorAvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id, specialization')
    .eq('profile_id', profile.id)
    .single()

  const { data: availability } = doctorProf
    ? await supabase
        .from('doctor_availability')
        .select('day_of_week, is_available, start_time, end_time')
        .eq('doctor_profile_id', doctorProf.id)
    : { data: [] }

  // Build initial map keyed by day_of_week
  const initial: Record<number, { is_available: boolean; start_time: string; end_time: string }> = {}
  for (const row of (availability ?? [])) {
    initial[row.day_of_week] = {
      is_available: row.is_available,
      start_time:   (row.start_time as string).slice(0, 5),
      end_time:     (row.end_time as string).slice(0, 5),
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
        My Availability
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Set the days and hours you are available for appointments
        {doctorProf?.specialization && ` · ${doctorProf.specialization}`}
      </p>

      <AvailabilityForm initial={initial} />
    </div>
  )
}
