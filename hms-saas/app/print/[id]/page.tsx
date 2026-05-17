import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

const formatINR = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n ?? 0)

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDING', partial: 'PARTIAL PAYMENT', paid: 'PAID', void: 'VOID', draft: 'DRAFT',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#d97706', partial: '#ea580c', paid: '#059669', void: '#94a3b8', draft: '#64748b',
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, hospitals(name, phone, email, address_line1, address_line2, city, state, pincode, registration_number)')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const { data: invoice } = await supabase
    .from('hospital_invoices')
    .select(`
      id, invoice_number, invoice_date, invoice_type, due_date,
      subtotal, discount_percent, discount_amount, discount_reason,
      tax_amount, total_amount, paid_amount, balance_due, status, notes, created_at,
      patients(id, full_name, mrn, phone, email, date_of_birth, address_line1, address_line2, city, state, pincode),
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
    .select('id, payment_number, amount, payment_method, reference_number, paid_at')
    .eq('invoice_id', id)
    .eq('status', 'completed')
    .order('paid_at', { ascending: true })

  const hospital = profile.hospitals as any
  const patient  = invoice.patients as any
  const items    = (invoice.invoice_items as any[]).sort((a, b) => a.sort_order - b.sort_order)

  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #f8fafc;
    }
    .page {
      max-width: 800px;
      margin: 30px auto;
      padding: 40px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #038bbf;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .hospital-name {
      font-size: 20px;
      font-weight: 700;
      color: #00437b;
      margin-bottom: 4px;
    }
    .hospital-meta {
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .invoice-title { text-align: right; }
    .invoice-title h1 {
      font-size: 26px;
      font-weight: 800;
      color: #038bbf;
      letter-spacing: -0.5px;
    }
    .invoice-title .invoice-no { font-size: 13px; color: #475569; margin-top: 2px; }
    .invoice-title .invoice-date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .status-stamp {
      display: inline-block;
      border: 2px solid;
      border-radius: 4px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 6px;
      opacity: 0.85;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .party-meta { font-size: 11px; color: #64748b; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    thead th {
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
    }
    thead th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 10px 12px; vertical-align: top; font-size: 12px; color: #334155; }
    tbody td.right { text-align: right; }
    tbody td.item-name { font-weight: 600; color: #0f172a; }
    tbody td.desc { font-size: 11px; color: #94a3b8; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-table {
      min-width: 260px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total { background: #038bbf; color: white; font-weight: 700; font-size: 14px; }
    .totals-row.balance { background: #fee2e2; color: #dc2626; font-weight: 700; }
    .totals-row.paid-row { background: #d1fae5; color: #059669; font-weight: 600; }
    .payments { margin-bottom: 24px; }
    .payments h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
    }
    .payment-row span.amt { font-weight: 600; color: #059669; }
    .notes-block {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .notes-block strong { color: #475569; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer strong { color: #475569; }
    @media print {
      button { display: none !important; }
      body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { margin: 0; box-shadow: none; border-radius: 0; padding: 20px; }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <PrintButton />

      <div className="page">
        {/* Header */}
        <div className="header">
          <div>
            <div className="hospital-name">{hospital?.name ?? 'Hospital'}</div>
            <div className="hospital-meta">
              {hospital?.registration_number && <>Reg. No: {hospital.registration_number}<br /></>}
              {[hospital?.address_line1, hospital?.city, hospital?.state, hospital?.pincode].filter(Boolean).join(', ')}<br />
              {hospital?.phone && <>Tel: {hospital.phone}</>}
              {hospital?.phone && hospital?.email && ' · '}
              {hospital?.email && <>Email: {hospital.email}</>}
            </div>
          </div>
          <div className="invoice-title">
            <h1>INVOICE</h1>
            <div className="invoice-no">#{invoice.invoice_number}</div>
            <div className="invoice-date">{invoiceDate}</div>
            {invoice.due_date && (
              <div className="invoice-date">
                Due: {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            <div
              className="status-stamp"
              style={{ color: STATUS_COLORS[invoice.status] ?? '#64748b', borderColor: STATUS_COLORS[invoice.status] ?? '#64748b' }}
            >
              {STATUS_LABELS[invoice.status] ?? invoice.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="parties">
          <div>
            <div className="party-label">Bill To</div>
            <div className="party-name">{patient?.full_name ?? '—'}</div>
            <div className="party-meta">
              {patient?.mrn && <>MRN: {patient.mrn}<br /></>}
              {patient?.phone && <>{patient.phone}<br /></>}
              {patient?.email && <>{patient.email}<br /></>}
              {[patient?.address_line1, patient?.city, patient?.state, patient?.pincode].filter(Boolean).join(', ')}
            </div>
          </div>
          <div>
            <div className="party-label">Invoice Details</div>
            <div className="party-meta">
              <strong>Type:</strong> {invoice.invoice_type.toUpperCase()}<br />
              <strong>Invoice No:</strong> {invoice.invoice_number}<br />
              <strong>Date:</strong> {invoiceDate}<br />
              {invoice.due_date && (
                <><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString('en-IN')}<br /></>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Description</th>
              <th className="right" style={{ width: 60 }}>Qty</th>
              <th className="right" style={{ width: 100 }}>Rate</th>
              <th className="right" style={{ width: 70 }}>Tax</th>
              <th className="right" style={{ width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr key={item.id}>
                <td style={{ color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
                <td>
                  <div className="item-name">{item.item_name}</div>
                  {item.description && <div className="desc">{item.description}</div>}
                  {item.discount_percent > 0 && (
                    <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>
                      Discount: {item.discount_percent}% (−{formatINR(item.discount_amount)})
                    </div>
                  )}
                </td>
                <td className="right">{item.quantity} {item.unit !== 'unit' ? item.unit : ''}</td>
                <td className="right">{formatINR(item.unit_price)}</td>
                <td className="right" style={{ color: '#94a3b8' }}>
                  {item.tax_percent > 0 ? `${item.tax_percent}%` : '—'}
                </td>
                <td className="right" style={{ fontWeight: 600 }}>{formatINR(item.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="totals-table">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatINR(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="totals-row" style={{ color: '#16a34a' }}>
                <span>Discount{invoice.discount_reason ? ` (${invoice.discount_reason})` : ''}</span>
                <span>− {formatINR(invoice.discount_amount)}</span>
              </div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="totals-row">
                <span>Tax</span>
                <span>+ {formatINR(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="totals-row total">
              <span>Total Amount</span>
              <span>{formatINR(invoice.total_amount)}</span>
            </div>
            {Number(invoice.paid_amount) > 0 && (
              <>
                <div className="totals-row paid-row">
                  <span>Amount Paid</span>
                  <span>− {formatINR(invoice.paid_amount)}</span>
                </div>
                <div className="totals-row balance">
                  <span>Balance Due</span>
                  <span>{formatINR(invoice.balance_due)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment history */}
        {payments && payments.length > 0 && (
          <div className="payments">
            <h3>Payment History</h3>
            {payments.map((pmt: any) => (
              <div key={pmt.id} className="payment-row">
                <span>
                  {new Date(pmt.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{pmt.payment_method.toUpperCase()}
                  {pmt.reference_number && ` · Ref: ${pmt.reference_number}`}
                  {' · '}<span style={{ color: '#94a3b8', fontSize: 10 }}>{pmt.payment_number}</span>
                </span>
                <span className="amt">{formatINR(pmt.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="notes-block">
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Thank you for choosing <strong>{hospital?.name ?? 'our hospital'}</strong>. This is a computer-generated invoice.</p>
          <p style={{ marginTop: 4 }}>For queries, contact us at {hospital?.email ?? ''} | {hospital?.phone ?? ''}</p>
        </div>
      </div>
    </>
  )
}
