'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDrug } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const DRUG_FORMS = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection',
  'cream', 'ointment', 'drops', 'inhaler', 'patch',
  'suppository', 'powder', 'solution', 'lotion', 'gel', 'other',
]

const SCHEDULES = [
  { value: 'otc',           label: 'OTC (Over the Counter)' },
  { value: 'rx',            label: 'Rx (Prescription Only)' },
  { value: 'h',             label: 'H (Hospital Only)' },
  { value: 'h1',            label: 'H1 (Government Hospital)' },
  { value: 'x',             label: 'X (Narcotic / Controlled)' },
  { value: 'not_scheduled', label: 'Not Scheduled' },
]

const DRUG_CLASSES = [
  'Analgesic', 'Antibiotic', 'Antifungal', 'Antiviral', 'Antihistamine',
  'Antihypertensive', 'Antidiabetic', 'Antacid', 'Anticoagulant', 'Antidepressant',
  'Antiemetic', 'Antiepileptic', 'Anti-inflammatory', 'Bronchodilator',
  'Corticosteroid', 'Diuretic', 'Immunosuppressant', 'Laxative',
  'Muscle Relaxant', 'Proton Pump Inhibitor', 'Sedative', 'Thyroid Agent',
  'Vaccine', 'Vitamin / Supplement', 'Other',
]

export function NewDrugForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', generic_name: '', form: 'tablet', strength: '', unit: 'tablet',
    drug_class: '', schedule: 'rx', manufacturer: '',
    purchase_price: '', selling_price: '', mrp: '', tax_percent: '0',
    reorder_level: '10', reorder_quantity: '50',
    requires_prescription: true, is_narcotic: false,
    storage_instructions: '', contraindications: '',
  })

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())         { toast.error('Brand name is required'); return }
    if (!form.generic_name.trim()) { toast.error('Generic name is required'); return }
    if (!form.form)                { toast.error('Drug form is required'); return }
    if (!form.selling_price)       { toast.error('Selling price is required'); return }

    setSaving(true)
    try {
      await createDrug({
        name:                  form.name,
        generic_name:          form.generic_name,
        form:                  form.form,
        strength:              form.strength,
        unit:                  form.unit,
        drug_class:            form.drug_class,
        schedule:              form.schedule,
        manufacturer:          form.manufacturer,
        purchase_price:        parseFloat(form.purchase_price) || 0,
        selling_price:         parseFloat(form.selling_price)  || 0,
        mrp:                   form.mrp ? parseFloat(form.mrp) : undefined,
        tax_percent:           parseFloat(form.tax_percent)    || 0,
        reorder_level:         parseInt(form.reorder_level)    || 10,
        reorder_quantity:      parseInt(form.reorder_quantity) || 50,
        requires_prescription: form.requires_prescription,
        is_narcotic:           form.is_narcotic,
        storage_instructions:  form.storage_instructions,
        contraindications:     form.contraindications,
      })
      toast.success(`${form.name} added to drug catalog`)
      router.push('/app/pharmacy?tab=stock')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add drug')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Drug Identity */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Drug Identity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Brand Name <span className="text-red-400">*</span></label>
            <input
              value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Crocin" className={inputClass} required
            />
          </div>
          <div>
            <label className={labelClass}>Generic Name <span className="text-red-400">*</span></label>
            <input
              value={form.generic_name} onChange={e => set('generic_name', e.target.value)}
              placeholder="e.g. Paracetamol" className={inputClass} required
            />
          </div>
          <div>
            <label className={labelClass}>Form <span className="text-red-400">*</span></label>
            <select value={form.form} onChange={e => set('form', e.target.value)} className={inputClass}>
              {DRUG_FORMS.map(f => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Strength</label>
            <input
              value={form.strength} onChange={e => set('strength', e.target.value)}
              placeholder="e.g. 500mg, 5mg/5ml" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Unit of Measure</label>
            <input
              value={form.unit} onChange={e => set('unit', e.target.value)}
              placeholder="e.g. tablet, ml, mg" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Drug Class</label>
            <select value={form.drug_class} onChange={e => set('drug_class', e.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {DRUG_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Schedule</label>
            <select value={form.schedule} onChange={e => set('schedule', e.target.value)} className={inputClass}>
              {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Manufacturer</label>
            <input
              value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)}
              placeholder="e.g. GSK, Sun Pharma" className={inputClass}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mt-5 flex flex-wrap gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requires_prescription}
              onChange={e => set('requires_prescription', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#038bbf]"
            />
            <span className="text-sm text-slate-700">Requires prescription</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_narcotic}
              onChange={e => set('is_narcotic', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#038bbf]"
            />
            <span className="text-sm text-slate-700">Narcotic / controlled substance</span>
          </label>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Purchase Price (₹) <span className="text-red-400">*</span></label>
            <input
              type="number" min="0" step="0.01"
              value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}
              placeholder="0.00" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Selling Price (₹) <span className="text-red-400">*</span></label>
            <input
              type="number" min="0" step="0.01"
              value={form.selling_price} onChange={e => set('selling_price', e.target.value)}
              placeholder="0.00" className={inputClass} required
            />
          </div>
          <div>
            <label className={labelClass}>MRP (₹)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.mrp} onChange={e => set('mrp', e.target.value)}
              placeholder="Max retail price" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tax (%)</label>
            <input
              type="number" min="0" max="100" step="0.01"
              value={form.tax_percent} onChange={e => set('tax_percent', e.target.value)}
              placeholder="0" className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Stock Thresholds */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Stock Thresholds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Reorder Level</label>
            <input
              type="number" min="0"
              value={form.reorder_level} onChange={e => set('reorder_level', e.target.value)}
              placeholder="10" className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">Alert when stock falls below this</p>
          </div>
          <div>
            <label className={labelClass}>Reorder Quantity</label>
            <input
              type="number" min="0"
              value={form.reorder_quantity} onChange={e => set('reorder_quantity', e.target.value)}
              placeholder="50" className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">Suggested quantity to order</p>
          </div>
        </div>
      </section>

      {/* Storage & Notes */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Storage & Clinical Notes
        </h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Storage Instructions</label>
            <input
              value={form.storage_instructions} onChange={e => set('storage_instructions', e.target.value)}
              placeholder="e.g. Store below 25°C, away from direct sunlight" className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contraindications</label>
            <textarea
              value={form.contraindications} onChange={e => set('contraindications', e.target.value)}
              placeholder="Known contraindications or warnings…"
              rows={3} className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/pharmacy?tab=stock"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to pharmacy
        </Link>
        <button
          type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Adding…' : 'Add Drug'}
        </button>
      </div>

    </form>
  )
}
