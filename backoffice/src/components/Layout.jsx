import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, LogOut, Shield, Menu, X, Package, ChevronRight, Search, PanelLeftClose, PanelLeft, ShieldCheck } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SearchPalette from './SearchPalette'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admins', icon: Users, label: 'Administrateurs' },
  { to: '/plans', icon: Package, label: 'Plans' },
  { to: '/subscriptions', icon: CreditCard, label: 'Abonnements' },
  { to: '/super-admins', icon: ShieldCheck, label: 'Super-Admins' },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/admins': 'Administrateurs',
  '/admins/new': 'Nouvel admin',
  '/plans': 'Plans',
  '/subscriptions': 'Abonnements',
  '/super-admins': 'Super-Admins',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleSearchClose = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const currentTitle = PAGE_TITLES[location.pathname] || ''
  const isDetail = location.pathname.match(/^\/admins\/[^/]+$/) && location.pathname !== '/admins/new'
  const breadcrumbTitle = isDetail ? 'Détail admin' : currentTitle

  return (
    <div className="flex h-screen bg-[#f8f9fb]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] lg:hidden animate-fade" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 bg-dark-950 text-white flex flex-col transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px]'
      } ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}>

        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          {collapsed ? (
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Shield className="w-5 h-5" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-[15px] font-bold tracking-tight leading-tight">BussnessApp</h1>
                  <p className="text-[10px] text-primary-400 font-semibold uppercase tracking-widest">Admin</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 mt-6 mb-2">
            <p className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Navigation</p>
          </div>
        )}

        {collapsed && <div className="mt-4" />}

        {/* Nav items */}
        <nav className={`flex-1 space-y-0.5 overflow-y-auto scrollbar-thin ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  collapsed ? 'justify-center py-2.5 px-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-primary-500/[0.12] text-primary-400'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isActive ? 'bg-primary-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.06]'}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-400/60" />}
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block px-3 py-2 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`flex items-center w-full rounded-xl text-[13px] font-medium text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all ${
              collapsed ? 'justify-center py-2.5 px-2.5' : 'gap-3 px-3 py-2.5'
            }`}
            title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : (
              <>
                <PanelLeftClose className="w-[18px] h-[18px]" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>

        {/* User section */}
        <div className={`border-t border-white/[0.06] flex-shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm" title={user?.fullName || 'Super Admin'}>
                {user?.fullName?.[0]?.toUpperCase() || 'S'}
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm">
                  {user?.fullName?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate text-gray-200">{user?.fullName || 'Super Admin'}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-5 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex-shrink-0 sticky top-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 lg:hidden">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-gray-400">Back Office</span>
            {breadcrumbTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-medium text-gray-700">{breadcrumbTitle}</span>
              </>
            )}
          </div>

          {/* Title (mobile) */}
          <h1 className="text-base font-bold text-gray-900 lg:hidden">{breadcrumbTitle || 'BussnessApp'}</h1>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200/70 rounded-xl transition-all hover:text-gray-600 group"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline text-[13px]">Rechercher...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-white rounded border border-gray-200 ml-2 group-hover:border-gray-300">
              Ctrl K
            </kbd>
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={handleSearchClose} />
    </div>
  )
}
