'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateHospitalInfo } from '@/app/app/inventory/actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

interface Hospital {
  name: string
  legal_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  registration_number?: string | null
  total_beds?: number | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
}

export function EditHospitalForm({ hospital }: { hospital: Hospital }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:                hospital.name ?? '',
    legal_name:          hospital.legal_name ?? '',
    phone:               hospital.phone ?? '',
    email:               hospital.email ?? '',
    website:             hospital.website ?? '',
    registration_number: hospital.registration_number ?? '',
    total_beds:          hospital.total_beds?.toString() ?? '',
    address_line1:       hospital.address_line1 ?? '',
    address_line2:       hospital.address_line2 ?? '',
    city:                hospital.city ?? '',
    state:               hospital.state ?? '',
    pincode:             hospital.pincode ?? '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Hospital name is required'); return }

    setSaving(true)
    try {
      await updateHospitalInfo({
        name:                form.name,
        legal_name:          form.legal_name || undefined,
        phone:               form.phone || undefined,
        email:               form.email || undefined,
        website:             form.website || undefined,
        registration_number: form.registration_number || undefined,
        total_beds:          form.total_beds ? parseInt(form.total_beds) : undefined,
        address_line1:       form.address_line1 || undefined,
        address_line2:       form.address_line2 || undefined,
        city:                form.city || undefined,
        state:               form.state || undefined,
        pincode:             form.pincode || undefined,
      })
      toast.success('Hospital information updated')
      router.push('/app/settings')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Basic Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Hospital Name <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. City General Hospital"
              className={inputClass}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Legal Name</label>
            <input
              value={form.legal_name}
              onChange={e => set('legal_name', e.target.value)}
              placeholder="Registered legal name (if different)"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Registration Number</label>
            <input
              value={form.registration_number}
              onChange={e => set('registration_number', e.target.value)}
              placeholder="e.g. MH/2020/1234"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Total Beds</label>
            <input
              type="number" min="0"
              value={form.total_beds}
              onChange={e => set('total_beds', e.target.value)}
              placeholder="e.g. 100"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Contact Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="info@hospital.com"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={e => set('website', e.target.value)}
              placeholder="https://www.hospital.com"
              className={inputClass}
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
              value={form.address_line1}
              onChange={e => set('address_line1', e.target.value)}
              placeholder="Street address, building name"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 2</label>
            <input
              value={form.address_line2}
              onChange={e => set('address_line2', e.target.value)}
              placeholder="Area, landmark (optional)"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="e.g. Mumbai"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>State</label>
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              className={inputClass}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Pincode</label>
            <input
              value={form.pincode}
              onChange={e => set('pincode', e.target.value)}
              placeholder="e.g. 400001"
              maxLength={6}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Link
          href="/app/settings"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
