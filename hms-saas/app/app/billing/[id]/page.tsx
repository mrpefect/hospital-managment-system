import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { RecordPaymentPanel } from './RecordPaymentPanel'

export const dynamic = 'force-dynamic'

const formatINR = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n ?? 0)

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#64748b', bg: '#f1f5f9' },
  pending:  { label: 'Pending',  color: '#d97706', bg: '#fef3c7' },
  partial:  { label: 'Partial',  color: '#ea580c', bg: '#ffedd5' },
  paid:     { label: 'Paid',     color: '#059669', bg: '#d1fae5' },
  void:     { label: 'Void',     color: '#94a3b8', bg: '#f1f5f9' },
  refunded: { label: 'Refunded', color: '#7c3aed', bg: '#ede9fe' },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', upi: 'UPI', netbanking: 'Net Banking',
  cheque: 'Cheque', dd: 'DD', insurance: 'Insurance', wallet: 'Wallet',
  credit: 'Credit', other: 'Other',
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('hospital_id, hospitals(name)').eq('auth_user_id', user.id).single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const { data: invoice } = await supabase
    .from('hospital_invoices')
    .select(`
      id, invoice_number, invoice_date, invoice_type, due_date,
      subtotal, discount_percent, discount_amount, discount_reason,
      tax_amount, total_amount, paid_amount, balance_due, status,
      notes, created_at,
      patients(id, full_name, mrn, phone, email, address_line1, city, state),
      invoice_items(id, item_name, description, quantity, unit, unit_price,
        discount_percent, discount_amount, tax_percent, tax_amount, total_amount, sort_order)
    `)
    .eq('id', id)
    .eq('hospital_id', profile.hospital_id)
    .is('deleted_at', null)
    .single()

  if (!invoice) notFound()

  const { data: payments } = await supabase
    .from('payments')
    .select('id, payment_number, amount, payment_method, reference_number, paid_at, notes')
    .eq('invoice_id', id)
    .eq('status', 'completed')
    .order('paid_at', { ascending: true })

  const patient   = invoice.patients as any
  const items     = (invoice.invoice_items as any[]).sort((a, b) => a.sort_order - b.sort_order)
  const statusMeta = STATUS_META[invoice.status] ?? STATUS_META.pending
  const isPaid     = invoice.status === 'paid'
  const isVoid     = invoice.status === 'void'
  const hospital   = (profile.hospitals as any)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href="/app/billing"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to billing
        </Link>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: statusMeta.bg, color: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
          <Link
            href={`/print/${id}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left — invoice details */}
        <div className="xl:col-span-2 space-y-5">

          {/* Header card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
                  Invoice #{invoice.invoice_number}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {invoice.due_date && ` · Due ${new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold" style={{ color: '#038bbf', fontFamily: 'var(--font-lato)' }}>
                  {formatINR(invoice.total_amount)}
                </p>
              </div>
            </div>

            {/* Patient info */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Patient</p>
              <p className="font-semibold text-slate-800">{patient?.full_name ?? '—'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {patient?.mrn   && <p className="text-xs text-slate-500 font-mono">MRN: {patient.mrn}</p>}
                {patient?.phone && <p className="text-xs text-slate-500">{patient.phone}</p>}
                {patient?.email && <p className="text-xs text-slate-500">{patient.email}</p>}
              </div>
              {patient?.address_line1 && (
                <p className="text-xs text-slate-400 mt-1">
                  {[patient.address_line1, patient.city, patient.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
                Services &amp; Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Rate</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Tax</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{item.item_name}</p>
                        {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                        {item.discount_percent > 0 && (
                          <p className="text-xs text-green-600 mt-0.5">Disc: {item.discount_percent}%</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {item.quantity} {item.unit !== 'unit' ? item.unit : ''}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">{formatINR(item.unit_price)}</td>
                      <td className="px-5 py-3.5 text-right text-slate-500 text-xs">
                        {item.tax_percent > 0 ? `${item.tax_percent}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                        {formatINR(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals footer */}
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-700">{formatINR(invoice.subtotal)}</span>
                </div>
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Discount{invoice.discount_reason ? ` (${invoice.discount_reason})` : ''}
                    </span>
                    <span className="font-medium text-green-600">− {formatINR(invoice.discount_amount)}</span>
                  </div>
                )}
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium text-slate-700">+ {formatINR(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-lg" style={{ color: '#038bbf' }}>{formatINR(invoice.total_amount)}</span>
                </div>
                {Number(invoice.paid_amount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Paid</span>
                      <span className="font-medium text-green-600">− {formatINR(invoice.paid_amount)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between">
                      <span className="font-bold text-slate-900">Balance Due</span>
                      <span className="font-bold text-lg text-red-600">{formatINR(invoice.balance_due)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment history */}
          {payments && payments.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'var(--font-lato)' }}>
                  Payment History
                </h2>
              </div>
              <ul className="divide-y divide-slate-50">
                {payments.map((pmt: any) => (
                  <li key={pmt.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{formatINR(pmt.amount)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {PAYMENT_METHOD_LABELS[pmt.payment_method] ?? pmt.payment_method}
                        {pmt.reference_number ? ` · Ref: ${pmt.reference_number}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-slate-400">{pmt.payment_number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(pmt.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right — payment panel */}
        <div className="space-y-5">
          {!isPaid && !isVoid ? (
            <RecordPaymentPanel
              invoiceId={invoice.id}
              patientId={patient?.id}
              balanceDue={Number(invoice.balance_due)}
            />
          ) : isPaid ? (
            <div className="rounded-2xl bg-green-50 border border-green-200 shadow-sm p-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-green-800">Fully Paid</p>
              <p className="text-xs text-green-600 mt-1">No balance due</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 shadow-sm p-5 text-center">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">Invoice Void</p>
              <p className="text-xs text-slate-400 mt-1">This invoice has been cancelled</p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
