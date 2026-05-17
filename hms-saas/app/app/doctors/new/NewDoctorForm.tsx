'use client'

import { useState } from 'react'
import { createDoctor } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CheckCircle2, Copy, Check, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface Credentials { name: string; email: string; password: string }

function CredentialsCard({ creds, onAddAnother }: { creds: Credentials; onAddAnother: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const text = `HMS Doctor Login Credentials\nName: ${creds.name}\nRole: Doctor\nLogin URL: ${window.location.origin}/login\nEmail: ${creds.email}\nTemporary Password: ${creds.password}\n\nPlease change your password after first login.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    toast.success('Credentials copied to clipboard')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
        <div>
          <p className="font-bold text-green-800" style={{ fontFamily: 'var(--font-lato)' }}>
            Doctor account created!
          </p>
          <p className="text-sm text-green-600 mt-0.5">
            Share these credentials with <span className="font-semibold">Dr. {creds.name}</span>.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100"
          style={{ background: 'linear-gradient(135deg, #038bbf0d, #00437b0d)' }}>
          <p className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>Login Credentials</p>
          <p className="text-xs text-slate-400 mt-0.5">Share these with the doctor privately</p>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Name',               value: creds.name },
            { label: 'Role',               value: 'Doctor' },
            { label: 'Login URL',          value: `${typeof window !== 'undefined' ? window.location.origin : ''}/login` },
            { label: 'Email',              value: creds.email },
            { label: 'Temporary Password', value: creds.password, mono: true, highlight: true },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 shrink-0">{row.label}</span>
              <span className={`flex-1 text-sm ${row.mono ? 'font-mono' : ''} ${row.highlight ? 'font-bold text-[#038bbf] bg-[#038bbf]/8 px-2.5 py-1 rounded-lg' : 'text-slate-700'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={copy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all border"
            style={copied
              ? { background: '#d1fae5', borderColor: '#6ee7b7', color: '#059669' }
              : { background: 'linear-gradient(135deg, #038bbf, #00437b)', borderColor: 'transparent', color: '#fff' }
            }
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        The doctor must change their password after the first login.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onAddAnother}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Add Another
        </button>
        <Link
          href="/app/doctors"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          Go to Doctors
        </Link>
      </div>
    </div>
  )
}

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
  const [saving, setSaving] = useState(false)
  const [creds, setCreds]   = useState<Credentials | null>(null)

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

  function resetForm() {
    setForm({ full_name: '', email: '', phone: '', specialization: '', qualification: '', registration_number: '', years_of_experience: '', consultation_fee: '', consultation_duration_min: '20', bio: '' })
    setCreds(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim())   { toast.error('Doctor name is required'); return }
    if (!form.email.trim())       { toast.error('Email is required'); return }
    if (!form.specialization)     { toast.error('Specialization is required'); return }
    if (!form.consultation_fee)   { toast.error('Consultation fee is required'); return }

    setSaving(true)
    try {
      const result = await createDoctor({
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
      setCreds({ name: form.full_name, email: form.email, password: result.tempPassword })
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add doctor')
    } finally {
      setSaving(false)
    }
  }

  if (creds) return <CredentialsCard creds={creds} onAddAnother={resetForm} />

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
