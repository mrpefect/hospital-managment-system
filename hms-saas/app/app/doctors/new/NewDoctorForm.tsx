'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDoctor } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const SPECIALIZATIONS = [
  'General Medicine', 'General Surgery', 'Pediatrics', 'Obstetrics & Gynecology',
  'Orthopedics', 'Cardiology', 'Neurology', 'Dermatology', 'Ophthalmology',
  'ENT', 'Psychiatry', 'Radiology', 'Anesthesiology', 'Pathology',
  'Oncology', 'Urology', 'Nephrology', 'Gastroenterology', 'Pulmonology',
  'Endocrinology', 'Rheumatology', 'Hematology', 'Infectious Disease',
  'Emergency Medicine', 'Family Medicine', 'Dental', 'Physiotherapy', 'Other',
]

export function NewDoctorForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    registration_number: '',
    years_of_experience: '',
    consultation_fee: '',
    consultation_duration_min: '20',
    bio: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Doctor name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    if (!form.specialization) { toast.error('Specialization is required'); return }
    if (!form.consultation_fee) { toast.error('Consultation fee is required'); return }

    setSaving(true)
    try {
      await createDoctor({
        full_name:                form.full_name.trim(),
        email:                    form.email.trim(),
        phone:                    form.phone || undefined,
        specialization:           form.specialization,
        qualification:            form.qualification || undefined,
        registration_number:      form.registration_number || undefined,
        years_of_experience:      parseInt(form.years_of_experience, 10) || 0,
        consultation_fee:         parseFloat(form.consultation_fee),
        consultation_duration_min: parseInt(form.consultation_duration_min, 10) || 20,
        bio:                      form.bio || undefined,
      })
      toast.success(`Dr. ${form.full_name} added successfully`)
      router.push('/app/doctors')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add doctor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Personal Info */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Dr. Priya Sharma"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Email <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="doctor@hospital.com"
              className={inputClass}
              required
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              A login account will be created with this email. A password reset email will be sent.
            </p>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Professional Details */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Professional Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Specialization <span className="text-red-400">*</span></label>
            <select
              value={form.specialization}
              onChange={e => set('specialization', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select specialization</option>
              {SPECIALIZATIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Qualification</label>
            <input
              value={form.qualification}
              onChange={e => set('qualification', e.target.value)}
              placeholder="e.g. MBBS, MD"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Registration Number</label>
            <input
              value={form.registration_number}
              onChange={e => set('registration_number', e.target.value)}
              placeholder="Medical council reg. no."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Years of Experience</label>
            <input
              type="number"
              value={form.years_of_experience}
              onChange={e => set('years_of_experience', e.target.value)}
              placeholder="0"
              min={0}
              max={60}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Consultation Settings */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Consultation Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Consultation Fee (₹) <span className="text-red-400">*</span></label>
            <input
              type="number"
              value={form.consultation_fee}
              onChange={e => set('consultation_fee', e.target.value)}
              placeholder="500"
              min={0}
              step="0.01"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Slot Duration (minutes)</label>
            <select
              value={form.consultation_duration_min}
              onChange={e => set('consultation_duration_min', e.target.value)}
              className={inputClass}
            >
              {[10, 15, 20, 30, 45, 60].map(m => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bio</label>
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Brief professional summary…"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/app/doctors" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to doctors
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Adding Doctor…' : 'Add Doctor'}
        </button>
      </div>
    </form>
  )
}
