'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPatient } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry',
]

export function NewPatientForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '', gender: '', date_of_birth: '', blood_group: '',
    phone: '', alternate_phone: '', email: '',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '',
    marital_status: '', occupation: '',
    insurance_provider: '', insurance_policy_no: '',
    notes: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Patient name is required'); return }

    setSaving(true)
    try {
      const { id, mrn } = await createPatient(form)
      toast.success(`Patient registered — MRN: ${mrn}`)
      router.push(`/app/patients/${id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to register patient')
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
              value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Rahul Sharma" className={inputClass} required
            />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputClass}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
              max={new Date().toISOString().split('T')[0]} className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Blood Group</label>
            <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} className={inputClass}>
              <option value="">Unknown</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Marital Status</label>
            <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className={inputClass}>
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Contact Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+91 98765 43210" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Alternate Phone</label>
            <input
              type="tel" value={form.alternate_phone} onChange={e => set('alternate_phone', e.target.value)}
              placeholder="Optional" className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Email</label>
            <input
              type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="patient@email.com" className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Address
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 1</label>
            <input
              value={form.address_line1} onChange={e => set('address_line1', e.target.value)}
              placeholder="House / Flat no., Street" className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 2</label>
            <input
              value={form.address_line2} onChange={e => set('address_line2', e.target.value)}
              placeholder="Area, Landmark (optional)" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="Mumbai" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <select value={form.state} onChange={e => set('state', e.target.value)} className={inputClass}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Pincode</label>
            <input
              value={form.pincode} onChange={e => set('pincode', e.target.value)}
              placeholder="400001" maxLength={6} className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Insurance (Optional)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Insurance Provider</label>
            <input
              value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)}
              placeholder="e.g. Star Health" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Policy Number</label>
            <input
              value={form.insurance_policy_no} onChange={e => set('insurance_policy_no', e.target.value)}
              placeholder="Policy / card number" className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Notes
        </h2>
        <textarea
          value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Any additional notes about this patient…"
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/app/patients" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to patients
        </Link>
        <button
          type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Registering…' : 'Register Patient'}
        </button>
      </div>
    </form>
  )
}
