import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '../../[id]/PrintButton'

export const dynamic = 'force-dynamic'

function calcAge(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

const GENDER_LABEL: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Not specified',
}

export default async function PrintPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, hospitals(name, phone, email, address_line1, address_line2, city, state, pincode)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.hospital_id) redirect('/login')

  const { data: rx } = await supabase
    .from('prescriptions')
    .select(`
      id, prescription_date, diagnosis, notes, follow_up_date,
      patients(full_name, mrn, gender, date_of_birth, phone),
      doctor_profiles(
        specialization, qualification, registration_number, consultation_fee,
        profiles(full_name)
      ),
      prescription_items(
        id, medicine_name, dosage, frequency, duration, route, instructions, sort_order
      )
    `)
    .eq('id', id)
    .eq('hospital_id', profile.hospital_id)
    .single()

  if (!rx) notFound()

  const hospital  = profile.hospitals as any
  const patient   = rx.patients as any
  const doctor    = rx.doctor_profiles as any
  const doctorName = doctor?.profiles?.full_name ?? ''
  const items     = ((rx.prescription_items as any[]) ?? []).sort((a, b) => a.sort_order - b.sort_order)

  const age = calcAge(patient?.date_of_birth)
  const rxDate = new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const followUpFmt = rx.follow_up_date
    ? new Date(rx.follow_up_date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #f1f5f9;
    }
    .page {
      max-width: 760px;
      margin: 28px auto;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      overflow: hidden;
    }

    /* ── Header strip ── */
    .header {
      background: linear-gradient(135deg, #4c1d95, #7c3aed);
      padding: 22px 32px 20px;
      color: #fff;
    }
    .header-inner { display: flex; justify-content: space-between; align-items: flex-start; }
    .hospital-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .hospital-meta { font-size: 11px; opacity: 0.75; line-height: 1.7; }
    .rx-date { text-align: right; }
    .rx-label {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
      opacity: 0.25;
    }
    .rx-date-val { font-size: 12px; opacity: 0.8; margin-top: 2px; }

    /* ── Doctor + Patient strip ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .party {
      padding: 16px 32px;
    }
    .party:first-child { border-right: 1px solid #e2e8f0; }
    .party-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .party-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .party-meta { font-size: 11px; color: #64748b; line-height: 1.75; }
    .party-meta .highlight { color: #7c3aed; font-weight: 600; }

    /* ── Body ── */
    .body { padding: 24px 32px; }

    /* Diagnosis */
    .section { margin-bottom: 22px; }
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #94a3b8;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #f1f5f9;
    }
    .diagnosis-text {
      font-size: 13px;
      color: #334155;
      background: #faf5ff;
      border-left: 3px solid #7c3aed;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      line-height: 1.6;
    }

    /* Rx symbol */
    .rx-symbol {
      font-size: 32px;
      font-weight: 900;
      color: #7c3aed;
      opacity: 0.15;
      float: left;
      margin-right: 12px;
      margin-top: -4px;
      line-height: 1;
    }

    /* Medicine list */
    .med-list { list-style: none; counter-reset: med-counter; }
    .med-item {
      counter-increment: med-counter;
      display: flex;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .med-item:last-child { border-bottom: none; }
    .med-num {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: linear-gradient(135deg, #7c3aed, #4c1d95);
      border-radius: 50%;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      shrink: 0;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .med-num::before { content: counter(med-counter); }
    .med-details { flex: 1; }
    .med-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .med-dosage { font-size: 12px; color: #7c3aed; font-weight: 600; }
    .med-sig {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .med-sig-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 1px 8px;
      font-size: 11px;
    }
    .med-instructions {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      font-style: italic;
    }

    /* Advice */
    .advice-text {
      font-size: 12px;
      color: #475569;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    /* Follow-up */
    .followup {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #7c3aed;
    }
    .followup-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.7; }

    /* Footer / signature */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 20px 32px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 8px;
    }
    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      max-width: 280px;
      line-height: 1.6;
    }
    .signature-block { text-align: right; }
    .signature-line {
      border-bottom: 1px solid #7c3aed;
      width: 160px;
      margin-left: auto;
      margin-bottom: 6px;
      height: 36px;
    }
    .sig-name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .sig-meta { font-size: 11px; color: #64748b; line-height: 1.6; }

    /* Print styles */
    @media print {
      button { display: none !important; }
      body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { margin: 0; box-shadow: none; border-radius: 0; }
      @page { margin: 10mm; }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <PrintButton />

      <div className="page">

        {/* Header */}
        <div className="header">
          <div className="header-inner">
            <div>
              <div className="hospital-name">{hospital?.name ?? 'Hospital'}</div>
              <div className="hospital-meta">
                {[hospital?.address_line1, hospital?.city, hospital?.state, hospital?.pincode].filter(Boolean).join(', ')}
                {hospital?.phone && <><br />Tel: {hospital.phone}</>}
                {hospital?.email && <> &nbsp;·&nbsp; {hospital.email}</>}
              </div>
            </div>
            <div className="rx-date">
              <div className="rx-label">Rx</div>
              <div className="rx-date-val">{rxDate}</div>
            </div>
          </div>
        </div>

        {/* Doctor + Patient */}
        <div className="parties">
          <div className="party">
            <div className="party-label">Prescribed by</div>
            <div className="party-name">Dr. {doctorName}</div>
            <div className="party-meta">
              {doctor?.specialization && <span className="highlight">{doctor.specialization}</span>}
              {doctor?.qualification && <><br />{doctor.qualification}</>}
              {doctor?.registration_number && <><br />Reg. No: {doctor.registration_number}</>}
            </div>
          </div>
          <div className="party">
            <div className="party-label">Patient</div>
            <div className="party-name">{patient?.full_name}</div>
            <div className="party-meta">
              <span className="highlight">{patient?.mrn}</span>
              {age !== null && <><br />Age: {age} years</>}
              {patient?.gender && <> &nbsp;·&nbsp; {GENDER_LABEL[patient.gender] ?? patient.gender}</>}
              {patient?.phone && <><br />{patient.phone}</>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="body">

          {/* Diagnosis */}
          {rx.diagnosis && (
            <div className="section">
              <div className="section-title">Diagnosis / Chief Complaint</div>
              <div className="diagnosis-text">{rx.diagnosis}</div>
            </div>
          )}

          {/* Medicines */}
          {items.length > 0 && (
            <div className="section">
              <div className="section-title">
                <span style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>℞</span>
                Medicines
              </div>
              <ul className="med-list">
                {items.map((item: any) => (
                  <li key={item.id} className="med-item">
                    <div className="med-num" />
                    <div className="med-details">
                      <div className="med-name">
                        {item.medicine_name}
                        {item.dosage && <span className="med-dosage"> &nbsp;{item.dosage}</span>}
                      </div>
                      <div className="med-sig">
                        {item.frequency && <span className="med-sig-pill">{item.frequency}</span>}
                        {item.duration && <span className="med-sig-pill">× {item.duration}</span>}
                        {item.route && <span className="med-sig-pill">{item.route}</span>}
                      </div>
                      {item.instructions && (
                        <div className="med-instructions">* {item.instructions}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Advice */}
          {rx.notes && (
            <div className="section">
              <div className="section-title">Advice &amp; Instructions</div>
              <p className="advice-text">{rx.notes}</p>
            </div>
          )}

          {/* Follow-up */}
          {followUpFmt && (
            <div className="section">
              <div className="section-title">Follow-up</div>
              <div className="followup">
                <span className="followup-label">Next Visit:</span>
                {followUpFmt}
              </div>
            </div>
          )}

        </div>

        {/* Footer / Signature */}
        <div className="footer">
          <div className="footer-note">
            This prescription is valid for 30 days from the date of issue.<br />
            This is a computer-generated prescription from {hospital?.name ?? 'our hospital'}.
          </div>
          <div className="signature-block">
            <div className="signature-line" />
            <div className="sig-name">Dr. {doctorName}</div>
            <div className="sig-meta">
              {doctor?.qualification && <>{doctor.qualification}<br /></>}
              {doctor?.specialization && <>{doctor.specialization}<br /></>}
              {doctor?.registration_number && <>Reg. No: {doctor.registration_number}</>}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
