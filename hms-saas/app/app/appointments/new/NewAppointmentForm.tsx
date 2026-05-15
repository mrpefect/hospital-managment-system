'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAppointment } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

type Doctor = {
  id: string
  specialization: string
  consultation_fee: number | null
  consultation_duration_min: number
  profiles: { full_name: string } | null
}

type Patient = {
  id: string
  full_name: string
  mrn: string
}

type Props = {
  prefillPatient?: Patient | null
  doctors: Doctor[]
}

export function NewAppointmentForm({ prefillPatient, doctors }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [patientQuery, setPatientQuery] = useState(prefillPatient?.full_name ?? '')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(prefillPatient ?? null)
  const [searchingPatient, setSearchingPatient] = useState(false)

  const [form, setForm] = useState({
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    appointment_type: 'opd' as const,
    visit_type: 'new' as const,
    chief_complaint: '',
    consultation_fee: '',
  })

  function set<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Auto-fill fee when doctor changes
  useEffect(() => {
    if (!form.doctor_id) return
    const doc = doctors.find(d => d.id === form.doctor_id)
    if (doc?.consultation_fee != null) {
      setForm(prev => ({ ...prev, consultation_fee: String(doc.consultation_fee) }))
    }
  }, [form.doctor_id, doctors])

  // Patient search debounce
  useEffect(() => {
    if (!patientQuery.trim() || selectedPatient) {
      setPatientResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearchingPatient(true)
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(patientQuery.trim())}`)
        if (res.ok) {
          const json = await res.json()
          setPatientResults(json.patients ?? [])
        }
      } catch {
        // silently ignore
      } finally {
        setSearchingPatient(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [patientQuery, selectedPatient])

  function selectPatient(p: Patient) {
    setSelectedPatient(p)
    setPatientQuery(p.full_name)
    setPatientResults([])
  }

  function clearPatient() {
    setSelectedPatient(null)
    setPatientQuery('')
    setPatientResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient) { toast.error('Please select a patient'); return }
    if (!form.doctor_id) { toast.error('Please select a doctor'); return }
    if (!form.appointment_date) { toast.error('Please pick a date'); return }
    if (!form.start_time) { toast.error('Please set a start time'); return }

    setSaving(true)
    try {
      const { id } = await createAppointment({
        patient_id:       selectedPatient.id,
        doctor_id:        form.doctor_id,
        appointment_date: form.appointment_date,
        start_time:       form.start_time,
        appointment_type: form.appointment_type,
        visit_type:       form.visit_type,
        chief_complaint:  form.chief_complaint || undefined,
        consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : undefined,
      })
      toast.success('Appointment scheduled successfully')
      router.push(`/app/appointments`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Patient */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Patient
        </h2>
        <div>
          <label className={labelClass}>Patient <span className="text-red-400">*</span></label>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-[#038bbf] bg-[#e0f4fc]/40 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-800">{selectedPatient.full_name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedPatient.mrn}</p>
              </div>
              <button
                type="button"
                onClick={clearPatient}
                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors ml-4"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={patientQuery}
                onChange={e => setPatientQuery(e.target.value)}
                placeholder="Search by name, MRN, or phone…"
                className={inputClass.replace('px-3.5', 'pl-9 pr-3.5')}
              />
              {searchingPatient && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
              )}
              {patientResults.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  {patientResults.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
                        >
                          {p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.mrn}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!selectedPatient && (
            <p className="mt-1.5 text-xs text-slate-400">
              Type at least 2 characters to search registered patients.{' '}
              <Link href="/app/patients/new" className="text-[#038bbf] hover:underline font-semibold">
                Register new patient →
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Doctor & Schedule */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Doctor &amp; Schedule
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Doctor <span className="text-red-400">*</span></label>
            <select
              value={form.doctor_id}
              onChange={e => set('doctor_id', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.profiles?.full_name ?? 'Unknown'} — {doc.specialization}
                  {doc.consultation_fee != null ? ` (₹${Number(doc.consultation_fee).toLocaleString('en-IN')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={form.appointment_date}
              onChange={e => set('appointment_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Start Time <span className="text-red-400">*</span></label>
            <input
              type="time"
              value={form.start_time}
              onChange={e => set('start_time', e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      {/* Appointment Details */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Appointment Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Appointment Type <span className="text-red-400">*</span></label>
            <select
              value={form.appointment_type}
              onChange={e => set('appointment_type', e.target.value as typeof form.appointment_type)}
              className={inputClass}
            >
              <option value="opd">OPD — Outpatient</option>
              <option value="ipd">IPD — Inpatient</option>
              <option value="emergency">Emergency</option>
              <option value="follow_up">Follow Up</option>
              <option value="teleconsult">Teleconsult</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Visit Type <span className="text-red-400">*</span></label>
            <select
              value={form.visit_type}
              onChange={e => set('visit_type', e.target.value as typeof form.visit_type)}
              className={inputClass}
            >
              <option value="new">New Visit</option>
              <option value="follow_up">Follow Up</option>
              <option value="review">Review</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Consultation Fee (₹)</label>
            <input
              type="number"
              value={form.consultation_fee}
              onChange={e => set('consultation_fee', e.target.value)}
              placeholder="Auto-filled from doctor"
              min={0}
              step="0.01"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Chief Complaint</label>
            <textarea
              value={form.chief_complaint}
              onChange={e => set('chief_complaint', e.target.value)}
              placeholder="Brief reason for visit…"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/appointments"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to appointments
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Scheduling…' : 'Schedule Appointment'}
        </button>
      </div>
    </form>
  )
}
