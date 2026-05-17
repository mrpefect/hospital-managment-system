import Link from 'next/link'
import {
  CalendarDays, Users, FlaskConical, ShieldPlus, Receipt,
  Package, UserSquare2, BedDouble, BarChart3, CheckCircle2,
  ArrowRight, Stethoscope, Star, Zap, Lock, HeartPulse,
  Globe, Phone, Mail,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'Patient Management',
    desc: 'Complete patient records, MRN auto-generation, medical history, and insurance tracking in one place.',
    color: '#038bbf',
    bg: 'rgba(3,139,191,0.10)',
  },
  {
    icon: CalendarDays,
    title: 'Appointment Scheduling',
    desc: 'Smart token system, doctor-wise scheduling, OPD/IPD/Telemedicine support with real-time availability.',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.10)',
  },
  {
    icon: Receipt,
    title: 'Billing & Invoicing',
    desc: 'GST-ready invoices, multi-payment methods, partial payments, and printable receipts for patients.',
    color: '#059669',
    bg: 'rgba(5,150,105,0.10)',
  },
  {
    icon: ShieldPlus,
    title: 'Pharmacy',
    desc: 'Drug catalog, stock tracking, expiry alerts, prescription dispensing, and purchase order management.',
    color: '#db2777',
    bg: 'rgba(219,39,119,0.10)',
  },
  {
    icon: FlaskConical,
    title: 'Laboratory',
    desc: 'Lab order lifecycle from collection to result, urgency flags, fasting indicators, and report delivery.',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.10)',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    desc: 'Stock levels, reorder alerts, purchase orders, vendor management, and usage tracking across departments.',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.10)',
  },
  {
    icon: UserSquare2,
    title: 'Staff & HR',
    desc: 'Staff directory, role-based access, attendance tracking, department assignment, and leave management.',
    color: '#6d28d9',
    bg: 'rgba(109,40,217,0.10)',
  },
  {
    icon: BedDouble,
    title: 'IPD & Bed Management',
    desc: 'Real-time bed occupancy, ward assignments, admission/discharge tracking, and daily census reports.',
    color: '#be185d',
    bg: 'rgba(190,24,93,0.10)',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    desc: 'Revenue trends, patient demographics, department performance, and customisable management dashboards.',
    color: '#0369a1',
    bg: 'rgba(3,105,161,0.10)',
  },
]

const STATS = [
  { value: '500+', label: 'Hospitals Onboarded' },
  { value: '2M+',  label: 'Patients Managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9★',  label: 'Average Rating' },
]

const HOW = [
  {
    step: '01',
    title: 'Register Your Hospital',
    desc: 'Sign up, complete your hospital profile, and go live in under 30 minutes — no IT team required.',
  },
  {
    step: '02',
    title: 'Configure & Onboard Staff',
    desc: 'Add departments, doctors, and staff. Set roles, permissions, and workflows that match your hospital.',
  },
  {
    step: '03',
    title: 'Start Serving Patients',
    desc: 'Register patients, book appointments, raise invoices, and track every touchpoint from one dashboard.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '₹4,999',
    per: '/month',
    desc: 'Perfect for small clinics and nursing homes.',
    features: ['Up to 50 beds', '5 doctors', 'OPD Billing', 'Patient records', 'Basic reports'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '₹12,999',
    per: '/month',
    desc: 'Everything a growing hospital needs.',
    features: ['Up to 200 beds', '25 doctors', 'Pharmacy module', 'Lab management', 'Advanced analytics', 'Priority support'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    per: '',
    desc: 'For large hospitals and multi-branch chains.',
    features: ['Unlimited beds', 'Unlimited staff', 'All modules', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-open-sans)' }}>

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ background: 'rgba(0,15,30,0.85)' }}>
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-lato)' }}>
              MediFlow HMS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-semibold transition-colors hidden sm:block"
              style={{ color: 'rgba(255,255,255,0.8)' }}>
              Sign In
            </Link>
            <Link href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16"
        style={{ background: 'linear-gradient(160deg, #000f1e 0%, #001f3f 40%, #00437b 75%, #038bbf 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: '#038bbf' }} />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full blur-3xl opacity-15"
          style={{ background: '#00437b' }} />

        <div className="relative mx-auto max-w-7xl px-6 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-8 text-xs font-semibold"
            style={{ borderColor: 'rgba(3,139,191,0.4)', background: 'rgba(3,139,191,0.1)', color: '#67d7f7' }}>
            <HeartPulse className="h-3.5 w-3.5" />
            Trusted by 500+ hospitals across India
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-lato)' }}>
            The Complete
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #67d7f7 0%, #038bbf 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Hospital Management
            </span>
            <br />
            Platform
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            From patient registration to billing, pharmacy to lab — manage every department
            of your hospital from one powerful, cloud-based platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-2xl transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)', boxShadow: '0 0 40px rgba(3,139,191,0.4)' }}>
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold border transition-all hover:scale-105"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
              Sign In to Dashboard
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="rounded-2xl border p-4 text-center"
                style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
                <p className="text-2xl font-black text-white mb-0.5" style={{ fontFamily: 'var(--font-lato)' }}>
                  {s.value}
                </p>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#038bbf' }}>
              Everything you need
            </p>
            <h2 className="text-4xl font-black text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
              9 Powerful Modules, One Platform
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Replace your scattered spreadsheets and legacy software with a unified system built specifically for Indian hospitals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                  style={{ background: f.bg }}>
                  <f.icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-lato)' }}>
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            {[
              { icon: Lock,  label: 'HIPAA Compliant' },
              { icon: Zap,   label: '99.9% Uptime' },
              { icon: Globe, label: 'Cloud-Based' },
              { icon: Star,  label: '4.9 / 5 Rating' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(3,139,191,0.08)' }}>
                  <item.icon className="h-4.5 w-4.5" style={{ color: '#038bbf' }} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#038bbf' }}>
              Simple onboarding
            </p>
            <h2 className="text-4xl font-black text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
              Up and running in 30 minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW.map((h, i) => (
              <div key={h.step} className="relative text-center">
                {i < HOW.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px"
                    style={{ background: 'linear-gradient(90deg, #038bbf44, transparent)' }} />
                )}
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white mb-5"
                  style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)', fontFamily: 'var(--font-lato)' }}>
                  {h.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-lato)' }}>
                  {h.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Banner ── */}
      <section className="py-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #001f3f 0%, #00437b 50%, #038bbf 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-3" style={{ fontFamily: 'var(--font-lato)' }}>
              Built for Indian Healthcare
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Designed for the unique needs of hospitals, clinics, and healthcare chains across India.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: '₹0',    label: 'Setup Cost', sub: 'No installation fees' },
              { value: '30min', label: 'Go-Live Time', sub: 'Fastest onboarding' },
              { value: '24/7',  label: 'Support', sub: 'Always available' },
              { value: '100%',  label: 'Cloud-Based', sub: 'No hardware needed' },
            ].map(s => (
              <div key={s.label} className="text-center rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-lato)' }}>
                  {s.value}
                </p>
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#038bbf' }}>
              Transparent pricing
            </p>
            <h2 className="text-4xl font-black text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
              Plans for every hospital size
            </h2>
            <p className="text-slate-500">All plans include a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col ${plan.highlight ? 'shadow-2xl' : 'bg-white border border-slate-200 shadow-sm'}`}
                style={plan.highlight ? { background: 'linear-gradient(160deg, #001f3f, #00437b, #038bbf)' } : {}}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full px-4 py-1 text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}
                    style={{ fontFamily: 'var(--font-lato)' }}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-slate-500'}`}>{plan.desc}</p>
                </div>

                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}
                    style={{ fontFamily: 'var(--font-lato)' }}>
                    {plan.price}
                  </span>
                  {plan.per && (
                    <span className={`text-sm ml-1 ${plan.highlight ? 'text-white/60' : 'text-slate-500'}`}>
                      {plan.per}
                    </span>
                  )}
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-[#67d7f7]' : 'text-[#038bbf]'}`} />
                      <span className={plan.highlight ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/onboarding"
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all hover:opacity-90 ${
                    plan.highlight
                      ? 'bg-white text-[#00437b]'
                      : 'text-white'
                  }`}
                  style={!plan.highlight ? { background: 'linear-gradient(135deg, #038bbf, #00437b)' } : {}}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-6"
            style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
            <HeartPulse className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4" style={{ fontFamily: 'var(--font-lato)' }}>
            Ready to modernise
            <br />
            your hospital?
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            Join hundreds of hospitals already running smarter with MediFlow HMS. Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)', boxShadow: '0 8px 32px rgba(3,139,191,0.35)' }}>
              Start Free Trial — No card needed
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-12"
        style={{ background: '#000f1e' }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #038bbf, #00437b)' }}>
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <span className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-lato)' }}>
                  MediFlow HMS
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                The complete hospital management platform built for modern Indian healthcare.
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-bold text-white mb-3">Product</p>
                {['Features', 'Pricing', 'Changelog'].map(l => (
                  <a key={l} href="#" className="block mb-2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {l}
                  </a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-3">Company</p>
                {['About', 'Blog', 'Careers'].map(l => (
                  <a key={l} href="#" className="block mb-2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {l}
                  </a>
                ))}
              </div>
              <div>
                <p className="font-bold text-white mb-3">Contact</p>
                <div className="space-y-2">
                  {[
                    { icon: Mail,  label: 'support@mediflow.in' },
                    { icon: Phone, label: '+91 98765 43210' },
                  ].map(c => (
                    <div key={c.label} className="flex items-center gap-2">
                      <c.icon className="h-3.5 w-3.5 shrink-0" style={{ color: '#038bbf' }} />
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              © {new Date().getFullYear()} MediFlow HMS. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
