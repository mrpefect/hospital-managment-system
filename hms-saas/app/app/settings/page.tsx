import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Building2,
  CreditCard,
  User,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Globe,
  Hash,
  BedDouble,
  CalendarDays,
  Users,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const HOSPITAL_TYPE_LABEL: Record<string, string> = {
  general:           'General Hospital',
  multi_specialty:   'Multi-Specialty',
  specialty:         'Specialty',
  clinic:            'Clinic',
  diagnostic_center: 'Diagnostic Center',
  nursing_home:      'Nursing Home',
  dental:            'Dental',
  eye:               'Eye Care',
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mb-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: 'rgba(3,139,191,0.08)' }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: '#038bbf' }} />
      </div>
      <h2
        className="text-base font-bold text-slate-900"
        style={{ fontFamily: 'var(--font-lato)' }}
      >
        {title}
      </h2>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-700 flex-1">{value || <span className="text-slate-300">—</span>}</span>
    </div>
  )
}

function FeaturePill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        active
          ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
          : 'bg-slate-100 text-slate-400',
      ].join(' ')}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </span>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, hospital_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.hospital_id) redirect('/onboarding')

  const hid = profile.hospital_id

  const [
    { data: hospital },
    { data: subscription },
    { count: totalPatients },
    { count: activeStaffCount },
  ] = await Promise.all([
    supabase
      .from('hospitals')
      .select(
        'id, name, slug, legal_name, type, phone, email, website, registration_number, total_beds, address_line1, address_line2, city, state, pincode, country, onboarding_status, created_at'
      )
      .eq('id', hid)
      .single(),

    supabase
      .from('subscriptions')
      .select(
        'id, status, billing_cycle, current_period_start, current_period_end, plans(name, price_monthly, price_yearly, max_beds, max_doctors, max_staff, max_patients, has_emr, has_pharmacy, has_lab, has_radiology)'
      )
      .eq('hospital_id', hid)
      .eq('status', 'active')
      .maybeSingle(),

    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .is('deleted_at', null),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hid)
      .neq('role', 'hospital_admin')
      .eq('is_active', true),
  ])

  const plan = (subscription as any)?.plans ?? null

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const fullAddress = [
    hospital?.address_line1,
    hospital?.address_line2,
    hospital?.city,
    hospital?.state,
    hospital?.pincode,
    hospital?.country,
  ]
    .filter(Boolean)
    .join(', ')

  const quickStats = [
    {
      label: 'Total Beds',
      value: hospital?.total_beds?.toLocaleString() ?? '—',
      icon: BedDouble,
      color: '#038bbf',
      bg: 'rgba(3,139,191,0.08)',
    },
    {
      label: 'Registered Patients',
      value: (totalPatients ?? 0).toLocaleString(),
      icon: Users,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
    },
    {
      label: 'Active Staff',
      value: (activeStaffCount ?? 0).toLocaleString(),
      icon: User,
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
    },
    {
      label: 'Member Since',
      value: hospital?.created_at
        ? new Date(hospital.created_at).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
          })
        : '—',
      icon: CalendarDays,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
    },
  ]

  return (
    <div className="p-8 max-w-4xl">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your hospital profile, subscription, and account preferences.
        </p>
      </div>

      {/* 1. Hospital Information */}
      <SectionCard>
        <SectionTitle icon={Building2} title="Hospital Information" />

        <div className="divide-y divide-slate-50">
          <InfoRow label="Hospital Name" value={hospital?.name} />
          <InfoRow label="Legal Name" value={hospital?.legal_name} />
          <InfoRow
            label="Type"
            value={
              hospital?.type ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {HOSPITAL_TYPE_LABEL[hospital.type] ?? hospital.type}
                </span>
              ) : null
            }
          />
          <InfoRow label="Registration No." value={hospital?.registration_number} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{hospital?.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{hospital?.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="h-4 w-4 text-slate-400 shrink-0" />
            {hospital?.website ? (
              <a
                href={hospital.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#038bbf] hover:underline truncate"
              >
                {hospital.website.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        {fullAddress && (
          <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <span>{fullAddress}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Edit Information
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionCard>

      {/* 2. Subscription & Plan */}
      <SectionCard>
        <SectionTitle icon={CreditCard} title="Subscription &amp; Plan" />

        {subscription && plan ? (
          <div className="space-y-5">
            {/* Plan name + billing */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
                  {plan.name}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Billed{' '}
                  <span className="font-semibold text-slate-700 capitalize">
                    {(subscription as any).billing_cycle ?? '—'}
                  </span>
                  {' '}·{' '}
                  {(subscription as any).billing_cycle === 'yearly'
                    ? plan.price_yearly != null
                      ? `₹${Number(plan.price_yearly).toLocaleString('en-IN')}/yr`
                      : null
                    : plan.price_monthly != null
                    ? `₹${Number(plan.price_monthly).toLocaleString('en-IN')}/mo`
                    : null}
                </p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100">
                Active
              </span>
            </div>

            {/* Renewal */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-600">
                Renews on{' '}
                <span className="font-semibold text-slate-800">
                  {formatDate((subscription as any).current_period_end)}
                </span>
              </p>
            </div>

            {/* Plan limits */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Max Beds',     value: plan.max_beds     ?? '∞' },
                { label: 'Max Doctors',  value: plan.max_doctors  ?? '∞' },
                { label: 'Max Staff',    value: plan.max_staff    ?? '∞' },
                { label: 'Max Patients', value: plan.max_patients ?? '∞' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center"
                >
                  <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
                    {typeof stat.value === 'number'
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Feature pills */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
                Included Features
              </p>
              <div className="flex flex-wrap gap-2">
                <FeaturePill label="EMR" active={!!plan.has_emr} />
                <FeaturePill label="Pharmacy" active={!!plan.has_pharmacy} />
                <FeaturePill label="Laboratory" active={!!plan.has_lab} />
                <FeaturePill label="Radiology" active={!!plan.has_radiology} />
              </div>
            </div>

            {/* Upgrade */}
            <div className="flex justify-end pt-1">
              <Link
                href="/app/settings/upgrade"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
              >
                Upgrade Plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-1">No active subscription</p>
            <p className="text-xs text-slate-400 mb-4">
              Subscribe to a plan to unlock all features.
            </p>
            <Link
              href="/app/settings/upgrade"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
            >
              View Plans
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </SectionCard>

      {/* 3. Account Settings */}
      <SectionCard>
        <SectionTitle icon={User} title="Account Settings" />

        <div className="divide-y divide-slate-50">
          <InfoRow label="Admin Email" value={profile.email} />
          <InfoRow
            label="Role"
            value={
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {profile.role === 'hospital_admin' ? 'Hospital Admin' : profile.role}
              </span>
            }
          />
          <InfoRow
            label="Member Since"
            value={formatDate(profile.created_at)}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Need to update your password?
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Change Password
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionCard>

      {/* 4. Quick Stats */}
      <SectionCard>
        <SectionTitle icon={BarChart3} title="Quick Stats" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-100 p-4"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl mb-3"
                style={{ background: stat.bg }}
              >
                <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
              </div>
              <p
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                {stat.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
