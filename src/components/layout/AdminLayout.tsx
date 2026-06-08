import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  ScrollText,
  Users,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useMobileDrawer } from '@/hooks/useMobileDrawer'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/students', label: 'Employees', icon: Users },
  { to: '/admin/groups', label: 'Groups', icon: UsersRound },
  { to: '/admin/paths', label: 'Learning paths', icon: ListOrdered },
  { to: '/admin/compliance', label: 'Compliance', icon: ClipboardCheck },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { drawerRef, triggerRef } = useMobileDrawer(mobileOpen, () => setMobileOpen(false))

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Skip link: visible only when focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-2 h-14 border-b bg-card px-3">
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="admin-sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="font-semibold">Training Hub</span>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (always visible md+, slide-in overlay on mobile) */}
      <aside
        id="admin-sidebar"
        ref={drawerRef}
        tabIndex={-1}
        aria-label="Admin navigation"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        className={cn(
          'w-60 flex-col fixed inset-y-0 z-50 border-r bg-card md:flex focus:outline-none',
          mobileOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-semibold text-lg">Training Hub</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate mb-2">
            {profile?.full_name ?? profile?.email}
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="flex-1 md:ml-60 pt-14 md:pt-0 focus:outline-none">
        <Outlet />
      </main>
    </div>
  )
}
