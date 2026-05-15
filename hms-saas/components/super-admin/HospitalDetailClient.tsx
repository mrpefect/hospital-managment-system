'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Phone, Mail, Globe, MapPin,
  Users, BedDouble, Calendar, CheckCircle2, XCircle,
  PauseCircle, RefreshCw, AlertTriangle, ClipboardList,
  CreditCard, Activity, Flag, Lock, MessageSquare,
} from 'lucide-react'
import { updateHospitalStatus, addOnboardingNote } from '@/app/super-admin/hospitals/actions'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string; dot: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',  ring: 'ring-1 ring-amber-200',  dot: 'bg-amber-500'  },
  in_review:  { label: 'In Review',  color: 'text-[#00437b]',  bg: 'bg-blue-50',   ring: 'ring-1 ring-blue-200',   dot: 'bg-blue-600'   },
  approved:   { label: 'Approved',   color: 'text-green-700',  bg: 'bg-green-50',  ring: 'ring-1 ring-green-200',  dot: 'bg-green-600'  },
  suspended:  { label: 'Suspended',  color: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-1 ring-orange-200', dot: 'bg-orange-500' },
  terminated: { label: 'Terminated', color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-1 ring-red-200',    dot: 'bg-red-500'    },
  rejected:   { label: 'Rejected',   color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-1 ring-red-200',    dot: 'bg-red-500'    },
}

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: Building2     },
  { key: 'onboarding', label: 'Onboarding', icon: ClipboardList },
  { key: 'billing',    label: 'Billing',    icon: CreditCard    },
  { key: 'notes',      label: 'Notes',      icon: MessageSquare },
  { key: 'activity',   label: 'Activity',   icon: Activity      },
]

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

interface Props {
  data: {
    hospital: any
    onboarding: any
    notes: any[]
    subscription: any
    staffCount: number
    patientCount: number
    auditLogs: any[]
  }
}

export function HospitalDetailClient({ data }: Props) {
  const { hospital, onboarding, notes, subscription, staffCount, patientCount, auditLogs } = data
  const [activeTab, setActiveTab]    = useState('overview')
  const [isPending, startTransition] = useTransition()
  const [noteText, setNoteText]      = useState('')
  const [isInternal, setIsInternal]  = useState(true)
  const [localNotes, setLocalNotes]  = useState(notes)

  const status = STATUS_CONFIG[hospital.onboarding_status] ?? STATUS_CONFIG.pending

  function handleStatusChange(newStatus: 'approved' | 'suspended' | 'terminated' | 'in_review' | 'rejected') {
    startTransition(async () => {
      try {
        await updateHospitalStatus(hospital.id, newStatus)
        toast.success(`Hospital ${newStatus}`)
      } catch {
        toast.error('Failed to update status')
      }
    })
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    const text = noteText.trim()
    setNoteText('')
    startTransition(async () => {
      try {
        await addOnboardingNote(hospital.id, text, isInternal)
        setLocalNotes([{
          id: Date.now(),
          note: text,
          is_internal: isInternal,
          created_at: new Date().toISOString(),
          author_type: 'super_admin',
        }, ...localNotes])
        toast.success('Note added')
      } catch {
        toast.error('Failed to add note')
      }
    })
  }

  const ONBOARDING_STEPS = [
    { key: 'step1_completed', label: 'Hospital information'  },
    { key: 'step2_completed', label: 'Plan selected'         },
    { key: 'step3_completed', label: 'Admin account setup'   },
    { key: 'step4_completed', label: 'Documents uploaded'    },
    { key: 'payment_setup',   label: 'Payment setup'         },
    { key: 'email_verified',  label: 'Email verified'        },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <Link
          href="/super-admin/hospitals"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to hospitals
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-500">
              {hospital.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                className="text-lg font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                {hospital.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color} ${status.ring}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="text-xs text-slate-500">ID: {hospital.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {hospital.onboarding_status !== 'approved' && (
              <button
                onClick={() => handleStatusChange('approved')}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            )}
            {hospital.onboarding_status !== 'in_review' && (
              <button
                onClick={() => handleStatusChange('in_review')}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm font-medium text-[#00437b] hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Review
              </button>
            )}
            {hospital.onboarding_status === 'approved' && (
              <button
                onClick={() => handleStatusChange('suspended')}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                <PauseCircle className="h-4 w-4" /> Suspend
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-t px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[#038bbf] text-[#038bbf]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Stats row */}
            <div className="col-span-3 grid grid-cols-4 gap-4">
              {[
                { label: 'Staff',       value: staffCount,               icon: Users,      iconBg: 'bg-blue-50',   iconColor: 'text-[#038bbf]'  },
                { label: 'Patients',    value: patientCount,             icon: Users,      iconBg: 'bg-green-50',  iconColor: 'text-green-600'  },
                { label: 'Total Beds',  value: hospital.total_beds ?? 0, icon: BedDouble,  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
                { label: 'Type',        value: hospital.type ?? '—',     icon: CreditCard, iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <div className={`rounded-lg p-1.5 ${stat.iconBg}`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Contact & Details</h3>
              <div className="space-y-3">
                {[
                  { icon: Mail,          label: 'Email',        value: hospital.email    },
                  { icon: Phone,         label: 'Phone',        value: hospital.phone    },
                  { icon: Globe,         label: 'Website',      value: hospital.website  },
                  { icon: MapPin,        label: 'Address',      value: [hospital.address_line1, hospital.address_line2, hospital.city, hospital.state, hospital.pincode].filter(Boolean).join(', ') },
                  { icon: Building2,     label: 'Type',         value: hospital.type     },
                  { icon: ClipboardList, label: 'Registration', value: hospital.registration_number },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-sm text-slate-700">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Timeline</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Registered</p>
                  <p className="text-sm text-slate-700">{formatDate(hospital.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Last Updated</p>
                  <p className="text-sm text-slate-700">{formatDate(hospital.updated_at)}</p>
                </div>
                {subscription && (
                  <>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Subscription Start</p>
                      <p className="text-sm text-slate-700">{formatDate(subscription.current_period_start)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Next Renewal</p>
                      <p className="text-sm text-slate-700">{formatDate(subscription.current_period_end)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Onboarding Checklist</h3>
              {onboarding ? (
                <div className="space-y-3">
                  {ONBOARDING_STEPS.map(({ key, label }) => {
                    const done = onboarding[key]
                    return (
                      <div key={key} className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-slate-200 shrink-0" />
                        )}
                        <p className={`text-sm ${done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p>
                        {done && <span className="ml-auto text-xs text-slate-400">Completed</span>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No onboarding record found.</p>
              )}
            </div>

            {onboarding && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Step Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Steps Completed</p>
                    <p className="text-slate-700">
                      {['step1_completed','step2_completed','step3_completed','step4_completed'].filter(k => onboarding[k]).length} of 4
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Submitted For Review</p>
                    <p className="text-slate-700">{formatDate(onboarding.submitted_for_review_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Reviewed At</p>
                    <p className="text-slate-700">{formatDate(onboarding.reviewed_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Billing Cycle</p>
                    <p className="text-slate-700 capitalize">{onboarding.billing_cycle ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILLING */}
        {activeTab === 'billing' && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Active Subscription</h3>
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Plan</p>
                      <p className="text-slate-900 font-medium">{(subscription.plans as any)?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Monthly</p>
                      <p className="text-slate-900 font-medium">{formatINR((subscription.plans as any)?.price_monthly ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Status</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Next Renewal</p>
                      <p className="text-slate-700">{formatDate(subscription.current_period_end)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No active subscription.</p>
              )}
            </div>

            {subscription?.plans && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Plan Limits</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    { label: 'Max Beds',    value: (subscription.plans as any).max_beds    },
                    { label: 'Max Doctors', value: (subscription.plans as any).max_doctors },
                    { label: 'Max Staff',   value: (subscription.plans as any).max_staff   },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{value ?? '∞'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div className="max-w-2xl space-y-4">
            {/* Add note form */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Add Note</h3>
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note about this hospital…"
                  rows={3}
                  className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm w-full transition resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={e => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Internal note (not visible to hospital)
                  </label>
                  <button
                    type="submit"
                    disabled={isPending || !noteText.trim()}
                    className="rounded-lg bg-[#038bbf] hover:bg-[#0299d0] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  >
                    Add Note
                  </button>
                </div>
              </form>
            </div>

            {/* Notes list */}
            <div className="space-y-3">
              {localNotes.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No notes yet</p>
              ) : (
                localNotes.map((note: any) => (
                  <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium ${note.is_internal ? 'text-amber-700' : 'text-[#00437b]'}`}>
                        {note.is_internal ? 'Internal' : 'External'}
                      </span>
                      <span className="text-xs text-slate-400">· {note.author_type} ·</span>
                      <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="max-w-2xl space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">No activity yet</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <Activity className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium">{log.action.replace(/\./g, ' › ')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.actor_type}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(log.created_at)}</span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
