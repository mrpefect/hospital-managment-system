'use client'

import { useState } from 'react'
import { createStaffMember } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CheckCircle2, Copy, Check, UserPlus } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

// Doctor excluded — doctors must be added via Doctors → Add New Doctor
// to ensure doctor_profiles record is created correctly
const ROLE_OPTIONS = [
  { value: 'nurse',          label: 'Nurse' },
  { value: 'pharmacist',     label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiologist',    label: 'Radiologist' },
  { value: 'receptionist',   label: 'Receptionist' },
  { value: 'accountant',     label: 'Accountant' },
  { value: 'hr_manager',     label: 'HR Manager' },
  { value: 'ward_boy',       label: 'Ward Boy' },
  { value: 'driver',         label: 'Driver' },
  { value: 'other',          label: 'Other' },
]

interface Department { id: string; name: string }
interface Props { departments: Department[] }

interface Credentials {
  name: string
  email: string
  password: string
  role: string
}

function CredentialsCard({ creds, onAddAnother }: { creds: Credentials; onAddAnother: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const text = `HMS Login Credentials\nName: ${creds.name}\nRole: ${creds.role}\nLogin URL: ${window.location.origin}/login\nEmail: ${creds.email}\nTemporary Password: ${creds.password}\n\nPlease change your password after first login.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    toast.success('Credentials copied to clipboard')
  }

  return (
    <div className="space-y-5">
      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
        <div>
          <p className="font-bold text-green-800" style={{ fontFamily: 'var(--font-lato)' }}>
            Account created successfully!
          </p>
          <p className="text-sm text-green-600 mt-0.5">
            Share the credentials below with <span className="font-semibold">{creds.name}</span>.
          </p>
        </div>
      </div>

      {/* Credentials box */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100"
          style={{ background: 'linear-gradient(135deg, #038bbf0d, #00437b0d)' }}>
          <p className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
            Login Credentials
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Share these with the staff member privately</p>
        </div>

        <div className="p-5 space-y-4">
          {[
            { label: 'Name',               value: creds.name },
            { label: 'Role',               value: creds.role },
            { label: 'Login URL',          value: `${typeof window !== 'undefined' ? window.location.origin : ''}/login` },
            { label: 'Email',              value: creds.email },
            { label: 'Temporary Password', value: creds.password, mono: true, highlight: true },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 shrink-0">
                {row.label}
              </span>
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
        The staff member must change their password after the first login.
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAddAnother}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Another
        </button>
        <Link
          href="/app/staff"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          Go to Staff List
        </Link>
      </div>
    </div>
  )
}

export function NewStaffForm({ departments }: Props) {
  const [saving, setSaving]       = useState(false)
  const [creds, setCreds]         = useState<Credentials | null>(null)

  const [form, setForm] = useState({
    full_name:     '',
    email:         '',
    role:          '',
    phone:         '',
    designation:   '',
    department_id: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm({ full_name: '', email: '', role: '', phone: '', designation: '', department_id: '' })
    setCreds(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Full name is required'); return }
    if (!form.email.trim())     { toast.error('Email is required'); return }
    if (!form.role)             { toast.error('Please select a role'); return }

    setSaving(true)
    try {
      const result = await createStaffMember({
        full_name:     form.full_name,
        email:         form.email,
        role:          form.role,
        phone:         form.phone || undefined,
        designation:   form.designation || undefined,
        department_id: form.department_id || undefined,
      })
      const roleLabel = ROLE_OPTIONS.find(r => r.value === form.role)?.label ?? form.role
      setCreds({
        name:     form.full_name,
        email:    form.email,
        password: result.tempPassword,
        role:     roleLabel,
      })
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add staff member')
    } finally {
      setSaving(false)
    }
  }

  if (creds) {
    return <CredentialsCard creds={creds} onAddAnother={resetForm} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Doctor note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800 mb-0.5">Adding a Doctor?</p>
        <p className="text-sm text-blue-600">
          Use the{' '}
          <Link href="/app/doctors/new" className="font-bold underline underline-offset-2">
            Doctors → Add New Doctor
          </Link>{' '}
          page instead — it sets up the full doctor profile with specialization, fee, and scheduling settings.
        </p>
      </div>

      {/* Form fields */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Staff Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
            <input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Ravi Kumar"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="staff@hospital.com"
              className={inputClass}
              required
            />
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

          <div>
            <label className={labelClass}>Role <span className="text-red-400">*</span></label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select role</option>
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Designation</label>
            <input
              value={form.designation}
              onChange={e => set('designation', e.target.value)}
              placeholder="e.g. Senior Nurse"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Department</label>
            <select
              value={form.department_id}
              onChange={e => set('department_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Link
          href="/app/staff"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to staff
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Creating account…' : 'Create Account'}
        </button>
      </div>
    </form>
  )
}
