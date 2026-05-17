import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, Droplets,
  CalendarDays, ShieldCheck, ClipboardList,
  User2, BadgeAlert, FilePen,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function calcAge(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Not specified',
}

const APPT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: '#f1f5f9' },
  confirmed:   { label: 'Confirmed',   color: '#038bbf', bg: '#e0f4fc' },
  checked_in:  { label: 'Checked In',  color: '#059669', bg: '#d1fae5' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#ede9fe' },
  completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2' },
  no_show:     { label: 'No Show',     color: '#9f1239', bg: '#ffe4e6' },
}

export default async function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/login')

  // Resolve doctor_profiles.id
  const { data: doctorProf } = await supabase
    .from('doctor_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  // Fetch patient — must belong to same hospital
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('hospital_id', profile.hospital_id)
    .is('deleted_at', null)
    .single()

  if (!patient) notFound()

  // Only show this doctor's appointments with the patient
  const [{ data: appointments }, { data: allergies }] = await Promise.all([
    doctorProf
      ? supabase
          .from('appointments')
          .select('id, appointment_date, start_time, appointment_type, visit_type, status, consultation_fee, chief_complaint')
          .eq('hospital_id', profile.hospital_id)
          .eq('patient_id', id)
          .eq('doctor_id', doctorProf.id)
          .order('appointment_date', { ascending: false })
      : Promise.resolve({ data: [] }),

    supabase
      .from('patient_allergies')
      .select('id, allergy_type, allergen, severity, reaction')
      .eq('patient_id', id)
      .eq('is_active', true),
  ])

  const age = calcAge(patient.date_of_birth)
  const initials = patient.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const address = [patient.address_line1, patient.address_line2, patient.city, patient.state, patient.pincode]
    .filter(Boolean).join(', ')

  const severityColor: Record<string, string> = {
    mild: '#16a34a', moderate: '#d97706', severe: '#dc2626', life_threatening: '#9f1239',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Back */}
      <Link
        href="/doctor/patients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my patients
      </Link>

      {/* Patient header card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
                  {patient.full_name}
                </h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 rounded px-2 py-0.5">
                    {patient.mrn}
                  </span>
                  {age !== null && <span className="text-sm text-slate-500">{age} years old</span>}
                  {patient.gender && (
                    <span className="text-sm text-slate-500">{GENDER_LABEL[patient.gender] ?? patient.gender}</span>
                  )}
                  {patient.blood_group && (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 ring-1 ring-red-100 flex items-center gap-1">
                      <Droplets className="h-3 w-3" /> {patient.blood_group}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {appointments?.length ?? 0} visit{(appointments?.length ?? 0) !== 1 ? 's' : ''} with you
                </span>
                <Link
                  href={`/doctor/prescriptions/new?patient_id=${patient.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                >
                  <FilePen className="h-3.5 w-3.5" />
                  Write Prescription
                </Link>
              </div>
            </div>

            {/* Contact row */}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {patient.phone && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-300" /> {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Mail className="h-3.5 w-3.5 text-slate-300" /> {patient.email}
                </span>
              )}
              {address && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-300" /> {address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left col */}
        <div className="space-y-5">

          {/* Personal details */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" /> Personal
            </h2>
            <dl className="space-y-3">
              {[
                {
                  label: 'Date of Birth',
                  value: patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : null,
                },
                {
                  label: 'Marital Status',
                  value: patient.marital_status
                    ? patient.marital_status.charAt(0).toUpperCase() + patient.marital_status.slice(1)
                    : null,
                },
                { label: 'Occupation', value: patient.occupation },
                {
                  label: 'Registered',
                  value: new Date(patient.registered_at ?? patient.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }),
                },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="text-xs font-medium text-slate-700 text-right">{value}</dd>
                </div>
              ) : null)}
            </dl>
          </div>

          {/* Insurance */}
          {(patient.insurance_provider || patient.insurance_policy_no) && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Insurance
              </h2>
              <dl className="space-y-3">
                {patient.insurance_provider && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-xs text-slate-400">Provider</dt>
                    <dd className="text-xs font-medium text-slate-700">{patient.insurance_provider}</dd>
                  </div>
                )}
                {patient.insurance_policy_no && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-xs text-slate-400">Policy No.</dt>
                    <dd className="text-xs font-mono font-medium text-slate-700">{patient.insurance_policy_no}</dd>
                  </div>
                )}
                {patient.insurance_expiry && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-xs text-slate-400">Expiry</dt>
                    <dd className="text-xs font-medium text-slate-700">
                      {new Date(patient.insurance_expiry).toLocaleDateString('en-IN')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Allergies */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <BadgeAlert className="h-3.5 w-3.5" /> Allergies
            </h2>
            {!allergies?.length ? (
              <p className="text-xs text-slate-400">No known allergies recorded.</p>
            ) : (
              <ul className="space-y-2">
                {(allergies as any[]).map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{a.allergen}</span>
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: severityColor[a.severity] ?? '#64748b',
                          background: (severityColor[a.severity] ?? '#64748b') + '18',
                        }}
                      >
                        {a.severity.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 capitalize">{a.allergy_type}</p>
                    {a.reaction && <p className="text-[11px] text-slate-400 mt-0.5">{a.reaction}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes */}
          {patient.notes && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" /> Notes
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{patient.notes}</p>
            </div>
          )}
        </div>

        {/* Right col — this doctor's appointments with the patient */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800" style={{ fontFamily: 'var(--font-lato)' }}>
                Your Appointment History
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Only visits with you are shown</p>
            </div>

            {!appointments?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <CalendarDays className="h-8 w-8 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">No appointments with this patient yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {(appointments as any[]).map((appt) => {
                  const meta = APPT_STATUS_META[appt.status] ?? APPT_STATUS_META.scheduled
                  return (
                    <li key={appt.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })}
                            {appt.start_time && (
                              <span className="text-slate-400 font-normal"> · {appt.start_time.slice(0, 5)}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">
                            {appt.appointment_type ?? 'General'}
                            {appt.visit_type ? ` · ${appt.visit_type.replace('_', ' ')}` : ''}
                            {appt.consultation_fee != null
                              ? ` · ₹${Number(appt.consultation_fee).toLocaleString('en-IN')}`
                              : ''}
                          </p>
                          {appt.chief_complaint && (
                            <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-3 py-1.5 italic">
                              "{appt.chief_complaint}"
                            </p>
                          )}
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
