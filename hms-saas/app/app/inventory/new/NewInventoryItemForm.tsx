'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInventoryItem } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const ITEM_TYPES = [
  { value: 'consumable',         label: 'Consumable' },
  { value: 'equipment',          label: 'Equipment' },
  { value: 'instrument',         label: 'Instrument' },
  { value: 'linen',              label: 'Linen' },
  { value: 'it_asset',           label: 'IT Asset' },
  { value: 'furniture',          label: 'Furniture' },
  { value: 'medicine_accessory', label: 'Medicine Accessory' },
  { value: 'other',              label: 'Other' },
]

const UNITS = ['piece', 'box', 'carton', 'bottle', 'kg', 'g', 'litre', 'ml', 'pair', 'set', 'roll', 'sheet', 'vial', 'ampoule', 'strip', 'other']

interface Category { id: string; name: string }
interface Props { categories: Category[] }

export function NewInventoryItemForm({ categories }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:             '',
    code:             '',
    item_type:        '',
    unit_of_measure:  '',
    category_id:      '',
    reorder_level:    '',
    reorder_quantity: '',
    description:      '',
    initial_quantity: '',
    location_name:    '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())          { toast.error('Item name is required'); return }
    if (!form.item_type)            { toast.error('Please select item type'); return }
    if (!form.unit_of_measure.trim()) { toast.error('Unit of measure is required'); return }

    setSaving(true)
    try {
      await createInventoryItem({
        name:             form.name,
        code:             form.code || undefined,
        item_type:        form.item_type,
        unit_of_measure:  form.unit_of_measure,
        category_id:      form.category_id || undefined,
        reorder_level:    form.reorder_level ? parseInt(form.reorder_level) : undefined,
        reorder_quantity: form.reorder_quantity ? parseInt(form.reorder_quantity) : undefined,
        description:      form.description || undefined,
        initial_quantity: form.initial_quantity ? parseInt(form.initial_quantity) : undefined,
        location_name:    form.location_name || undefined,
      })
      toast.success('Inventory item added')
      router.push('/app/inventory')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Identity */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Item Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Item Name <span className="text-red-400">*</span></label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Surgical Gloves (Medium)"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Item Code / SKU</label>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value)}
              placeholder="e.g. SG-MED-001"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Item Type <span className="text-red-400">*</span></label>
            <select
              value={form.item_type}
              onChange={e => set('item_type', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select type</option>
              {ITEM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Unit of Measure <span className="text-red-400">*</span></label>
            <select
              value={form.unit_of_measure}
              onChange={e => set('unit_of_measure', e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select unit</option>
              {UNITS.map(u => (
                <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional notes about this item"
              rows={2}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>
      </section>

      {/* Stock Thresholds */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Stock Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Reorder Level</label>
            <input
              type="number" min="0"
              value={form.reorder_level}
              onChange={e => set('reorder_level', e.target.value)}
              placeholder="e.g. 10"
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">Alert when stock falls to this level</p>
          </div>

          <div>
            <label className={labelClass}>Reorder Quantity</label>
            <input
              type="number" min="0"
              value={form.reorder_quantity}
              onChange={e => set('reorder_quantity', e.target.value)}
              placeholder="e.g. 50"
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">Suggested quantity to reorder</p>
          </div>
        </div>
      </section>

      {/* Opening Stock */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
          Opening Stock <span className="text-slate-400 font-normal text-xs">(optional)</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5">Set initial stock quantity when adding the item.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Opening Quantity</label>
            <input
              type="number" min="0"
              value={form.initial_quantity}
              onChange={e => set('initial_quantity', e.target.value)}
              placeholder="e.g. 100"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Storage Location</label>
            <input
              value={form.location_name}
              onChange={e => set('location_name', e.target.value)}
              placeholder="e.g. Store Room A, Ward 2"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/inventory"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to inventory
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Add Item'}
        </button>
      </div>
    </form>
  )
}
