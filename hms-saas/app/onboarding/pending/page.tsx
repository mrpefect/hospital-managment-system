import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Clock, CheckCircle2, Mail, Stethoscope, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get hospital status
  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id, full_name, hospitals(name, onboarding_status, city, state)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const hospital = (profile.hospitals as any)

  // If approved, send to dashboard
  if (hospital?.onboarding_status === 'approved') {
    redirect('/app/dashboard')
  }

  // If not submitted yet, back to wizard
  if (hospital?.onboarding_status === 'pending') {
    redirect('/onboarding')
  }

  const isRejected = hospital?.onboarding_status === 'rejected'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'var(--font-lato)' }}>HMS Platform</span>
          </div>
          <form action="/api/auth/signout" method="post">
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Link>
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {isRejected ? (
            /* Rejected state */
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-red-400" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-lato)' }}>
                Application Not Approved
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                Unfortunately your application for <strong className="text-slate-700">{hospital?.name}</strong> was not approved.
                Please contact support for more details.
              </p>
              <a
                href="mailto:support@hmsplatform.com"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
              >
                <Mail className="h-4 w-4" /> Contact Support
              </a>
            </div>
          ) : (
            /* Under review state */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}>
                    <Clock className="h-9 w-9 text-amber-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white flex items-center justify-center border-2 border-white">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: '#038bbf' }}>
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
                Application Under Review
              </h1>
              <p className="text-sm text-slate-500 mb-1">
                <strong className="text-slate-700">{hospital?.name}</strong>
              </p>
              {hospital?.city && (
                <p className="text-xs text-slate-400 mb-6">{hospital.city}, {hospital.state}</p>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What to expect</p>
                <div className="space-y-2.5">
                  {[
                    { icon: CheckCircle2, text: 'Application submitted successfully', done: true  },
                    { icon: Clock,        text: 'Team review (1–2 business days)',    done: false },
                    { icon: Mail,         text: 'Email notification on approval',     done: false },
                  ].map(({ icon: Icon, text, done }, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${done ? 'text-green-500' : 'text-slate-300'}`} />
                      <p className={`text-sm ${done ? 'text-slate-700' : 'text-slate-400'}`}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Questions? Reach us at{' '}
                <a href="mailto:support@hmsplatform.com" className="text-[#038bbf] hover:underline">
                  support@hmsplatform.com
                </a>
              </p>

              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Sign out and come back later →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
