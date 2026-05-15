'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const INPUT_CLASS =
  'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#038bbf] focus:ring-2 focus:ring-[#038bbf]/10 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm w-full transition'

const FEATURES = [
  'Patient management & EMR',
  'Appointments & scheduling',
  'Pharmacy & lab modules',
  'Billing & insurance',
]

function LeftPanel() {
  return (
    <div
      className="hidden lg:flex w-5/12 flex-col px-12 py-10 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #00437b 0%, #025587 50%, #038bbf 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-white/15 rounded-xl p-2.5">
          <Stethoscope className="h-6 w-6 text-white" />
        </div>
        <span
          className="text-white font-bold text-xl"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          HMS Platform
        </span>
      </div>

      {/* Middle content */}
      <div className="flex-1 flex flex-col justify-center">
        <h2
          className="text-3xl font-bold text-white leading-snug mb-4"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Better Healthcare,<br />Better Management
        </h2>
        <p
          className="text-white/70 text-base mb-10"
          style={{ fontFamily: 'var(--font-open-sans)' }}
        >
          A complete hospital management platform built for modern healthcare teams across India.
        </p>

        {/* Feature list */}
        <ul className="space-y-3.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-cyan-400/20 shrink-0">
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-cyan-300" fill="none">
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span
                className="text-white/85 text-sm"
                style={{ fontFamily: 'var(--font-open-sans)' }}
              >
                {f}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Decorative SVG */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none" aria-hidden="true">
        <svg viewBox="0 0 480 160" className="w-full opacity-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ECG / heartbeat line */}
          <polyline
            points="0,100 60,100 80,100 90,40 100,130 110,70 120,100 200,100 220,100 235,60 245,120 255,80 265,100 360,100 480,100"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Medical cross shapes */}
          <rect x="30" y="20" width="4" height="16" rx="2" fill="white" />
          <rect x="24" y="26" width="16" height="4" rx="2" fill="white" />

          <rect x="400" y="30" width="4" height="16" rx="2" fill="white" />
          <rect x="394" y="36" width="16" height="4" rx="2" fill="white" />

          <rect x="200" y="10" width="3" height="12" rx="1.5" fill="white" />
          <rect x="195.5" y="14.5" width="12" height="3" rx="1.5" fill="white" />

          <rect x="450" y="60" width="3" height="12" rx="1.5" fill="white" />
          <rect x="445.5" y="64.5" width="12" height="3" rx="1.5" fill="white" />
        </svg>
      </div>

      {/* Tagline */}
      <p
        className="text-white/50 text-sm"
        style={{ fontFamily: 'var(--font-open-sans)' }}
      >
        Trusted by 500+ hospitals across India
      </p>
    </div>
  )
}

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    router.push('/api/auth/redirect')
  }

  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 w-full max-w-md">
          {/* Logo mark */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}
            >
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: 'var(--font-lato)' }}
              >
                Welcome back
              </h1>
              <p
                className="mt-1 text-sm text-slate-500"
                style={{ fontFamily: 'var(--font-open-sans)' }}
              >
                Sign in to your account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="text-sm font-medium text-slate-700 mb-1.5 block"
                htmlFor="email"
                style={{ fontFamily: 'var(--font-open-sans)' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@hospital.com"
                {...register('email')}
                className={INPUT_CLASS}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                  style={{ fontFamily: 'var(--font-open-sans)' }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand hover:opacity-75 transition"
                  style={{ fontFamily: 'var(--font-open-sans)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={INPUT_CLASS + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #038bbf, #00437b)',
                fontFamily: 'var(--font-open-sans)',
              }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <p
            className="mt-6 text-center text-sm text-slate-500"
            style={{ fontFamily: 'var(--font-open-sans)' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-brand hover:opacity-75 transition"
            >
              Register your hospital
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
