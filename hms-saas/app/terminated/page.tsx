import Link from 'next/link'
import { XCircle, Mail, Stethoscope, LogOut } from 'lucide-react'

export default function TerminatedPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
            >
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'var(--font-lato)' }}>
              HMS Platform
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h1
            className="text-xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'var(--font-lato)' }}
          >
            Account Terminated
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Your hospital account has been permanently terminated. Please contact support if you believe this was done in error or to inquire about your data.
          </p>
          <a
            href="mailto:support@hmsplatform.com"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
          >
            <Mail className="h-4 w-4" /> Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
