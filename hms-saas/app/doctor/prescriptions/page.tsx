import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DoctorPrescriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  const { data: prescriptions } = doctorProf
    ? await supabase
        .from('prescriptions')
        .select('id, prescription_date, diagnosis, follow_up_date, patients(full_name, mrn), prescription_items(id)')
        .eq('hospital_id', profile.hospital_id)
        .eq('doctor_profile_id', doctorProf.id)
        .order('prescription_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Prescriptions
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {prescriptions?.length ?? 0} prescription{(prescriptions?.length ?? 0) !== 1 ? 's' : ''} written
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!prescriptions?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <FileText className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No prescriptions written yet</p>
            <p className="text-xs text-slate-300 mt-1">Go to a patient's profile and click "Write Prescription"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicines</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(prescriptions as any[]).map((rx) => {
                  const patient = rx.patients
                  const initials = patient?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'
                  const itemCount = rx.prescription_items?.length ?? 0

                  return (
                    <tr key={rx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{patient?.full_name ?? '—'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{patient?.mrn ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {rx.diagnosis ? (
                          <p className="text-slate-700 max-w-xs truncate">{rx.diagnosis}</p>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-50 px-2 text-xs font-bold text-purple-700">
                          {itemCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-xs">
                        {rx.follow_up_date
                          ? new Date(rx.follow_up_date + 'T00:00:00').toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/print/prescription/${rx.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Print
                        </Link>
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
