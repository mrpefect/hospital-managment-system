'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, CheckCircle2, Building2, CreditCard, User, FileText, ChevronRight, Loader2, Check } from 'lucide-react'
import { createHospital, savePlanSelection, saveAdminProfile, submitForReview } from './actions'
import { toast } from 'sonner'

const HOSPITAL_TYPES = [
  { value: 'general',           label: 'General Hospital'   },
  { value: 'multi_specialty',   label: 'Multi-Specialty'    },
  { value: 'specialty',         label: 'Specialty Hospital' },
  { value: 'clinic',            label: 'Clinic'             },
  { value: 'diagnostic_center', label: 'Diagnostic Center'  },
  { value: 'nursing_home',      label: 'Nursing Home'       },
  { value: 'dental',            label: 'Dental Hospital'    },
  { value: 'eye',               label: 'Eye Hospital'       },
]

const DESIGNATIONS = [
  'CEO / Managing Director', 'Medical Director', 'Hospital Administrator',
  'COO', 'Finance Director', 'IT Manager', 'Other',
]

const STEPS = [
  { number: 1, label: 'Hospital Info',    icon: Building2  },
  { number: 2, label: 'Choose Plan',      icon: CreditCard },
  { number: 3, label: 'Admin Profile',    icon: User       },
  { number: 4, label: 'Review & Submit',  icon: FileText   },
]

const inputClass =
  'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm w-full transition'
const labelClass = 'text-sm font-medium text-slate-600 mb-1.5 block'

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

interface Props {
  plans: any[]
  initialStep: number
  initialHospitalId: string | null
  initialProfileId: string | null
  initialSelectedPlanId: string | null
  initialBillingCycle: 'monthly' | 'yearly'
  userEmail: string
  userName: string
}

export function OnboardingWizard({
  plans,
  initialStep,
  initialHospitalId,
  initialProfileId,
  initialSelectedPlanId,
  initialBillingCycle,
  userEmail,
  userName,
}: Props) {
  const router = useRouter()
  const [step, setStep]               = useState(initialStep)
  const [isPending, startTransition]  = useTransition()
  const [hospitalId, setHospitalId]   = useState(initialHospitalId)
  const [profileId, setProfileId]     = useState(initialProfileId)
  const [selectedPlanId, setPlanId]   = useState(initialSelectedPlanId ?? (plans[1]?.id ?? plans[0]?.id ?? ''))
  const [billingCycle, setBilling]    = useState<'monthly' | 'yearly'>(initialBillingCycle)

  // Step 1 form state
  const [s1, setS1] = useState({
    name: '', type: 'general', phone: '', email: userEmail,
    city: '', state: '', pincode: '', registration_number: '', total_beds: '',
  })

  // Step 3 form state
  const [s3, setS3] = useState({
    full_name: userName, phone: '', designation: '',
  })

  function set1(k: string, v: string) { setS1(f => ({ ...f, [k]: v })) }
  function set3(k: string, v: string) { setS3(f => ({ ...f, [k]: v })) }

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const yearlySaving = selectedPlan
    ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
    : 0

  // ─── Step handlers ────────────────────────────────────────────────────────

  function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await createHospital({
          name: s1.name, type: s1.type,
          phone: s1.phone, email: s1.email,
          city: s1.city, state: s1.state,
          pincode: s1.pincode || undefined,
          registration_number: s1.registration_number || undefined,
          total_beds: s1.total_beds ? Number(s1.total_beds) : undefined,
        })
        setHospitalId(result.hospitalId)
        setProfileId(result.profileId)
        setStep(2)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save. Please try again.')
      }
    })
  }

  function handleStep2() {
    if (!hospitalId || !selectedPlanId) return
    startTransition(async () => {
      try {
        await savePlanSelection(hospitalId, selectedPlanId, billingCycle)
        setStep(3)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save plan.')
      }
    })
  }

  function handleStep3(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId || !hospitalId) return
    startTransition(async () => {
      try {
        await saveAdminProfile(profileId, hospitalId, {
          full_name: s3.full_name,
          phone: s3.phone || undefined,
          designation: s3.designation || undefined,
        })
        setStep(4)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save profile.')
      }
    })
  }

  function handleSubmit() {
    if (!hospitalId) return
    startTransition(async () => {
      try {
        await submitForReview(hospitalId)
        router.push('/onboarding/pending')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to submit.')
      }
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'var(--font-lato)' }}>HMS Platform</span>
          </div>
          <p className="text-xs text-slate-400">Step {step} of 4</p>
        </div>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const done    = step > s.number
              const current = step === s.number
              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                      style={{
                        background: done || current ? 'linear-gradient(135deg, #038bbf, #00437b)' : '#f1f5f9',
                        color: done || current ? '#fff' : '#94a3b8',
                        border: done || current ? 'none' : '2px solid #e2e8f0',
                      }}
                    >
                      {done ? <Check className="h-4 w-4" /> : s.number}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-xs font-semibold ${current ? 'text-[#038bbf]' : done ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-3" style={{ background: step > s.number ? '#038bbf' : '#e2e8f0' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── STEP 1: Hospital Information ─────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>Tell us about your hospital</h1>
              <p className="text-sm text-slate-500 mt-1">Basic details about your facility</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Hospital Name *</label>
                  <input required value={s1.name} onChange={e => set1('name', e.target.value)}
                    className={inputClass} placeholder="City General Hospital" />
                </div>
                <div>
                  <label className={labelClass}>Hospital Type *</label>
                  <select required value={s1.type} onChange={e => set1('type', e.target.value)} className={inputClass}>
                    {HOSPITAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input required value={s1.phone} onChange={e => set1('phone', e.target.value)}
                    className={inputClass} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className={labelClass}>Hospital Email *</label>
                  <input required type="email" value={s1.email} onChange={e => set1('email', e.target.value)}
                    className={inputClass} placeholder="admin@hospital.com" />
                </div>
                <div>
                  <label className={labelClass}>Registration No.</label>
                  <input value={s1.registration_number} onChange={e => set1('registration_number', e.target.value)}
                    className={inputClass} placeholder="MH-2024-12345" />
                </div>
                <div>
                  <label className={labelClass}>City *</label>
                  <input required value={s1.city} onChange={e => set1('city', e.target.value)}
                    className={inputClass} placeholder="Mumbai" />
                </div>
                <div>
                  <label className={labelClass}>State *</label>
                  <input required value={s1.state} onChange={e => set1('state', e.target.value)}
                    className={inputClass} placeholder="Maharashtra" />
                </div>
                <div>
                  <label className={labelClass}>Pincode</label>
                  <input value={s1.pincode} onChange={e => set1('pincode', e.target.value)}
                    className={inputClass} placeholder="400001" />
                </div>
                <div>
                  <label className={labelClass}>Total Beds</label>
                  <input type="number" min="0" value={s1.total_beds} onChange={e => set1('total_beds', e.target.value)}
                    className={inputClass} placeholder="100" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isPending}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Saving…' : 'Continue'}
                {!isPending && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Plan Selection ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>Choose your plan</h1>
              <p className="text-sm text-slate-500 mt-1">Start with a 14-day free trial on any plan</p>
            </div>

            {/* Billing toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button
                type="button"
                onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{ background: billingCycle === 'yearly' ? '#038bbf' : '#e2e8f0' }}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${billingCycle === 'yearly' ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-[#038bbf]' : 'text-slate-400'}`}>
                Yearly
                {yearlySaving > 0 && <span className="ml-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">Save {yearlySaving}%</span>}
              </span>
            </div>

            {/* Plan cards */}
            <div className={`grid gap-4 ${plans.length <= 3 ? 'grid-cols-' + plans.length : 'grid-cols-3'}`}>
              {plans.map((plan) => {
                const price   = billingCycle === 'yearly' && plan.price_yearly ? plan.price_yearly / 12 : plan.price_monthly
                const isSelected = selectedPlanId === plan.id
                const isPopular  = plan.slug === 'growth' || plan.sort_order === 1

                const PLAN_FEATURES: { key: string; label: string }[] = [
                  { key: 'has_emr',       label: 'Electronic Medical Records' },
                  { key: 'has_pharmacy',  label: 'Pharmacy Module'            },
                  { key: 'has_lab',       label: 'Laboratory Module'          },
                  { key: 'has_radiology', label: 'Radiology'                  },
                  { key: 'has_ot',        label: 'Operation Theatre'          },
                  { key: 'has_icu',       label: 'ICU Management'             },
                ]

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className="relative text-left rounded-2xl border-2 p-5 transition-all"
                    style={{
                      borderColor: isSelected ? '#038bbf' : '#e2e8f0',
                      background: isSelected ? '#f0f9ff' : 'white',
                    }}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full px-3 py-0.5 text-xs font-semibold text-white" style={{ background: '#038bbf' }}>Most Popular</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: '#038bbf' }}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'var(--font-lato)' }}>{plan.name}</p>
                    {plan.description && <p className="text-xs text-slate-400 mt-0.5 mb-3">{plan.description}</p>}
                    <p className="mt-2 text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
                      {formatINR(price)}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>
                    {billingCycle === 'yearly' && plan.price_yearly && (
                      <p className="text-xs text-slate-400">{formatINR(plan.price_yearly)}/yr billed annually</p>
                    )}
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500">Up to {plan.max_doctors} doctors · {plan.max_beds} beds</p>
                      {PLAN_FEATURES.filter(f => plan[f.key]).map(f => (
                        <div key={f.key} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-xs text-slate-600">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep(1)} type="button"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button onClick={handleStep2} disabled={isPending || !selectedPlanId}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Saving…' : 'Continue'}
                {!isPending && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Admin Profile ─────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>Your profile</h1>
              <p className="text-sm text-slate-500 mt-1">This will be your admin account details</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Full Name *</label>
                  <input required value={s3.full_name} onChange={e => set3('full_name', e.target.value)}
                    className={inputClass} placeholder="Dr. Ramesh Kumar" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input disabled value={userEmail} className={`${inputClass} bg-slate-50 text-slate-400 cursor-not-allowed`} />
                  <p className="text-xs text-slate-400 mt-1">Used for login, cannot be changed here</p>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={s3.phone} onChange={e => set3('phone', e.target.value)}
                    className={inputClass} placeholder="+91 98765 43210" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Designation</label>
                  <select value={s3.designation} onChange={e => set3('designation', e.target.value)} className={inputClass}>
                    <option value="">Select your role…</option>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} type="button"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button type="submit" disabled={isPending}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Saving…' : 'Continue'}
                {!isPending && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 4: Review & Submit ───────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>Review & submit</h1>
              <p className="text-sm text-slate-500 mt-1">Your application will be reviewed within 1–2 business days</p>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Application Summary</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Hospital',      value: s1.name || '—'   },
                  { label: 'Type',          value: HOSPITAL_TYPES.find(t => t.value === s1.type)?.label ?? s1.type },
                  { label: 'Location',      value: s1.city && s1.state ? `${s1.city}, ${s1.state}` : '—' },
                  { label: 'Plan',          value: selectedPlan?.name ?? '—' },
                  { label: 'Billing',       value: billingCycle === 'yearly' ? `Yearly — ${formatINR(selectedPlan?.price_yearly ?? 0)}/yr` : `Monthly — ${formatINR(selectedPlan?.price_monthly ?? 0)}/mo` },
                  { label: 'Admin',         value: s3.full_name || userName || '—' },
                  { label: 'Contact Email', value: userEmail },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-[#00437b] mb-3">What happens next?</p>
              <div className="space-y-2">
                {[
                  'Our team will review your application within 1–2 business days',
                  'You\'ll receive an email when your account is approved',
                  'Once approved, you can immediately start using HMS Platform',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: '#038bbf' }}>{i + 1}</div>
                    <p className="text-sm text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(3)} type="button"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button onClick={handleSubmit} disabled={isPending}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
