import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShieldPlus, AlertTriangle, XCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

type StockStatus = 'out_of_stock' | 'low_stock' | 'expiring_soon' | 'in_stock' | string

const stockStatusStyle: Record<StockStatus, { label: string; color: string; bg: string }> = {
  out_of_stock:  { label: 'Out of Stock',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
  low_stock:     { label: 'Low Stock',      color: '#d97706', bg: 'rgba(217,119,6,0.1)'   },
  expiring_soon: { label: 'Expiring Soon',  color: '#ea580c', bg: 'rgba(234,88,12,0.1)'   },
  in_stock:      { label: 'In Stock',       color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
}

export default async function PharmacistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, hospital_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'pharmacist') redirect('/login')

  const hid = profile.hospital_id
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: drugs } = await supabase
    .from('drug_stock_levels')
    .select('drug_id, drug_name, generic_name, quantity_available, reorder_level, expiry_date, status')
    .eq('hospital_id', hid)

  const allDrugs = drugs ?? []
  const totalDrugs = allDrugs.length
  const outOfStock = allDrugs.filter((d: any) => d.status === 'out_of_stock' || d.quantity_available === 0).length
  const lowStock = allDrugs.filter((d: any) => d.status === 'low_stock').length
  const expiringSoon = allDrugs.filter((d: any) => {
    if (!d.expiry_date) return false
    return d.expiry_date <= thirtyDaysOut && d.expiry_date >= today
  }).length

  const stats = [
    {
      label: 'Total Drugs',
      value: totalDrugs,
      icon: ShieldPlus,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      sub: 'In formulary',
    },
    {
      label: 'Out of Stock',
      value: outOfStock,
      icon: XCircle,
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      sub: 'Needs restocking',
    },
    {
      label: 'Low Stock',
      value: lowStock,
      icon: AlertTriangle,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      sub: 'Below reorder level',
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon,
      icon: Clock,
      color: '#ea580c',
      bg: 'rgba(234,88,12,0.08)',
      sub: 'Within 30 days',
    },
  ]

  // Sort: out_of_stock first, then low_stock, then expiring_soon, then in_stock
  const priorityOrder: Record<string, number> = { out_of_stock: 0, low_stock: 1, expiring_soon: 2, in_stock: 3 }
  const sortedDrugs = [...allDrugs].sort((a: any, b: any) => {
    const aP = priorityOrder[a.status] ?? 4
    const bP = priorityOrder[b.status] ?? 4
    return aP - bP
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-slate-900 mb-1"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Pharmacy Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: s.bg }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <p
              className="text-2xl font-bold text-slate-900 mb-0.5"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              {s.value}
            </p>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Drug stock table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-lato)' }}
            >
              Drug Stock Levels
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Priority: critical items first</p>
          </div>
          <ShieldPlus className="h-4 w-4 text-slate-300" />
        </div>

        {!sortedDrugs.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <ShieldPlus className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No drug stock data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Drug Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Generic Name</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Reorder Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedDrugs.map((drug: any) => {
                  const ss = stockStatusStyle[drug.status as StockStatus] ?? stockStatusStyle.in_stock
                  return (
                    <tr key={drug.drug_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{drug.drug_name ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500 italic text-xs">{drug.generic_name ?? '—'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {drug.quantity_available ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {drug.reorder_level ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {drug.expiry_date
                          ? new Date(drug.expiry_date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ background: ss.bg, color: ss.color }}
                        >
                          {ss.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
