'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment } from '../actions'
import { toast } from 'sonner'
import { Loader2, IndianRupee } from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition'
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

const METHODS = [
  { value: 'cash',        label: 'Cash' },
  { value: 'card',        label: 'Card' },
  { value: 'upi',         label: 'UPI' },
  { value: 'netbanking',  label: 'Net Banking' },
  { value: 'insurance',   label: 'Insurance' },
  { value: 'cheque',      label: 'Cheque' },
  { value: 'wallet',      label: 'Wallet' },
  { value: 'other',       label: 'Other' },
]

interface Props {
  invoiceId: string
  patientId: string
  balanceDue: number
}

export function RecordPaymentPanel({ invoiceId, patientId, balanceDue }: Props) {
  const router  = useRouter()
  const [amount,    setAmount]    = useState(balanceDue.toFixed(2))
  const [method,    setMethod]    = useState('cash')
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const showRef = ['card', 'upi', 'netbanking', 'cheque', 'insurance'].includes(method)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > balanceDue)  { toast.error(`Amount exceeds balance due (₹${balanceDue.toFixed(2)})`); return }

    setSaving(true)
    try {
      await recordPayment({
        invoice_id:       invoiceId,
        patient_id:       patientId,
        amount:           amt,
        payment_method:   method,
        reference_number: reference || undefined,
        notes:            notes     || undefined,
      })
      toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #038bbf0d, #00437b0d)' }}>
        <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
          Record Payment
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Balance due: <span className="font-bold text-red-600">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Amount */}
        <div>
          <label className={labelClass}>Amount (₹)</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="number" min="0.01" step="0.01" max={balanceDue}
              value={amount} onChange={e => setAmount(e.target.value)}
              className={inputClass + ' pl-9'} required
            />
          </div>
          {parseFloat(amount) < balanceDue && parseFloat(amount) > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Partial payment — ₹{(balanceDue - parseFloat(amount)).toFixed(2)} will remain due
            </p>
          )}
        </div>

        {/* Method */}
        <div>
          <label className={labelClass}>Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(m => (
              <button
                key={m.value} type="button"
                onClick={() => setMethod(m.value)}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-100"
                style={
                  method === m.value
                    ? { background: 'linear-gradient(135deg, #038bbf, #00437b)', color: '#fff', borderColor: '#038bbf' }
                    : { borderColor: '#e2e8f0', color: '#475569', background: '#fff' }
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference (conditional) */}
        {showRef && (
          <div>
            <label className={labelClass}>
              {method === 'upi' ? 'UPI Transaction ID' :
               method === 'card' ? 'Card Last 4 / Auth Code' :
               method === 'cheque' ? 'Cheque Number' :
               method === 'insurance' ? 'Claim / Auth Number' :
               'Reference Number'}
            </label>
            <input
              value={reference} onChange={e => setReference(e.target.value)}
              placeholder="Optional reference" className={inputClass}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <input
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note" className={inputClass}
          />
        </div>

        <button
          type="submit" disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Recording…' : 'Confirm Payment'}
        </button>
      </form>
    </div>
  )
}
