import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Camera, ShieldCheck, Settings, Crown, Gem, Star, ChevronRight, RefreshCw,
  Banknote, TrendingDown, Users, Boxes, LineChart as LineChartIcon, Trophy,
  FileSpreadsheet, FileText, Download, Trash2, LogOut, AlertTriangle, Coins,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { dashboardAPI, projectsAPI, authAPI, exportAPI, downloadBlob } from '../services/api'
import { Modal, ConfirmDialog, Stat, SkeletonCard, Spinner } from '../components/ui'
import { SERIES, CATEGORICAL, CHART_TEXT, TOOLTIP_STYLE } from '../utils/chartTheme'

const toInputDate = (d) => d.toISOString().slice(0, 10)

export default function DashboardPage() {
  const { user, logout, deleteAccount, selectedProjectId, availableProjects, loadAvailableProjects, selectProject, isAdmin: isAdminAuth } = useAuth()
  const { format: formatPrice, currency, setProjectCurrency, availableCurrencies } = useCurrency()
  const { subscription, isPremium, refreshSubscription } = useSubscription()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false)
  const [settingsModalVisible, setSettingsModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [startDate, setStartDate] = useState(toInputDate(new Date(new Date().getFullYear(), 0, 1)))
  const [endDate, setEndDate] = useState(toInputDate(new Date()))

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  // Charger les projets disponibles au montage
  useEffect(() => {
    const loadProjectsIfNeeded = async () => {
      if (availableProjects.length === 0) {
        try {
          const response = await projectsAPI.getAll()
          loadAvailableProjects(response.data)
          if (!selectedProjectId && user?.projectId) {
            selectProject(user.projectId)
          }
        } catch (error) {
          console.error('Error loading projects:', error)
        }
      }
    }
    loadProjectsIfNeeded()
    refreshSubscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardData = useCallback(async () => {
    const projectId = selectedProjectId || user?.projectId
    if (!projectId) {
      setLoading(false)
      return
    }
    try {
      const response = await dashboardAPI.getStats(projectId)
      setStats(response.data)
      const project = availableProjects.find(p => p._id === projectId)
      if (project) {
        setProjectCurrency(project.currency || 'XOF')
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Impossible de charger les données')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, availableProjects])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  const onRefresh = () => {
    setRefreshing(true)
    refreshSubscription()
    loadDashboardData()
  }

  const handleChangeProfilePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const response = await authAPI.updateProfilePhoto(file)
      if (response.data) {
        toast.success('Photo de profil mise à jour !')
        onRefresh()
      }
    } catch (error) {
      console.error('Error changing profile photo:', error)
      toast.error('Impossible de mettre à jour la photo de profil.')
    }
  }

  const handleDeleteAccountConfirm = async () => {
    if (!deletePassword) {
      toast.error('Veuillez saisir votre mot de passe pour confirmer.')
      return
    }
    setDeleteLoading(true)
    const result = await deleteAccount(deletePassword)
    setDeleteLoading(false)
    if (result.success) {
      setDeleteModalVisible(false)
      navigate('/login')
    } else {
      toast.error(result.error)
    }
  }

  const handleExport = async (format) => {
    const projectId = selectedProjectId || user?.projectId
    if (!projectId) {
      toast.error('Aucun projet sélectionné')
      return
    }
    const isExcel = format === 'excel'
    try {
      setExportLoading(true)
      const call = isExcel ? exportAPI.exportToExcel : exportAPI.exportToPdf
      const response = await call(projectId, new Date(startDate).toISOString(), new Date(endDate).toISOString())
      const extension = isExcel ? 'xlsx' : 'pdf'
      downloadBlob(response.data, `export_${projectId}_${Date.now()}.${extension}`)
      toast.success(`Export ${isExcel ? 'Excel' : 'PDF'} téléchargé !`)
      setExportModalVisible(false)
    } catch (error) {
      console.error('Erreur export:', error)
      toast.error(`Impossible de générer l'export ${isExcel ? 'Excel' : 'PDF'}.`)
    } finally {
      setExportLoading(false)
    }
  }

  const handleCurrencyChange = async (curr) => {
    try {
      const projectId = selectedProjectId || user?.projectId
      if (!projectId) {
        toast.error('Aucun projet sélectionné')
        return
      }
      await projectsAPI.updateCurrency(projectId, curr.code)
      setProjectCurrency(curr.code)
      loadAvailableProjects(availableProjects.map(p =>
        p._id === projectId ? { ...p, currency: curr.code } : p
      ))
      setCurrencyModalVisible(false)
      toast.success(`Devise changée en ${curr.name} (${curr.symbol}). Toute l'équipe verra cette devise.`)
      loadDashboardData()
    } catch (error) {
      console.error('Error updating currency:', error)
      toast.error('Impossible de changer la devise')
    }
  }

  const monthlyData = (stats?.monthlyData || []).map(d => ({
    month: d.month?.split(' ')[0] || d.month,
    Ventes: d.sales,
    Dépenses: d.expenses,
    Bénéfice: d.profit,
  }))

  const pieData = stats?.expensesByCategory
    ? [
        { name: 'Achats', value: stats.expensesByCategory.purchase || 0 },
        { name: 'Variables', value: stats.expensesByCategory.variable || 0 },
        { name: 'Fixes', value: stats.expensesByCategory.fixed || 0 },
        { name: 'Salaires', value: stats.expensesByCategory.salaries || 0 },
      ].filter(item => item.value > 0)
    : []

  if (loading) {
    return (
      <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* En-tête utilisateur */}
      <div className="card p-5 sm:p-6 bg-gradient-to-r from-night-800 via-night-800 to-gold-700/10 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0 w-fit">
            <input type="file" accept="image/*" className="hidden" onChange={handleChangeProfilePhoto} />
            {user?.photo ? (
              <img src={user.photo} alt="Profil" className="w-16 h-16 rounded-2xl object-cover border-2 border-gold-500/40" />
            ) : (
              <span className="w-16 h-16 rounded-2xl bg-gradient-gold-deep flex items-center justify-center text-2xl font-extrabold text-night-950">
                {(user?.fullName || user?.username)?.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5 text-night-950" />
            </span>
          </label>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">Bonjour 👋</p>
            <h1 className="text-xl sm:text-2xl font-bold text-cream truncate">{user?.fullName || user?.username}</h1>
            <p className="inline-flex items-center gap-1.5 text-[13px] text-gold-400 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              {user?.role === 'admin' ? 'Administrateur' : user?.role === 'manager' ? 'Responsable' : 'Salarié'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="btn-ghost !p-2.5" title="Actualiser">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button onClick={() => setCurrencyModalVisible(true)} className="btn-secondary !px-3" title="Changer la devise">
                <Coins className="w-4 h-4 text-gold-500" />
                {currency.symbol}
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setExportModalVisible(true)} className="btn-secondary !px-3" title="Exporter les données">
                <Download className="w-4 h-4 text-gold-500" />
                <span className="hidden sm:inline">Exporter</span>
              </button>
            )}
            <button onClick={() => setSettingsModalVisible(true)} className="btn-ghost !p-2.5" title="Paramètres">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bannière abonnement */}
      {isAdminAuth && subscription && (
        <button
          onClick={() => navigate('/abonnement')}
          className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-all hover:brightness-110 animate-in stagger-1 ${
            isPremium ? 'bg-gradient-premium shadow-premium' : 'bg-gradient-gold-deep shadow-gold'
          }`}
        >
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            {isPremium ? <Gem className="w-5 h-5 text-white" /> : <Star className="w-5 h-5 text-night-950" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className={`block text-sm font-bold ${isPremium ? 'text-white' : 'text-night-950'}`}>
              {isPremium ? `Plan ${subscription.planLabel || 'Premium'}` : 'Passer au Premium'}
            </span>
            <span className={`block text-[11px] mt-0.5 ${isPremium ? 'text-white/75' : 'text-night-950/70'}`}>
              {isPremium
                ? (subscription.daysLeft !== null ? `${subscription.daysLeft}j restants · ${subscription.maxProjects} business` : 'Abonnement actif')
                : 'Débloquez toutes les fonctionnalités'}
            </span>
          </span>
          <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isPremium ? 'text-white/70' : 'text-night-950/60'}`} />
        </button>
      )}

      {/* Stats principales */}
      {stats && isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Ventes totales" value={formatPrice(stats.totalSales || 0)} sub={`${stats.salesCount || 0} ventes`} icon={Banknote} />
            <Stat label="Dépenses" value={formatPrice(stats.totalExpenses || 0)} sub={`${stats.expensesCount || 0} dépenses`} icon={TrendingDown} color="bg-red-500/80" iconClass="text-white" className="stagger-1" />
            <Stat label="Masse salariale" value={formatPrice((stats.totalSalaries || 0) + (stats.totalCommissions || 0))} sub="Salaires + Commissions" icon={Users} color="bg-amber-500/80" iconClass="text-white" className="stagger-2" />
            <Stat label="Valeur Stock" value={formatPrice(stats.totalStock || 0)} sub={`${stats.stockItems || 0} articles`} icon={Boxes} color="bg-night-600" iconClass="text-gold-400" className="stagger-3" />
          </div>

          {/* Bénéfice net — chiffre héro */}
          <div className={`card p-6 animate-in stagger-2 border-l-4 ${stats.netProfit >= 0 ? '!border-l-gold-500' : '!border-l-red-500'}`}>
            <p className="text-[13px] text-gray-400 font-medium">Bénéfice Net</p>
            <p className={`text-4xl font-extrabold tracking-tight mt-1 ${stats.netProfit >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
              {formatPrice(stats.netProfit || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Ventes − Dépenses − Salaires</p>
          </div>

          {/* Graphiques */}
          {(monthlyData.length > 0 || pieData.length > 0) && (
            <div className="grid gap-4 xl:grid-cols-2">
              {monthlyData.length > 0 && (
                <div className="card p-5 animate-in stagger-3">
                  <h3 className="text-sm font-semibold text-cream mb-1 flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4 text-gold-500" />
                    Ventes vs Dépenses (6 derniers mois)
                  </h3>
                  <div className="h-64 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={CHART_TEXT.grid} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatPrice(v)} />
                        <Legend wrapperStyle={{ fontSize: 12.5, color: CHART_TEXT.secondary }} />
                        <Line type="monotone" dataKey="Ventes" stroke={SERIES.gold} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Dépenses" stroke={SERIES.red} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {monthlyData.length > 0 && (
                <div className="card p-5 animate-in stagger-4">
                  <h3 className="text-sm font-semibold text-cream mb-1">Bénéfices mensuels</h3>
                  <div className="h-64 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={CHART_TEXT.grid} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatPrice(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="Bénéfice" fill={SERIES.gold} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {pieData.length > 0 && (
                <div className="card p-5 animate-in stagger-5">
                  <h3 className="text-sm font-semibold text-cream mb-1">Répartition des charges</h3>
                  <div className="h-64 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="#1A1A1A" strokeWidth={2}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatPrice(v)} />
                        <Legend wrapperStyle={{ fontSize: 12.5 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {stats.topProducts?.length > 0 && (
                <div className="card p-5 animate-in stagger-5">
                  <h3 className="text-sm font-semibold text-cream mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gold-500" />
                    Top 5 Produits
                  </h3>
                  <div className="space-y-3">
                    {stats.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          index === 0 ? 'bg-gold-500 text-night-950' : 'bg-night-700 text-gold-400'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-cream truncate">{product.productName}</p>
                          <p className="text-[11px] text-gray-500">{product.quantity} ventes</p>
                        </div>
                        <p className="text-[13px] font-semibold text-gold-400 flex-shrink-0">{formatPrice(product.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aperçu détaillé */}
          <div className="card p-5 animate-in">
            <h3 className="text-sm font-semibold text-cream mb-4">Aperçu détaillé</h3>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                ['Nombre de ventes', stats.salesCount || 0, SERIES.gold],
                ['Nombre de dépenses', stats.expensesCount || 0, SERIES.red],
                ['Salaires', formatPrice(stats.totalSalaries || 0), SERIES.blue],
                ['Commissions', formatPrice(stats.totalCommissions || 0), SERIES.violet],
                ['Articles en stock', stats.stockItems || 0, SERIES.gold],
              ].map(([label, value, dot]) => (
                <div key={label} className="flex items-center justify-between border-b border-night-700/60 pb-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
                    {label}
                  </span>
                  <span className="text-[13px] font-semibold text-cream">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!stats && (
        <div className="card p-10 text-center text-gray-500 text-sm">
          Sélectionnez ou créez un business pour voir vos statistiques.
          <div className="mt-4">
            <button onClick={() => navigate('/projets')} className="btn-primary">Mes business</button>
          </div>
        </div>
      )}

      {/* Modal Export */}
      <Modal open={exportModalVisible} onClose={() => setExportModalVisible(false)} title="📊 Export des données">
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-400 leading-relaxed">
            Sélectionnez la période et le format d'export (Excel ou PDF) pour toutes les données :
            ventes, dépenses, stocks, salaires, employés, commissions, bilan et clients.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Date de début</label>
              <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Date de fin</label>
              <input type="date" value={endDate} min={startDate} max={toInputDate(new Date())} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="rounded-xl bg-night-900 border border-night-700 p-4">
            <p className="text-[13px] font-semibold text-cream mb-2">Contenu de l'export</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['Ventes', 'Dépenses', 'Stocks', 'Employés', 'Commissions', 'Salaires', 'Clients', 'Bilan'].map(item => (
                <p key={item} className="text-[12.5px] text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />{item}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleExport('excel')} disabled={exportLoading} className="btn-primary flex-1 !py-3">
              {exportLoading ? <Spinner className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              Excel
            </button>
            <button onClick={() => handleExport('pdf')} disabled={exportLoading} className="btn-danger flex-1 !py-3">
              {exportLoading ? <Spinner className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              PDF
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Devise */}
      <Modal open={currencyModalVisible} onClose={() => setCurrencyModalVisible(false)} title="💱 Choisir la devise" size="sm">
        <div className="p-5 space-y-2">
          {availableCurrencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencyChange(curr)}
              className={`flex items-center gap-3 w-full p-3.5 rounded-xl border transition-all ${
                currency.code === curr.code
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-night-600 hover:border-night-500 bg-night-900'
              }`}
            >
              <span className="w-10 h-10 rounded-xl bg-night-700 flex items-center justify-center text-sm font-bold text-gold-400">{curr.symbol}</span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold text-cream">{curr.name}</span>
                <span className="block text-[11px] text-gray-500">{curr.code}</span>
              </span>
              {currency.code === curr.code && <span className="w-2.5 h-2.5 rounded-full bg-gold-500" />}
            </button>
          ))}
          <p className="text-[11.5px] text-gray-500 pt-2">
            ℹ️ La devise sera appliquée à ce projet. Toute l'équipe verra les montants dans cette devise.
          </p>
        </div>
      </Modal>

      {/* Modal Paramètres */}
      <Modal open={settingsModalVisible} onClose={() => setSettingsModalVisible(false)} title="Paramètres" size="sm">
        <div className="p-4 space-y-1.5">
          {isAdminAuth && (
            <button
              onClick={() => { setSettingsModalVisible(false); navigate('/abonnement') }}
              className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-night-700 transition-colors text-left"
            >
              <span className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center"><Crown className="w-5 h-5 text-gold-500" /></span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-cream">Mon abonnement</span>
                <span className="block text-[11.5px] text-gray-500">Gérer votre plan</span>
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <button
            onClick={() => { setSettingsModalVisible(false); setLogoutConfirm(true) }}
            className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-night-700 transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><LogOut className="w-5 h-5 text-amber-400" /></span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-cream">Déconnexion</span>
              <span className="block text-[11.5px] text-gray-500">Se déconnecter de l'application</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <div className="border-t border-night-700 my-2" />
          <button
            onClick={() => { setSettingsModalVisible(false); setDeletePassword(''); setDeleteModalVisible(true) }}
            className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-red-500/[0.08] transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-400" /></span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-red-400">Supprimer mon compte</span>
              <span className="block text-[11.5px] text-gray-500">Suppression définitive de vos données</span>
            </span>
            <ChevronRight className="w-4 h-4 text-red-400/60" />
          </button>
        </div>
      </Modal>

      {/* Modal suppression de compte */}
      <Modal open={deleteModalVisible} onClose={() => !deleteLoading && setDeleteModalVisible(false)} title="Supprimer votre compte ?" size="sm">
        <div className="p-6 space-y-4">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-[13px] text-gray-400 text-center leading-relaxed">
            Cette action est irréversible. Toutes vos données, projets, ventes, dépenses et historiques
            seront définitivement supprimés.
          </p>
          <div>
            <label className="input-label">Saisissez votre mot de passe pour confirmer :</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Votre mot de passe"
              disabled={deleteLoading}
              className="input-field"
            />
          </div>
          <button onClick={handleDeleteAccountConfirm} disabled={deleteLoading} className="btn-danger w-full !py-3">
            {deleteLoading ? <Spinner className="w-4 h-4" /> : 'Supprimer définitivement'}
          </button>
          <button onClick={() => setDeleteModalVisible(false)} disabled={deleteLoading} className="btn-ghost w-full">Annuler</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={() => { setLogoutConfirm(false); logout(); navigate('/login') }}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Déconnexion"
        variant="warning"
      />
    </div>
  )
}
