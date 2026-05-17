'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPrescription, type PrescriptionItem } from '../actions'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const FREQ_PRESETS = ['OD', 'BD', 'TID', 'QID', '1-0-1', '1-1-1', '1-1-1-1', 'SOS', 'HS']
const DURATION_PRESETS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Ongoing']

interface EmptyMed { medicine_name: string; dosage: string; frequency: string; duration: string; route: string; instructions: string }
const emptyMed = (): EmptyMed => ({ medicine_name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' })

interface Props {
  patient: { id: string; full_name: string; mrn: string; age: number | null; gender: string | null }
  defaultDate: string
}

export function PrescriptionForm({ patient, defaultDate }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(defaultDate)
  const [diagnosis, setDiagnosis] = useState('')
  const [advice, setAdvice] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [meds, setMeds] = useState<EmptyMed[]>([emptyMed()])

  function setMed(idx: number, field: keyof EmptyMed, value: string) {
    setMeds(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  function addMed() { setMeds(prev => [...prev, emptyMed()]) }

  function removeMed(idx: number) {
    setMeds(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validMeds = meds.filter(m => m.medicine_name.trim())
    if (!validMeds.length) { toast.error('Add at least one medicine'); return }

    setSaving(true)
    try {
      const items: PrescriptionItem[] = validMeds.map((m, i) => ({
        medicine_name: m.medicine_name.trim(),
        dosage:        m.dosage || undefined,
        frequency:     m.frequency || undefined,
        duration:      m.duration || undefined,
        route:         m.route || undefined,
        instructions:  m.instructions || undefined,
        sort_order:    i,
      }))

      const { id } = await createPrescription({
        patient_id:        patient.id,
        prescription_date: date,
        diagnosis:         diagnosis || undefined,
        notes:             advice || undefined,
        follow_up_date:    followUp || undefined,
        items,
      })

      router.push(`/print/prescription/${id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save prescription')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Patient + Date */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Patient &amp; Date
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Patient (read-only) */}
          <div className="sm:col-span-1">
            <label className={labelClass}>Patient</label>
            <div className="rounded-xl border border-[#7c3aed]/30 bg-purple-50/40 px-3.5 py-2.5">
              <p className="text-sm font-semibold text-slate-800">{patient.full_name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {patient.mrn}
                {patient.age !== null && ` · ${patient.age} yrs`}
                {patient.gender && ` · ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`}
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Prescription Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      {/* Diagnosis */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Diagnosis
        </h2>
        <textarea
          value={diagnosis}
          onChange={e => setDiagnosis(e.target.value)}
          placeholder="Chief complaint / diagnosis…"
          rows={2}
          className={inputClass + ' resize-none'}
        />
      </section>

      {/* Medicines */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
            ℞ Medicines
          </h2>
          <button
            type="button"
            onClick={addMed}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Medicine
          </button>
        </div>

        <div className="space-y-5">
          {meds.map((med, idx) => (
            <div key={idx} className="relative rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              {/* Row number + remove */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
                >
                  {idx + 1}
                </span>
                {meds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMed(idx)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Medicine Name <span className="text-red-400">*</span></label>
                  <input
                    value={med.medicine_name}
                    onChange={e => setMed(idx, 'medicine_name', e.target.value)}
                    placeholder="e.g. Paracetamol 500mg Tab"
                    className={inputClass}
                    required={idx === 0}
                  />
                </div>

                <div>
                  <label className={labelClass}>Dosage</label>
                  <input
                    value={med.dosage}
                    onChange={e => setMed(idx, 'dosage', e.target.value)}
                    placeholder="e.g. 500mg, 1 tab"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Frequency</label>
                  <input
                    value={med.frequency}
                    onChange={e => setMed(idx, 'frequency', e.target.value)}
                    placeholder="e.g. BD, TID, 1-0-1"
                    list={`freq-list-${idx}`}
                    className={inputClass}
                  />
                  <datalist id={`freq-list-${idx}`}>
                    {FREQ_PRESETS.map(f => <option key={f} value={f} />)}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {FREQ_PRESETS.slice(0, 5).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setMed(idx, 'frequency', f)}
                        className={[
                          'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
                          med.frequency === f
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-purple-50 hover:text-purple-700',
                        ].join(' ')}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Duration</label>
                  <input
                    value={med.duration}
                    onChange={e => setMed(idx, 'duration', e.target.value)}
                    placeholder="e.g. 5 days, 1 week"
                    list={`dur-list-${idx}`}
                    className={inputClass}
                  />
                  <datalist id={`dur-list-${idx}`}>
                    {DURATION_PRESETS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div>
                  <label className={labelClass}>Route</label>
                  <select
                    value={med.route}
                    onChange={e => setMed(idx, 'route', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select route</option>
                    <option value="Oral">Oral</option>
                    <option value="Topical">Topical</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="SC">SC</option>
                    <option value="Inhaled">Inhaled</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Rectal">Rectal</option>
                    <option value="Eye drops">Eye drops</option>
                    <option value="Ear drops">Ear drops</option>
                    <option value="Nasal">Nasal</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Special Instructions</label>
                  <input
                    value={med.instructions}
                    onChange={e => setMed(idx, 'instructions', e.target.value)}
                    placeholder="e.g. After food, Avoid alcohol, Take with warm water"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advice & Follow-up */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Advice &amp; Follow-up
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>General Advice / Instructions</label>
            <textarea
              value={advice}
              onChange={e => setAdvice(e.target.value)}
              placeholder="e.g. Take rest, drink plenty of fluids, avoid spicy food…"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
          <div>
            <label className={labelClass}>Follow-up Date</label>
            <input
              type="date"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              min={date}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/doctor/patients/${patient.id}`}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to patient
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save & Print Prescription'}
        </button>
      </div>
    </form>
  )
}
