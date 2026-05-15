'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Search, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, PauseCircle, MoreHorizontal,
  Eye, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { updateHospitalStatus } from '@/app/super-admin/hospitals/actions'
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
  { key: 'all',        label: 'All',        countKey: 'all'       },
  { key: 'pending',    label: 'Pending',    countKey: 'pending'   },
  { key: 'approved',   label: 'Approved',   countKey: 'approved'  },
  { key: 'suspended',  label: 'Suspended',  countKey: 'suspended' },
  { key: 'terminated', label: 'Terminated', countKey: 'terminated'},
]

interface Props {
  hospitals: any[]
  total: number
  page: number
  pageCount: number
  counts: Record<string, number>
  currentStatus?: string
  currentQ?: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function HospitalListClient({ hospitals, total, page, pageCount, counts, currentStatus, currentQ }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const [isPending, startTransition] = useTransition()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [searchVal, setSearchVal] = useState(currentQ ?? '')

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      status: currentStatus,
      q:      currentQ,
      page:   String(page),
      ...updates,
    }
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== 'all' && !(k === 'page' && v === '1')) params.set(k, v)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ q: searchVal || undefined, page: '1' })
  }

  function handleStatusChange(
    hospitalId: string,
    status: 'approved' | 'suspended' | 'terminated' | 'in_review' | 'rejected'
  ) {
    setOpenMenu(null)
    startTransition(async () => {
      try {
        await updateHospitalStatus(hospitalId, status)
        toast.success(`Hospital ${status} successfully`)
      } catch {
        toast.error('Action failed. Please try again.')
      }
    })
  }

  const activeTab = currentStatus ?? 'all'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Hospitals
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/super-admin/hospitals/new"
          className="flex items-center gap-2 rounded-lg bg-[#038bbf] hover:bg-[#0299d0] px-3.5 py-2 text-sm font-medium text-white transition-colors"
        >
          <Building2 className="h-4 w-4" />
          Add Hospital
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-3">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => navigate({ status: tab.key === 'all' ? undefined : tab.key, page: '1' })}
              className={`flex items-center gap-1.5 rounded-t px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[#038bbf] text-[#038bbf]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === tab.key ? 'bg-[#038bbf]/10 text-[#038bbf]' : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[tab.countKey] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <form onSubmit={handleSearch} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search hospitals…"
            className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm w-full transition pl-9"
          />
        </form>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {hospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">No hospitals found</p>
            {currentQ && (
              <button
                onClick={() => { setSearchVal(''); navigate({ q: undefined, page: '1' }) }}
                className="mt-2 text-xs text-[#038bbf] hover:text-[#0299d0]"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.map((h) => {
                const status = STATUS_CONFIG[h.onboarding_status] ?? STATUS_CONFIG.pending
                return (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                          {h.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/super-admin/hospitals/${h.id}`}
                            className="font-medium text-slate-900 hover:text-[#038bbf] transition-colors"
                          >
                            {h.name}
                          </Link>
                          <p className="text-xs text-slate-500">{h.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">
                      {h.city}, {h.state}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">
                      {(h.plans as any)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color} ${status.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-sm">{timeAgo(h.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/super-admin/hospitals/${h.id}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === h.id ? null : h.id)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openMenu === h.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 shadow-xl rounded-xl py-1 w-44">
                                {h.onboarding_status !== 'approved' && (
                                  <button
                                    onClick={() => handleStatusChange(h.id, 'approved')}
                                    disabled={isPending}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Approve
                                  </button>
                                )}
                                {h.onboarding_status !== 'in_review' && (
                                  <button
                                    onClick={() => handleStatusChange(h.id, 'in_review')}
                                    disabled={isPending}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#00437b] hover:bg-slate-50 transition-colors"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Mark In Review
                                  </button>
                                )}
                                {h.onboarding_status !== 'suspended' && (
                                  <button
                                    onClick={() => handleStatusChange(h.id, 'suspended')}
                                    disabled={isPending}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <PauseCircle className="h-4 w-4" />
                                    Suspend
                                  </button>
                                )}
                                {h.onboarding_status !== 'rejected' && (
                                  <button
                                    onClick={() => handleStatusChange(h.id, 'rejected')}
                                    disabled={isPending}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                  </button>
                                )}
                                {h.onboarding_status !== 'terminated' && (
                                  <button
                                    onClick={() => handleStatusChange(h.id, 'terminated')}
                                    disabled={isPending}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    Terminate
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between bg-white border-t border-slate-200 px-6 py-3">
          <p className="text-xs text-slate-500">Page {page} of {pageCount}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ page: String(page - 1) })}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate({ page: String(page + 1) })}
              disabled={page >= pageCount}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
