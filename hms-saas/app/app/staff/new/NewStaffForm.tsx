'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createStaffMember } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const ROLE_OPTIONS = [
  { value: 'doctor',         label: 'Doctor' },
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

interface Department {
  id: string
  name: string
}

interface Props {
  departments: Department[]
}

export function NewStaffForm({ departments }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name:     '',
    email:         '',
    role:          '',
    phone:         '',
    designation:   '',
    department_id: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    if (!form.email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!form.role) {
      toast.error('Please select a role')
      return
    }

    setSaving(true)
    try {
      await createStaffMember({
        full_name:     form.full_name,
        email:         form.email,
        role:          form.role,
        phone:         form.phone || undefined,
        designation:   form.designation || undefined,
        department_id: form.department_id || undefined,
      })
      toast.success('Staff member added successfully')
      router.push('/app/staff')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add staff member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2
          className="text-sm font-bold text-slate-700 mb-5"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Staff Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="e.g. Dr. Priya Sharma"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="staff@hospital.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select role</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Designation (optional)</label>
            <input
              value={form.designation}
              onChange={(e) => set('designation', e.target.value)}
              placeholder="e.g. Senior Consultant"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Department (optional)</label>
            <select
              value={form.department_id}
              onChange={(e) => set('department_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Note about password */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        A temporary password will be generated automatically. The staff member can sign in and
        change their password after first login.
      </div>

      {/* Actions */}
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
          {saving ? 'Creating account…' : 'Add Staff Member'}
        </button>
      </div>
    </form>
  )
}
