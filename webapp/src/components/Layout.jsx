import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, TrendingDown, Package, FolderKanban, Tags,
  MessageSquare, Calculator, Boxes, Users, UserCog, CalendarDays, Percent,
  Crown, LogOut, Menu, X, ChevronRight, PanelLeftClose, PanelLeft, Lock,
  GraduationCap, Briefcase, ChevronDown,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/ventes', icon: ShoppingCart, label: 'Ventes' },
  { to: '/depenses', icon: TrendingDown, label: 'Dépenses' },
  { to: '/produits', icon: Package, label: 'Produits' },
  { to: '/projets', icon: FolderKanban, label: 'Mes business' },
  { to: '/categories', icon: Tags, label: 'Catégories' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
]

// screenKey = clé de gating (PREMIUM_SCREENS du SubscriptionContext)
const premiumNav = [
  { to: '/simulation', icon: Calculator, label: 'Simulation', screenKey: 'Simulation' },
  { to: '/stock', icon: Boxes, label: 'Stock', screenKey: 'Stock' },
  { to: '/clients', icon: Users, label: 'Clients CRM', screenKey: 'Customers' },
  { to: '/equipe', icon: UserCog, label: 'Équipe', screenKey: 'Team' },
  { to: '/planning', icon: CalendarDays, label: 'Planning', screenKey: 'Planning' },
  { to: '/commissions', icon: Percent, label: 'Commissions', screenKey: 'Commissions' },
]

const PAGE_TITLES = {
  '/': 'Tableau de bord',
  '/ventes': 'Ventes',
  '/depenses': 'Dépenses',
  '/produits': 'Produits',
  '/projets': 'Mes business',
  '/categories': 'Catégories',
  '/feedback': 'Feedback',
  '/simulation': 'Simulation Business Plan',
  '/stock': 'Stock',
  '/clients': 'Clients CRM',
  '/equipe': 'Équipe',
  '/planning': 'Planning',
  '/commissions': 'Commissions',
  '/abonnement': 'Mon abonnement',
  '/abonnement/succes': 'Paiement confirmé',
  '/tutoriel': 'Tutoriel',
}

function NavItem({ to, icon: Icon, label, end, collapsed, locked }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
          collapsed ? 'justify-center py-2.5 px-2.5' : 'gap-3 px-3 py-2.5'
        } ${
          isActive
            ? 'bg-gold-500/[0.12] text-gold-400'
            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isActive ? 'bg-gold-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.06]'}`}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              {locked ? (
                <Lock className="w-3.5 h-3.5 text-gray-600" />
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-gold-400/60" />
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout, isAdmin, selectedProjectId, selectProject, availableProjects } = useAuth()
  const { isPremium, canAccessScreen, subscription } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => { setMobileOpen(false); setProjectMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)) } catch { /* ignore */ }
  }, [collapsed])

  const handleLogout = () => { logout(); navigate('/login') }

  const currentTitle = PAGE_TITLES[location.pathname] || ''
  const currentProject = availableProjects.find(p => p._id === selectedProjectId)

  return (
    <div className="flex h-screen bg-night-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-[2px] lg:hidden animate-fade" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 bg-night-950 text-white flex flex-col border-r border-night-700/60 transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px]'
      } ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}>

        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          {collapsed ? (
            <div className="w-9 h-9 bg-gradient-gold-deep rounded-xl flex items-center justify-center shadow-gold-sm">
              <Briefcase className="w-5 h-5 text-night-950" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-gold-deep rounded-xl flex items-center justify-center shadow-gold-sm">
                  <Briefcase className="w-5 h-5 text-night-950" />
                </div>
                <div>
                  <h1 className="text-[15px] font-bold tracking-tight leading-tight text-cream">EAS</h1>
                  <p className="text-[10px] text-gold-500 font-semibold uppercase tracking-widest">Entreprendre</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className={`flex-1 overflow-y-auto scrollbar-thin py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Gestion</p>
          )}
          {mainNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}

          {!collapsed && (
            <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
              Premium
              {!isPremium && isAdmin && <Crown className="w-3 h-3 text-gold-500" />}
            </p>
          )}
          {collapsed && <div className="pt-3" />}
          {premiumNav.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              locked={!canAccessScreen(item.screenKey)}
            />
          ))}

          {!collapsed && (
            <p className="px-3 pt-5 pb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Compte</p>
          )}
          {collapsed && <div className="pt-3" />}
          {isAdmin && <NavItem to="/abonnement" icon={Crown} label="Mon abonnement" collapsed={collapsed} />}
          <NavItem to="/tutoriel" icon={GraduationCap} label="Tutoriel" collapsed={collapsed} />
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
              <div className="w-9 h-9 bg-gradient-gold-deep rounded-xl flex items-center justify-center text-sm font-bold text-night-950 shadow-sm" title={user?.fullName}>
                {user?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-9 h-9 bg-gradient-gold-deep rounded-xl flex items-center justify-center text-sm font-bold text-night-950 shadow-sm">
                  {user?.fullName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate text-gray-200">{user?.fullName || 'Utilisateur'}</p>
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
        <header className="flex items-center gap-3 px-4 sm:px-5 h-16 bg-night-900/80 backdrop-blur-xl border-b border-night-700/60 flex-shrink-0 sticky top-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-night-700 lg:hidden">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-gray-500">EAS</span>
            {currentTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                <span className="font-medium text-gray-200">{currentTitle}</span>
              </>
            )}
          </div>

          {/* Title (mobile) */}
          <h1 className="text-base font-bold text-cream lg:hidden truncate">{currentTitle || 'EAS'}</h1>

          <div className="flex-1" />

          {/* Subscription badge */}
          {isAdmin && (
            <button
              onClick={() => navigate('/abonnement')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-full ring-1 ring-inset transition-all ${
                isPremium
                  ? 'bg-gold-500/10 text-gold-400 ring-gold-500/30 hover:bg-gold-500/20'
                  : 'bg-white/5 text-gray-400 ring-white/10 hover:bg-white/10'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {isPremium ? (subscription?.planLabel || 'Premium') : 'Gratuit'}
            </button>
          )}

          {/* Project switcher */}
          {availableProjects.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setProjectMenuOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 bg-night-800 hover:bg-night-700 border border-night-600 rounded-xl transition-all max-w-[180px] sm:max-w-[240px]"
              >
                <Briefcase className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <span className="truncate text-[13px]">{currentProject?.name || 'Business'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              </button>
              {projectMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProjectMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-night-800 border border-night-600 rounded-xl shadow-2xl z-40 py-1.5 animate-scale-in max-h-80 overflow-y-auto scrollbar-thin">
                    {availableProjects.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => { selectProject(p._id); setProjectMenuOpen(false) }}
                        className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors ${
                          p._id === selectedProjectId ? 'text-gold-400 bg-gold-500/[0.08]' : 'text-gray-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Briefcase className="w-4 h-4 flex-shrink-0 opacity-60" />
                        <span className="truncate flex-1">{p.name}</span>
                        {p._id === selectedProjectId && <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
