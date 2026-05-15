'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Check, X } from 'lucide-react'
import { upsertPlan } from '@/app/super-admin/plans/actions'
import { toast } from 'sonner'

interface Plan {
  id?: string
  name: string
  price_monthly: number
  price_yearly?: number | null
  max_beds?: number | null
  max_doctors?: number | null
  max_staff?: number | null
  is_active: boolean
  features?: Record<string, boolean>
}

const EMPTY: Plan = {
  name: '', price_monthly: 0, price_yearly: null,
  max_beds: null, max_doctors: null, max_staff: null,
  is_active: true, features: {},
}

function formatINR(n: number) { return `₹${n.toLocaleString('en-IN')}` }

interface Props { initialPlans: Plan[] }

export function PlansClient({ initialPlans }: Props) {
  const [plans, setPlans]             = useState(initialPlans)
  const [editing, setEditing]         = useState<Plan | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [isPending, startTransition]  = useTransition()

  function openNew()          { setEditing({ ...EMPTY }); setShowForm(true) }
  function openEdit(p: Plan)  { setEditing({ ...p });     setShowForm(true) }
  function closeForm()        { setEditing(null);          setShowForm(false) }

  function handleSave() {
    if (!editing) return
    startTransition(async () => {
      try {
        await upsertPlan({
          ...editing,
          price_yearly: editing.price_yearly ?? undefined,
          max_beds:     editing.max_beds     ?? undefined,
          max_doctors:  editing.max_doctors  ?? undefined,
          max_staff:    editing.max_staff    ?? undefined,
        })
        toast.success(editing.id ? 'Plan updated' : 'Plan created')
        closeForm()
        // Optimistic update
        if (editing.id) {
          setPlans(ps => ps.map(p => p.id === editing.id ? editing : p))
        } else {
          setPlans(ps => [...ps, editing])
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save plan')
      }
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Plans
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage subscription plans</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-3.5 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> New Plan
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id ?? plan.name}
            className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${!plan.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-900">{plan.name}</p>
                {!plan.is_active && <span className="text-xs text-slate-400">Inactive</span>}
              </div>
              <button
                onClick={() => openEdit(plan)}
                className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
              {formatINR(plan.price_monthly)}
              <span className="text-sm text-slate-400 font-normal">/mo</span>
            </p>
            {plan.price_yearly && (
              <p className="text-xs text-slate-500 mt-0.5">{formatINR(plan.price_yearly)}/yr</p>
            )}

            <div className="mt-4 space-y-1.5 text-sm text-slate-500">
              <p>Beds: {plan.max_beds ?? '∞'}</p>
              <p>Doctors: {plan.max_doctors ?? '∞'}</p>
              <p>Staff: {plan.max_staff ?? '∞'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                {editing.id ? 'Edit Plan' : 'New Plan'}
              </h2>
              <button
                onClick={closeForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'name',          label: 'Plan Name',         type: 'text',   required: true  },
                { key: 'price_monthly', label: 'Monthly Price (₹)', type: 'number', required: true  },
                { key: 'price_yearly',  label: 'Yearly Price (₹)',  type: 'number', required: false },
                { key: 'max_beds',      label: 'Max Beds',          type: 'number', required: false },
                { key: 'max_doctors',   label: 'Max Doctors',       type: 'number', required: false },
                { key: 'max_staff',     label: 'Max Staff',         type: 'number', required: false },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1.5">{label}{required && ' *'}</label>
                  <input
                    type={type}
                    required={required}
                    value={(editing as any)[key] ?? ''}
                    onChange={e => setEditing(ed => ({
                      ...ed!,
                      [key]: type === 'number'
                        ? (e.target.value === '' ? null : Number(e.target.value))
                        : e.target.value,
                    }))}
                    placeholder={type === 'number' ? 'Leave blank for unlimited' : ''}
                    className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm"
                  />
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={e => setEditing(ed => ({ ...ed!, is_active: e.target.checked }))}
                  className="rounded"
                />
                Active (visible to new signups)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !editing.name || !editing.price_monthly}
                className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                {isPending ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
