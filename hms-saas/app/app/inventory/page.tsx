import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Package, Plus, Search, AlertTriangle, XCircle,
  CheckCircle2, ShoppingCart, Truck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

function formatINR(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)
}

const ITEM_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  consumable:          { label: 'Consumable',       color: '#038bbf', bg: 'rgba(3,139,191,0.08)'    },
  equipment:           { label: 'Equipment',        color: '#00437b', bg: 'rgba(0,67,123,0.08)'     },
  instrument:          { label: 'Instrument',       color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'   },
  linen:               { label: 'Linen',            color: '#059669', bg: 'rgba(5,150,105,0.08)'    },
  it_asset:            { label: 'IT Asset',         color: '#0891b2', bg: 'rgba(8,145,178,0.08)'    },
  furniture:           { label: 'Furniture',        color: '#d97706', bg: 'rgba(217,119,6,0.08)'    },
  medicine_accessory:  { label: 'Med. Accessory',   color: '#db2777', bg: 'rgba(219,39,119,0.08)'   },
  other:               { label: 'Other',            color: '#64748b', bg: 'rgba(100,116,139,0.08)'  },
}

const PO_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:               { label: 'Draft',              color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  submitted:           { label: 'Submitted',          color: '#038bbf', bg: 'rgba(3,139,191,0.08)'   },
  approved:            { label: 'Approved',           color: '#0d9488', bg: 'rgba(13,148,136,0.08)'  },
  partially_received:  { label: 'Partial Receipt',    color: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  received:            { label: 'Received',           color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  cancelled:           { label: 'Cancelled',          color: '#dc2626', bg: 'rgba(220,38,38,0.08)'   },
}

const PAYMENT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
  partial: { label: 'Partial', color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  paid:    { label: 'Paid',    color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>
}) {
  const { tab = 'items', q = '', page = '1' } = await searchParams
  const activeTab = tab === 'orders' ? 'orders' : 'items'
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id

  // ----- Items Tab Data -----
  let items: any[] = []
  let itemCount = 0
  let totalItems = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  // ----- Orders Tab Data -----
  let orders: any[] = []

  if (activeTab === 'items') {
    // Summary counts
    const [
      { count: allItemsCount },
      { data: stockData },
    ] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .eq('is_active', true),
      supabase
        .from('inventory_stock')
        .select('quantity_available, item_id, inventory_items!inner(reorder_level)')
        .eq('hospital_id', hid),
    ])

    totalItems = allItemsCount ?? 0

    if (stockData) {
      for (const s of stockData as any[]) {
        const qty = s.quantity_available ?? 0
        const reorder = s.inventory_items?.reorder_level ?? 0
        if (qty <= 0) outOfStockCount++
        else if (qty <= reorder) lowStockCount++
      }
    }

    // Items table query
    let itemQuery = supabase
      .from('inventory_items')
      .select(
        'id, name, code, item_type, unit_of_measure, reorder_level, is_active, inventory_categories(name), inventory_stock(quantity_on_hand, quantity_available, location_name)',
        { count: 'exact' }
      )
      .eq('hospital_id', hid)
      .eq('is_active', true)
      .range(from, to)

    if (q.trim()) {
      itemQuery = itemQuery.ilike('name', `%${q.trim()}%`)
    }

    const { data: fetchedItems, count } = await itemQuery
    items = fetchedItems ?? []
    itemCount = count ?? 0
  } else {
    const { data: fetchedOrders } = await supabase
      .from('purchase_orders')
      .select('id, po_number, po_date, expected_delivery, total_amount, status, payment_status, vendors(name)')
      .eq('hospital_id', hid)
      .order('created_at', { ascending: false })
      .limit(30)

    orders = fetchedOrders ?? []
  }

  const totalPages = Math.ceil(itemCount / PAGE_SIZE)

  const buildTabParams = (overrides: Record<string, string>) => {
    const base: Record<string, string> = { tab: activeTab }
    if (q) base.q = q
    return new URLSearchParams({ ...base, ...overrides }).toString()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5" style={{ fontFamily: 'var(--font-open-sans)' }}>
            {activeTab === 'items' ? 'Items & stock levels' : 'Purchase orders'}
          </p>
        </div>
        {activeTab === 'items' ? (
          <Link
            href="/app/inventory/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Link>
        ) : (
          <Link
            href="/app/inventory/po/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            <Plus className="h-4 w-4" />
            New PO
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {(['items', 'orders'] as const).map((t) => (
          <Link
            key={t}
            href={`/app/inventory?tab=${t}`}
            className={[
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              activeTab === t
                ? 'text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
            style={
              activeTab === t
                ? { background: 'linear-gradient(135deg, #038bbf, #00437b)' }
                : {}
            }
          >
            {t === 'items' ? (
              <><Package className="h-4 w-4" /> Items</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Purchase Orders</>
            )}
          </Link>
        ))}
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(3,139,191,0.08)' }}
                >
                  <Package className="h-5 w-5" style={{ color: '#038bbf' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-lato)' }}>
                {totalItems.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-slate-600" style={{ fontFamily: 'var(--font-open-sans)' }}>
                Total Items
              </p>
              <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'var(--font-open-sans)' }}>
                Active inventory items
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(217,119,6,0.08)' }}
                >
                  <AlertTriangle className="h-5 w-5" style={{ color: '#d97706' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-lato)' }}>
                {lowStockCount.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-slate-600" style={{ fontFamily: 'var(--font-open-sans)' }}>
                Low Stock
              </p>
              <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'var(--font-open-sans)' }}>
                At or below reorder level
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(220,38,38,0.08)' }}
                >
                  <XCircle className="h-5 w-5" style={{ color: '#dc2626' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-lato)' }}>
                {outOfStockCount.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-slate-600" style={{ fontFamily: 'var(--font-open-sans)' }}>
                Out of Stock
              </p>
              <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'var(--font-open-sans)' }}>
                Zero quantity available
              </p>
            </div>
          </div>

          {/* Search */}
          <form method="get" className="mb-5">
            <input type="hidden" name="tab" value="items" />
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search items by name…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/20 transition"
                style={{ fontFamily: 'var(--font-open-sans)' }}
              />
            </div>
          </form>

          {/* Items Table */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {!items.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400" style={{ fontFamily: 'var(--font-open-sans)' }}>
                  {q ? 'No items match your search' : 'No inventory items added yet'}
                </p>
                {!q && (
                  <Link
                    href="/app/inventory/new"
                    className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
                  >
                    Add your first item →
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {['Name / Code', 'Category', 'Type', 'Unit', 'In Stock', 'Reorder Level', 'Location', 'Status'].map(
                          (col) => (
                            <th
                              key={col}
                              className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                              style={{ fontFamily: 'var(--font-open-sans)' }}
                            >
                              {col}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((item: any) => {
                        const stock = (item.inventory_stock as any[])?.[0]
                        const qtyAvail = stock?.quantity_available ?? 0
                        const reorder = item.reorder_level ?? 0
                        const category = item.inventory_categories as any
                        const typeMeta = ITEM_TYPE_META[item.item_type] ?? ITEM_TYPE_META.other

                        let stockStatus: {
                          label: string
                          color: string
                          bg: string
                          icon: typeof CheckCircle2
                        }
                        if (qtyAvail <= 0) {
                          stockStatus = { label: 'Out of Stock', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: XCircle }
                        } else if (qtyAvail <= reorder) {
                          stockStatus = { label: 'Low Stock', color: '#d97706', bg: 'rgba(217,119,6,0.08)', icon: AlertTriangle }
                        } else {
                          stockStatus = { label: 'In Stock', color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: CheckCircle2 }
                        }

                        const StatusIcon = stockStatus.icon

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Name + Code */}
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800" style={{ fontFamily: 'var(--font-open-sans)' }}>
                                {item.name}
                              </p>
                              {item.code && (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</p>
                              )}
                            </td>

                            {/* Category */}
                            <td className="px-5 py-4 text-slate-500 text-xs" style={{ fontFamily: 'var(--font-open-sans)' }}>
                              {category?.name ?? <span className="text-slate-300">—</span>}
                            </td>

                            {/* Type */}
                            <td className="px-5 py-4">
                              <span
                                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                style={{ background: typeMeta.bg, color: typeMeta.color }}
                              >
                                {typeMeta.label}
                              </span>
                            </td>

                            {/* Unit */}
                            <td className="px-5 py-4 text-slate-500 text-xs" style={{ fontFamily: 'var(--font-open-sans)' }}>
                              {item.unit_of_measure ?? '—'}
                            </td>

                            {/* In Stock */}
                            <td className="px-5 py-4 font-semibold tabular-nums text-slate-800" style={{ fontFamily: 'var(--font-open-sans)' }}>
                              {qtyAvail.toLocaleString()}
                            </td>

                            {/* Reorder Level */}
                            <td className="px-5 py-4 text-slate-500 tabular-nums" style={{ fontFamily: 'var(--font-open-sans)' }}>
                              {reorder.toLocaleString()}
                            </td>

                            {/* Location */}
                            <td className="px-5 py-4 text-xs text-slate-500" style={{ fontFamily: 'var(--font-open-sans)' }}>
                              {stock?.location_name ?? <span className="text-slate-300">—</span>}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                style={{ background: stockStatus.bg, color: stockStatus.color }}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {stockStatus.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                    <p className="text-xs text-slate-400" style={{ fontFamily: 'var(--font-open-sans)' }}>
                      Showing {from + 1}–{Math.min(to + 1, itemCount)} of {itemCount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {pageNum > 1 && (
                        <Link
                          href={`/app/inventory?${buildTabParams({ page: String(pageNum - 1) })}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-xs">‹</span>
                        </Link>
                      )}
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {pageNum} / {totalPages}
                      </span>
                      {pageNum < totalPages && (
                        <Link
                          href={`/app/inventory?${buildTabParams({ page: String(pageNum + 1) })}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-xs">›</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {!orders.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400" style={{ fontFamily: 'var(--font-open-sans)' }}>
                No purchase orders yet
              </p>
              <Link
                href="/app/inventory/po/new"
                className="mt-4 text-sm font-semibold text-[#038bbf] hover:underline"
              >
                Create your first PO →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['PO #', 'Vendor', 'Date', 'Expected Delivery', 'Total', 'Status', 'Payment'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                          style={{ fontFamily: 'var(--font-open-sans)' }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((po: any) => {
                    const vendor = po.vendors as any
                    const statusMeta = PO_STATUS_META[po.status] ?? PO_STATUS_META.draft
                    const payMeta = PAYMENT_STATUS_META[po.payment_status] ?? PAYMENT_STATUS_META.pending

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* PO # */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                            {po.po_number}
                          </span>
                        </td>

                        {/* Vendor */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800" style={{ fontFamily: 'var(--font-open-sans)' }}>
                            {vendor?.name ?? <span className="text-slate-300">—</span>}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          {po.po_date
                            ? new Date(po.po_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Expected Delivery */}
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          {po.expected_delivery ? (
                            (() => {
                              const isOverdue =
                                po.status !== 'received' &&
                                po.status !== 'cancelled' &&
                                new Date(po.expected_delivery) < new Date()
                              return (
                                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                  {new Date(po.expected_delivery).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                  {isOverdue && ' (overdue)'}
                                </span>
                              )
                            })()
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 font-semibold text-slate-800 tabular-nums" style={{ fontFamily: 'var(--font-open-sans)' }}>
                          {formatINR(po.total_amount)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: statusMeta.bg, color: statusMeta.color }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-4">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: payMeta.bg, color: payMeta.color }}
                          >
                            {payMeta.label}
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
      )}
    </div>
  )
}
