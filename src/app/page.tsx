import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Phone,
  FileText,
  Calendar,
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Clock,
  TrendingUp,
  Shield,
} from 'lucide-react'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, status')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!workspace) redirect('/onboarding')
    if (workspace.status === 'onboarding') redirect('/onboarding')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/zol-logo.png" alt="ZOL" width={32} height={32} className="rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight text-white">ZOL</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pb-24 pt-36">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-24">
          <div className="h-[500px] w-[800px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/10 px-4 py-1.5 text-sm text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            AI-powered · Works 24/7 · No code required
          </div>

          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl">
            Your mechanic shop{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              never misses a call
            </span>{' '}
            again
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
            ZOL answers after-hours calls, extracts repair details, generates
            professional quotes, and books follow-ups — all automatically, while
            you sleep.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-base font-medium text-white hover:bg-white/10 transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span>5.0 rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Live in under 10 minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: '24/7', label: 'Always available' },
              { value: '< 30s', label: 'Quote generation' },
              { value: '3×', label: 'More captured leads' },
              { value: '0', label: 'Calls missed' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">How ZOL works</h2>
            <p className="mt-4 text-gray-400">
              From missed call to booked appointment — fully automated.
            </p>
          </div>

          <div className="relative mt-16 grid gap-8 md:grid-cols-4">
            {/* Connector line */}
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent md:block" />

            {[
              {
                step: '01',
                icon: Phone,
                title: 'Customer calls',
                desc: 'A customer calls your shop after hours. ZOL picks up instantly — every time.',
              },
              {
                step: '02',
                icon: FileText,
                title: 'Details extracted',
                desc: "AI listens and pulls out the vehicle info, repair issue, and customer's contact details.",
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Quote generated',
                desc: 'A professional itemized quote is built from your shop\'s pricing and sent to the customer.',
              },
              {
                step: '04',
                icon: Calendar,
                title: 'Appointment booked',
                desc: 'A follow-up is scheduled directly in your Google Calendar. Done.',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10">
                    <item.icon className="h-7 w-7 text-blue-400" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Everything you need to run a smarter shop
            </h2>
            <p className="mt-4 text-gray-400">
              ZOL replaces your after-hours voicemail with a full agentic AI that actually does the work.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Phone,
                title: 'AI phone receptionist',
                desc: 'A real AI voice answers every call, chats naturally with customers, and captures everything you need.',
              },
              {
                icon: FileText,
                title: 'Instant quote generation',
                desc: "Quotes built from your shop's actual pricing — emailed to the customer before they hang up.",
              },
              {
                icon: Users,
                title: 'Built-in CRM',
                desc: 'Every customer, vehicle, and interaction automatically logged and searchable from your dashboard.',
              },
              {
                icon: Calendar,
                title: 'Google Calendar sync',
                desc: 'Follow-up appointments booked directly in your calendar. No double-entry, no back-and-forth.',
              },
              {
                icon: Clock,
                title: 'Full call transcripts',
                desc: 'Every conversation transcribed and stored. Review any call in seconds from the calls dashboard.',
              },
              {
                icon: Shield,
                title: 'Multi-tenant & secure',
                desc: 'Each shop is fully isolated. Row-level security means your data is yours and only yours.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-blue-500/30 hover:bg-blue-600/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            {/* Mock browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <div className="ml-4 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-xs text-gray-600">
                app.zol.ai/dashboard
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6">
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Calls today', value: '12' },
                  { label: 'Quotes sent', value: '8' },
                  { label: 'Customers', value: '247' },
                  { label: 'Est. revenue', value: '$4,820' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="text-xs text-gray-500">{stat.label}</div>
                    <div className="mt-1 text-2xl font-bold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-4 text-sm font-medium text-gray-400">Recent activity</div>
                <div className="space-y-3">
                  {[
                    {
                      type: 'call',
                      label: 'Inbound call · Mike R.',
                      detail: '2019 F-150 · Brake inspection',
                      time: '2 min ago',
                      color: 'blue',
                    },
                    {
                      type: 'quote',
                      label: 'Quote sent · Sarah K.',
                      detail: 'Timing belt + labor · $680',
                      time: '18 min ago',
                      color: 'green',
                    },
                    {
                      type: 'booking',
                      label: 'Appointment booked · James T.',
                      detail: 'Wed Apr 22 · 10:00 AM',
                      time: '1 hr ago',
                      color: 'purple',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            item.color === 'blue'
                              ? 'bg-blue-400'
                              : item.color === 'green'
                              ? 'bg-green-400'
                              : 'bg-purple-400'
                          }`}
                        />
                        <div>
                          <div className="text-sm text-white">{item.label}</div>
                          <div className="text-xs text-gray-500">{item.detail}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Set up in under 10 minutes
          </h2>
          <p className="mt-4 text-gray-400">
            Connect your Google account, get a phone number, and ZOL starts handling calls tonight.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-600">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/zol-logo.png" alt="ZOL" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-semibold text-white">ZOL</span>
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} ZOL. AI Receptionist for Mechanic Shops.
          </p>
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="/login" className="hover:text-gray-400 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-gray-400 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
