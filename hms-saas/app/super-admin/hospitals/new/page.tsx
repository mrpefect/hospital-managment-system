'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const HOSPITAL_TYPES: { value: string; label: string }[] = [
  { value: 'general',           label: 'General Hospital'   },
  { value: 'multi_specialty',   label: 'Multi-Specialty'    },
  { value: 'specialty',         label: 'Specialty Hospital' },
  { value: 'clinic',            label: 'Clinic'             },
  { value: 'diagnostic_center', label: 'Diagnostic Center'  },
  { value: 'nursing_home',      label: 'Nursing Home'       },
  { value: 'dental',            label: 'Dental'             },
  { value: 'eye',               label: 'Eye Hospital'       },
]

const inputClass =
  'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm w-full transition'

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    + '-' + Date.now().toString(36)
}

export default function NewHospitalPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', website: '',
    address_line1: '', address_line2: '',
    city: '', state: '', pincode: '', country: 'IN',
    registration_number: '', total_beds: '', type: 'general',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const supabase = createClient()
        const payload: any = {
          slug:                generateSlug(form.name),
          name:                form.name,
          email:               form.email,
          phone:               form.phone,
          website:             form.website  || null,
          address_line1:       form.address_line1 || null,
          address_line2:       form.address_line2 || null,
          city:                form.city,
          state:               form.state,
          pincode:             form.pincode  || null,
          country:             form.country  || 'IN',
          registration_number: form.registration_number || null,
          total_beds:          form.total_beds ? Number(form.total_beds) : 0,
          type:                form.type,
          onboarding_status:   'approved',
        }

        const { data, error } = await supabase
          .from('hospitals')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw new Error(error.message)
        toast.success('Hospital added successfully')
        router.push(`/super-admin/hospitals/${data.id}`)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to add hospital')
      }
    })
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        href="/super-admin/hospitals"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to hospitals
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Add Hospital
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Manually onboard a hospital to the platform</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Hospital Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className={inputClass} placeholder="City General Hospital" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Email *</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={inputClass} placeholder="admin@hospital.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Phone *</label>
              <input required value={form.phone} onChange={e => set('phone', e.target.value)}
                className={inputClass} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)}
                className={inputClass} placeholder="https://hospital.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Hospital Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
                {HOSPITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Total Beds</label>
              <input type="number" min="0" value={form.total_beds} onChange={e => set('total_beds', e.target.value)}
                className={inputClass} placeholder="100" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Registration No.</label>
              <input value={form.registration_number} onChange={e => set('registration_number', e.target.value)}
                className={inputClass} placeholder="MH-2024-12345" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
            Address
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Address Line 1</label>
              <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)}
                className={inputClass} placeholder="123 MG Road" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Address Line 2</label>
              <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)}
                className={inputClass} placeholder="Near Railway Station" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">City *</label>
              <input required value={form.city} onChange={e => set('city', e.target.value)}
                className={inputClass} placeholder="Mumbai" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">State *</label>
              <input required value={form.state} onChange={e => set('state', e.target.value)}
                className={inputClass} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Pincode</label>
              <input value={form.pincode} onChange={e => set('pincode', e.target.value)}
                className={inputClass} placeholder="400001" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Country Code</label>
              <input value={form.country} onChange={e => set('country', e.target.value)}
                className={inputClass} placeholder="IN" maxLength={5} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/super-admin/hospitals"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-[#038bbf] hover:bg-[#0299d0] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors">
            <Building2 className="h-4 w-4" />
            {isPending ? 'Adding…' : 'Add Hospital'}
          </button>
        </div>
      </form>
    </div>
  )
}
