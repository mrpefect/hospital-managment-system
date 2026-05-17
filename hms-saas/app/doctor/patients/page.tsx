import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DoctorPatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  // Look up doctor_profiles.id — appointments.doctor_id references this
  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  const { data: appointments } = doctorProf
    ? await supabase
        .from('appointments')
        .select('appointment_date, patients(id, full_name, mrn, phone, gender, date_of_birth)')
        .eq('hospital_id', profile.hospital_id)
        .eq('doctor_id', doctorProf.id)
        .order('appointment_date', { ascending: false })
    : { data: [] }

  // Deduplicate: keep most-recent visit per patient + count visits
  const seen = new Map<string, { count: number; last_visit: string }>()
  const patientMap = new Map<string, {
    id: string; full_name: string; mrn: string
    phone: string | null; gender: string | null; date_of_birth: string | null
    last_visit: string; visit_count: number
  }>()

  for (const appt of appointments ?? []) {
    const pat = appt.patients as any
    if (!pat) continue
    const prev = seen.get(pat.id)
    if (!prev) {
      seen.set(pat.id, { count: 1, last_visit: appt.appointment_date })
      patientMap.set(pat.id, {
        id: pat.id, full_name: pat.full_name, mrn: pat.mrn,
        phone: pat.phone, gender: pat.gender, date_of_birth: pat.date_of_birth,
        last_visit: appt.appointment_date, visit_count: 1,
      })
    } else {
      prev.count++
      patientMap.get(pat.id)!.visit_count = prev.count
    }
  }

  const patients = Array.from(patientMap.values())

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          My Patients
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {patients.length} patient{patients.length !== 1 ? 's' : ''} seen
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!patients.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No patients yet — they'll appear once you have appointments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map((patient) => {
                  const initials = patient.full_name
                    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <Link href={`/doctor/patients/${patient.id}`} className="flex items-center gap-3 group">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-slate-800 group-hover:text-[#7c3aed] transition-colors">
                            {patient.full_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{patient.mrn}</td>
                      <td className="px-6 py-4 text-slate-600">{patient.phone ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-600 capitalize">{patient.gender ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-50 px-2 text-xs font-bold text-purple-700">
                          {patient.visit_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(patient.last_visit + 'T00:00:00').toLocaleDateString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
