'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, type InvoiceLineItem } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Search, X } from 'lucide-react'
import Link from 'next/link'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const INVOICE_TYPES = [
  { value: 'opd',       label: 'OPD — Outpatient' },
  { value: 'ipd',       label: 'IPD — Inpatient' },
  { value: 'pharmacy',  label: 'Pharmacy' },
  { value: 'lab',       label: 'Laboratory' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'misc',      label: 'Miscellaneous' },
]

interface Service { id: string; name: string; code: string | null; rate: number; tax_percent: number; unit: string }
interface Patient  { id: string; full_name: string; mrn: string }

interface LineItem extends InvoiceLineItem {
  key: number
}

interface Props {
  services: Service[]
  prefillPatient: Patient | null
  prefillAppointmentId: string | null
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)
}

let KEY = 1

export function NewInvoiceForm({ services, prefillPatient, prefillAppointmentId }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Patient selection
  const [patient, setPatient]         = useState<Patient | null>(prefillPatient)
  const [patientQ, setPatientQ]       = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [searchingPt, setSearchingPt] = useState(false)

  // Invoice meta
  const [invoiceType, setInvoiceType]   = useState('opd')
  const [invoiceDate, setInvoiceDate]   = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate]           = useState('')
  const [discountPct, setDiscountPct]   = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [notes, setNotes]               = useState('')

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { key: KEY++, item_name: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0 },
  ])

  // Patient search
  const searchPatients = useCallback(async (q: string) => {
    setPatientQ(q)
    if (q.trim().length < 2) { setPatientResults([]); return }
    setSearchingPt(true)
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setPatientResults(await res.json())
    } finally {
      setSearchingPt(false)
    }
  }, [])

  function selectPatient(p: Patient) {
    setPatient(p)
    setPatientQ('')
    setPatientResults([])
  }

  // Line item helpers
  function addItem() {
    setItems(prev => [...prev, { key: KEY++, item_name: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0 }])
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function updateItem(key: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  function applyService(key: number, svc: Service) {
    setItems(prev => prev.map(i =>
      i.key === key
        ? { ...i, item_name: svc.name, unit_price: svc.rate, tax_percent: svc.tax_percent, service_id: svc.id }
        : i
    ))
  }

  // Totals
  const lineSubtotals = items.map(i => {
    const gross = (i.quantity || 0) * (i.unit_price || 0)
    const disc  = gross * ((i.discount_percent || 0) / 100)
    const tax   = (gross - disc) * ((i.tax_percent || 0) / 100)
    return { gross, disc, tax, net: gross - disc + tax }
  })
  const subtotal    = lineSubtotals.reduce((s, l) => s + l.gross - l.disc, 0)
  const totalTax    = lineSubtotals.reduce((s, l) => s + l.tax, 0)
  const discountAmt = subtotal * ((parseFloat(discountPct) || 0) / 100)
  const grandTotal  = subtotal - discountAmt + totalTax

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient)               { toast.error('Select a patient'); return }
    if (items.length === 0)     { toast.error('Add at least one line item'); return }
    if (items.some(i => !i.item_name.trim())) { toast.error('All items need a name'); return }

    setSaving(true)
    try {
      const { invoice_number } = await createInvoice({
        patient_id:       patient.id,
        invoice_type:     invoiceType,
        invoice_date:     invoiceDate,
        due_date:         dueDate || undefined,
        discount_percent: parseFloat(discountPct) || 0,
        discount_reason:  discountReason || undefined,
        notes:            notes || undefined,
        appointment_id:   prefillAppointmentId || undefined,
        items: items.map(i => ({
          item_name:        i.item_name,
          quantity:         Number(i.quantity),
          unit_price:       Number(i.unit_price),
          discount_percent: Number(i.discount_percent || 0),
          tax_percent:      Number(i.tax_percent || 0),
          service_id:       i.service_id,
        })),
      })
      toast.success(`Invoice ${invoice_number} created`)
      router.push('/app/billing')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Patient + Meta */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
          Invoice Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Patient */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Patient <span className="text-red-400">*</span></label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl border border-[#038bbf] bg-[#038bbf]/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{patient.full_name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">MRN: {patient.mrn}</p>
                </div>
                <button type="button" onClick={() => setPatient(null)}
                  className="ml-3 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  value={patientQ}
                  onChange={e => searchPatients(e.target.value)}
                  placeholder="Search patient by name or MRN…"
                  className={inputClass + ' pl-9'}
                  autoComplete="off"
                />
                {searchingPt && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
                {patientResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {patientResults.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectPatient(p)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono">MRN: {p.mrn}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Invoice Type</label>
            <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)} className={inputClass}>
              {INVOICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Invoice Date</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* Line Items */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
            Line Items
          </h2>
          <button
            type="button" onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>

        <div className="divide-y divide-slate-50">
          {items.map((item, idx) => {
            const ls = lineSubtotals[idx]
            return (
              <div key={item.key} className="p-5">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Name + service lookup */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className={labelClass}>Description</label>
                    <div className="relative">
                      <input
                        value={item.item_name}
                        onChange={e => updateItem(item.key, 'item_name', e.target.value)}
                        placeholder="Service or item name"
                        className={inputClass}
                        list={`svc-list-${item.key}`}
                      />
                      {services.length > 0 && (
                        <datalist id={`svc-list-${item.key}`}>
                          {services.map(s => (
                            <option key={s.id} value={s.name} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    {/* Service quick-fill chips */}
                    {services.length > 0 && !item.item_name && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {services.slice(0, 6).map(s => (
                          <button
                            key={s.id} type="button"
                            onClick={() => applyService(item.key, s)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-[#038bbf]/10 hover:border-[#038bbf]/30 transition-colors"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-1">
                    <label className={labelClass}>Qty</label>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={item.quantity}
                      onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                      className={inputClass + ' text-center'}
                    />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-8 sm:col-span-2">
                    <label className={labelClass}>Unit Price (₹)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(item.key, 'unit_price', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Discount % */}
                  <div className="col-span-6 sm:col-span-1">
                    <label className={labelClass}>Disc %</label>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={item.discount_percent}
                      onChange={e => updateItem(item.key, 'discount_percent', e.target.value)}
                      className={inputClass + ' text-center'}
                    />
                  </div>

                  {/* Tax % */}
                  <div className="col-span-6 sm:col-span-1">
                    <label className={labelClass}>Tax %</label>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={item.tax_percent}
                      onChange={e => updateItem(item.key, 'tax_percent', e.target.value)}
                      className={inputClass + ' text-center'}
                    />
                  </div>

                  {/* Total + delete */}
                  <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                    <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {formatINR(ls?.net ?? 0)}
                    </p>
                    {items.length > 1 && (
                      <button
                        type="button" onClick={() => removeItem(item.key)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Discount + Notes + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Discount + notes */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
            Discount & Notes
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Overall Discount %</label>
              <input
                type="number" min="0" max="100" step="0.01"
                value={discountPct} onChange={e => setDiscountPct(e.target.value)}
                placeholder="0" className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Reason</label>
              <input
                value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                placeholder="e.g. Staff, Senior" className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Any remarks for this invoice…"
              className={inputClass + ' resize-none'}
            />
          </div>
        </section>

        {/* Totals summary */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-5" style={{ fontFamily: 'var(--font-lato)' }}>
            Summary
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-slate-800">{formatINR(subtotal)}</dd>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Discount ({discountPct}%)</dt>
                <dd className="font-semibold text-red-600">− {formatINR(discountAmt)}</dd>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Tax</dt>
                <dd className="font-semibold text-slate-800">+ {formatINR(totalTax)}</dd>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between">
              <dt className="text-base font-bold text-slate-900">Total</dt>
              <dd
                className="text-xl font-bold"
                style={{ color: '#038bbf', fontFamily: 'var(--font-lato)' }}
              >
                {formatINR(grandTotal)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/billing"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to billing
        </Link>
        <button
          type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>

    </form>
  )
}
