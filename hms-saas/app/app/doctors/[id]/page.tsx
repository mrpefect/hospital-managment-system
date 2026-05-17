import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, User, Phone, Mail, Stethoscope, Award, Clock } from 'lucide-react'
import { AdminAvailabilityForm } from './AdminAvailabilityForm'

export const dynamic = 'force-dynamic'

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!me || me.role !== 'hospital_admin') redirect('/app/dashboard')

  // Fetch doctor_profile with profile join
  const { data: doc } = await supabase
    .from('doctor_profiles')
    .select('id, specialization, qualification, registration_number, years_of_experience, consultation_fee, consultation_duration_min, bio, is_available_today, profiles(full_name, email, phone)')
    .eq('id', id)
    .eq('hospital_id', me.hospital_id)
    .single()

  if (!doc) notFound()

  const { data: availability } = await supabase
    .from('doctor_availability')
    .select('day_of_week, is_available, start_time, end_time')
    .eq('doctor_profile_id', id)

  const initial: Record<number, { is_available: boolean; start_time: string; end_time: string }> = {}
  for (const row of (availability ?? [])) {
    initial[row.day_of_week] = {
      is_available: row.is_available,
      start_time:   (row.start_time as string).slice(0, 5),
      end_time:     (row.end_time as string).slice(0, 5),
    }
  }

  const profile = doc.profiles as any

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Back */}
      <Link href="/app/doctors" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Doctors
      </Link>

      {/* Doctor card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'DR'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
              Dr. {profile?.full_name}
            </h1>
            <p className="text-sm text-[#038bbf] font-semibold mt-0.5">{doc.specialization}</p>
            {doc.qualification && (
              <p className="text-sm text-slate-500 mt-0.5">{doc.qualification}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Mail,       value: profile?.email },
            { icon: Phone,      value: profile?.phone },
            { icon: Award,      value: doc.registration_number ? `Reg: ${doc.registration_number}` : null },
            { icon: Stethoscope, value: doc.years_of_experience ? `${doc.years_of_experience} yrs experience` : null },
            { icon: Clock,      value: `${doc.consultation_duration_min} min slots · ₹${Number(doc.consultation_fee).toLocaleString('en-IN')} / visit` },
          ].filter(r => r.value).map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <row.icon className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700">{row.value}</span>
            </div>
          ))}
        </div>

        {doc.bio && (
          <p className="mt-4 text-sm text-slate-500 border-t border-slate-100 pt-4">{doc.bio}</p>
        )}
      </div>

      {/* Availability */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
          Weekly Availability
        </h2>
        <AdminAvailabilityForm
          doctorProfileId={doc.id}
          hospitalId={me.hospital_id}
          initial={initial}
        />
      </div>
    </div>
  )
}
