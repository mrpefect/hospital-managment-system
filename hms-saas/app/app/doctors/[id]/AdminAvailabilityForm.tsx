'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const DAYS = [
  { day: 1, label: 'Monday'    },
  { day: 2, label: 'Tuesday'   },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday'  },
  { day: 5, label: 'Friday'    },
  { day: 6, label: 'Saturday'  },
  { day: 0, label: 'Sunday'    },
]

interface DaySlot { is_available: boolean; start_time: string; end_time: string }

interface Props {
  doctorProfileId: string
  hospitalId: string
  initial: Record<number, DaySlot>
}

export function AdminAvailabilityForm({ doctorProfileId, hospitalId, initial }: Props) {
  const [saving, setSaving] = useState(false)
  const [slots, setSlots] = useState<Record<number, DaySlot>>(() => {
    const defaults: Record<number, DaySlot> = {}
    DAYS.forEach(d => {
      defaults[d.day] = initial[d.day] ?? { is_available: false, start_time: '09:00', end_time: '17:00' }
    })
    return defaults
  })

  function toggle(day: number) {
    setSlots(prev => ({ ...prev, [day]: { ...prev[day], is_available: !prev[day].is_available } }))
  }

  function setTime(day: number, field: 'start_time' | 'end_time', value: string) {
    setSlots(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/doctor-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorProfileId,
          hospitalId,
          slots: DAYS.map(d => ({
            day_of_week:  d.day,
            is_available: slots[d.day].is_available,
            start_time:   slots[d.day].start_time,
            end_time:     slots[d.day].end_time,
          })),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      toast.success('Availability updated')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ day, label }) => {
        const slot = slots[day]
        return (
          <div
            key={day}
            className={[
              'rounded-2xl border bg-white shadow-sm transition-all',
              slot.is_available ? 'border-[#038bbf]/40' : 'border-slate-200 opacity-70',
            ].join(' ')}
          >
            <div className="flex items-center gap-4 px-5 py-3.5">
              <button
                type="button"
                onClick={() => toggle(day)}
                className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200"
                style={{ background: slot.is_available ? '#038bbf' : '#e2e8f0' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: slot.is_available ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>

              <div className="w-24 shrink-0">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className={`text-xs mt-0.5 ${slot.is_available ? 'text-[#038bbf]' : 'text-slate-400'}`}>
                  {slot.is_available ? 'Available' : 'Off'}
                </p>
              </div>

              {slot.is_available ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-8">From</span>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={e => setTime(day, 'start_time', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4">To</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={e => setTime(day, 'end_time', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="flex-1 text-sm text-slate-300 italic">Not working</p>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}
