'use client'

import { useState } from 'react'
import { saveMyAvailability, type AvailabilitySlot } from './actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const DAYS = [
  { day: 1, label: 'Monday',    short: 'Mon' },
  { day: 2, label: 'Tuesday',   short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday',  short: 'Thu' },
  { day: 5, label: 'Friday',    short: 'Fri' },
  { day: 6, label: 'Saturday',  short: 'Sat' },
  { day: 0, label: 'Sunday',    short: 'Sun' },
]

interface DaySlot {
  is_available: boolean
  start_time: string
  end_time: string
}

interface Props {
  initial: Record<number, DaySlot>
}

export function AvailabilityForm({ initial }: Props) {
  const [saving, setSaving] = useState(false)
  const [slots, setSlots] = useState<Record<number, DaySlot>>(() => {
    const defaults: Record<number, DaySlot> = {}
    DAYS.forEach(d => {
      defaults[d.day] = initial[d.day] ?? { is_available: false, start_time: '09:00', end_time: '17:00' }
    })
    return defaults
  })

  function toggle(day: number) {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], is_available: !prev[day].is_available },
    }))
  }

  function setTime(day: number, field: 'start_time' | 'end_time', value: string) {
    setSlots(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleSave() {
    const payload: AvailabilitySlot[] = DAYS.map(d => ({
      day_of_week:  d.day,
      is_available: slots[d.day].is_available,
      start_time:   slots[d.day].start_time,
      end_time:     slots[d.day].end_time,
    }))

    setSaving(true)
    try {
      await saveMyAvailability(payload)
      toast.success('Availability saved')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {DAYS.map(({ day, label, short }) => {
        const slot = slots[day]
        return (
          <div
            key={day}
            className={[
              'rounded-2xl border bg-white shadow-sm transition-all duration-150',
              slot.is_available ? 'border-purple-200' : 'border-slate-200 opacity-70',
            ].join(' ')}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggle(day)}
                className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ background: slot.is_available ? '#7c3aed' : '#e2e8f0' }}
                aria-label={slot.is_available ? 'Available' : 'Unavailable'}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: slot.is_available ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>

              {/* Day label */}
              <div className="w-24 shrink-0">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className={`text-xs mt-0.5 font-medium ${slot.is_available ? 'text-purple-600' : 'text-slate-400'}`}>
                  {slot.is_available ? 'Available' : 'Unavailable'}
                </p>
              </div>

              {/* Time pickers */}
              {slot.is_available ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium w-8">From</span>
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={e => setTime(day, 'start_time', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium w-4">To</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={e => setTime(day, 'end_time', e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    ({calcHours(slot.start_time, slot.end_time)} hrs)
                  </span>
                </div>
              ) : (
                <p className="flex-1 text-sm text-slate-300 italic">No appointments on {label}</p>
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
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}

function calcHours(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return '0'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}` : `${h}h ${m}m`
}
