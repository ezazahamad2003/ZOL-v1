import Image from 'next/image'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard,
  Phone,
  Calendar,
  Mail,
  TrendingUp,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calls', label: 'Calls', icon: Phone },
  { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/follow-ups', label: 'Follow-ups', icon: Mail },
  { href: '/dashboard/insights', label: 'Insights', icon: TrendingUp },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name, vapi_phone_number, status')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!workspace || workspace.status === 'onboarding') {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4">
          <Image src="/zol-logo.png" alt="ZOL" width={32} height={32} className="rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{workspace.name ?? 'ZOL'}</p>
            {workspace.vapi_phone_number && (
              <p className="text-xs text-gray-500 font-mono">{workspace.vapi_phone_number}</p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 px-3 py-2">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
