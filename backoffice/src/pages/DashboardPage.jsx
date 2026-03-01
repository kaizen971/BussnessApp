import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, CreditCard, TrendingUp, Activity, ArrowRight, AlertCircle, Package, ArrowUpRight, UserPlus, Eye } from 'lucide-react'
import { SkeletonCard, SkeletonRow, Badge, Skeleton } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const METHOD_LABELS = { card: 'Carte', cash: 'Liquide', donation: 'Donation' }
const METHOD_COLORS = { card: 'bg-blue-500', cash: 'bg-emerald-500', donation: 'bg-pink-500' }

const ACTION_CONFIG = {
  login: { label: 'Connexion', color: 'bg-blue-100 text-blue-600' },
  create_admin: { label: 'Admin créé', color: 'bg-emerald-100 text-emerald-600' },
  deactivate_admin: { label: 'Admin désactivé', color: 'bg-red-100 text-red-600' },
  activate_admin: { label: 'Admin activé', color: 'bg-emerald-100 text-emerald-600' },
  send_credentials: { label: 'Identifiants envoyés', color: 'bg-violet-100 text-violet-600' },
  create_superadmin: { label: 'Super-admin créé', color: 'bg-primary-100 text-primary-600' },
  update_subscription: { label: 'Abonnement modifié', color: 'bg-amber-100 text-amber-600' },
  payment_completed: { label: 'Paiement reçu', color: 'bg-emerald-100 text-emerald-600' },
  resend_payment_link: { label: 'Lien renvoyé', color: 'bg-blue-100 text-blue-600' },
  assign_subscription: { label: 'Abonnement attribué', color: 'bg-indigo-100 text-indigo-600' },
  activate_superadmin: { label: 'Super-admin activé', color: 'bg-emerald-100 text-emerald-600' },
  deactivate_superadmin: { label: 'Super-admin désactivé', color: 'bg-red-100 text-red-600' },
  create_plan: { label: 'Plan créé', color: 'bg-indigo-100 text-indigo-600' },
  update_plan: { label: 'Plan modifié', color: 'bg-indigo-100 text-indigo-600' },
  delete_plan: { label: 'Plan supprimé', color: 'bg-red-100 text-red-600' },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function ProgressBar({ value, max, color = 'bg-primary-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, to, progress }) {
  return (
    <Link to={to || '#'} className="card-hover p-5 group animate-in block">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className="text-[26px] font-bold text-gray-900 mt-1.5 tracking-tight leading-none">{value}</p>
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {progress && (
        <div className="mt-3">
          <ProgressBar value={progress.value} max={progress.max} color={progress.color} />
          <p className="text-[11px] text-gray-400 mt-1.5">{progress.label}</p>
        </div>
      )}
      {!progress && sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/backoffice/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="animate-in">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 card"><div className="px-5 py-4 border-b border-gray-100"><Skeleton className="h-5 w-48" /></div>{[0,1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
          <div className="lg:col-span-2 card"><div className="px-5 py-4 border-b border-gray-100"><Skeleton className="h-5 w-36" /></div>{[0,1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="card p-12 text-center animate-in">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Erreur de chargement</p>
          <p className="text-sm text-gray-400 mt-1">Impossible de charger les statistiques</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-5">Réessayer</button>
        </div>
      </div>
    )
  }

  const activeRate = stats.admins.total > 0 ? ((stats.admins.active / stats.admins.total) * 100).toFixed(0) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Voici ce qui se passe sur votre plateforme aujourd'hui</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/admins/new" className="btn-primary text-[13px] py-2">
            <UserPlus className="w-4 h-4" /> Nouvel admin
          </Link>
        </div>
      </div>

      {/* Alert banner */}
      {(stats.subscriptions.pending > 0 || stats.subscriptions.suspended > 0) && (
        <Link to="/subscriptions" className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4 group animate-in hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Attention requise</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              {stats.subscriptions.pending > 0 && `${stats.subscriptions.pending} paiement(s) en attente`}
              {stats.subscriptions.pending > 0 && stats.subscriptions.suspended > 0 && ' · '}
              {stats.subscriptions.suspended > 0 && `${stats.subscriptions.suspended} abonnement(s) suspendu(s)`}
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Administrateurs" value={stats.admins.total} color="bg-primary-500" to="/admins"
          progress={{ value: stats.admins.active, max: stats.admins.total, color: 'bg-primary-500', label: `${activeRate}% actifs · ${stats.admins.inactive} inactifs` }}
        />
        <StatCard
          icon={Package} label="Plans actifs" value={stats.plans?.active || 0} color="bg-indigo-500" to="/plans"
          sub={`${stats.plans?.total || 0} plan(s) au total`}
        />
        <StatCard
          icon={CreditCard} label="Abonnements actifs" value={stats.subscriptions.active} color="bg-blue-500" to="/subscriptions"
          progress={{ value: stats.subscriptions.active, max: stats.subscriptions.active + stats.subscriptions.pending + stats.subscriptions.suspended, color: 'bg-blue-500', label: `${stats.subscriptions.pending} en attente · ${stats.subscriptions.suspended} suspendus` }}
        />
        <StatCard
          icon={TrendingUp} label="Revenus" value={`${stats.revenue.total.toFixed(0)}\u20AC`} color="bg-emerald-500" to="#"
          sub={
            stats.revenue.monthly > 0
              ? `${stats.revenue.monthly.toFixed(0)}\u20AC ce mois`
              : 'Pas encore de revenus ce mois'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent admins */}
        <div className="lg:col-span-3 card animate-in stagger-1">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-[15px]">Derniers administrateurs</h2>
            <Link to="/admins" className="text-xs text-primary-500 hover:text-primary-600 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100/60">
            {stats.recentAdmins.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Aucun administrateur</p>
                <p className="text-xs text-gray-400 mt-1">Créez votre premier admin pour commencer</p>
                <Link to="/admins/new" className="btn-primary mt-4 text-[13px] py-2">
                  <UserPlus className="w-3.5 h-3.5" /> Créer un admin
                </Link>
              </div>
            ) : (
              stats.recentAdmins.map((admin, i) => (
                <Link key={admin._id} to={`/admins/${admin._id}`} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group" style={{ animation: `fadeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 50}ms` }}>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-sm font-bold ring-1 ring-primary-200/50">
                    {(admin.fullName || admin.username)?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{admin.fullName || admin.username}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{admin.email}</p>
                  </div>
                  <Badge variant={admin.isActive ? 'success' : 'danger'} dot>
                    {admin.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 card animate-in stagger-2">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-[15px]">Activité récente</h2>
          </div>
          <div className="divide-y divide-gray-100/60 max-h-[420px] overflow-y-auto scrollbar-thin">
            {stats.recentActivities.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Aucune activité</p>
                <p className="text-xs text-gray-400 mt-1">Les actions s'afficheront ici</p>
              </div>
            ) : (
              stats.recentActivities.map((log, i) => {
                const config = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={log._id} className="flex items-start gap-3 px-5 py-3.5" style={{ animation: `fadeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 40}ms` }}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color}`}>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-800 font-medium">{config.label}</p>
                      {log.details && <p className="text-xs text-gray-400 truncate mt-0.5 leading-relaxed">{log.details}</p>}
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5 tabular-nums">{timeAgo(log.createdAt)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment breakdown + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stats.paymentMethods.length > 0 && (
          <div className="lg:col-span-2 card p-6 animate-in stagger-3">
            <h2 className="font-semibold text-gray-900 text-[15px] mb-5">Répartition des paiements</h2>

            {/* Visual bar */}
            {(() => {
              const total = stats.paymentMethods.reduce((s, pm) => s + pm.total, 0)
              if (total === 0) return null
              return (
                <div className="flex h-3 rounded-full overflow-hidden mb-5 bg-gray-100">
                  {stats.paymentMethods.map(pm => (
                    <div key={pm._id} className={`${METHOD_COLORS[pm._id] || 'bg-gray-400'} transition-all duration-700`} style={{ width: `${(pm.total / total * 100).toFixed(1)}%` }} title={`${METHOD_LABELS[pm._id]}: ${pm.total.toFixed(0)}€`} />
                  ))}
                </div>
              )
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.paymentMethods.map(pm => {
                const total = stats.paymentMethods.reduce((s, p) => s + p.total, 0)
                const pct = total > 0 ? ((pm.total / total) * 100).toFixed(0) : 0
                return (
                  <div key={pm._id} className="bg-gray-50/80 rounded-xl p-5 border border-gray-100/60 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${METHOD_COLORS[pm._id] || 'bg-gray-400'}`} />
                        <span className="text-[13px] font-medium text-gray-600">{METHOD_LABELS[pm._id] || pm._id}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400">{pct}%</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{pm.total.toFixed(0)}<span className="text-sm font-normal text-gray-400 ml-0.5">&euro;</span></p>
                    <p className="text-xs text-gray-400 mt-1.5">{pm.count} paiement{pm.count > 1 ? 's' : ''}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className={`card p-6 animate-in stagger-4 ${stats.paymentMethods.length === 0 ? 'lg:col-span-3' : ''}`}>
          <h2 className="font-semibold text-gray-900 text-[15px] mb-4">Actions rapides</h2>
          <div className="space-y-2.5">
            <Link to="/admins/new" className="flex items-center gap-3.5 p-3.5 bg-primary-50/50 hover:bg-primary-50 border border-primary-100/60 rounded-xl transition-all group">
              <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Créer un admin</p>
                <p className="text-xs text-gray-400">Nouveau compte avec abonnement</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link to="/plans" className="flex items-center gap-3.5 p-3.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/60 rounded-xl transition-all group">
              <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Gérer les plans</p>
                <p className="text-xs text-gray-400">Tarifs, durées et limites</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link to="/subscriptions" className="flex items-center gap-3.5 p-3.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/60 rounded-xl transition-all group">
              <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Voir les abonnements</p>
                <p className="text-xs text-gray-400">Suivi et gestion des statuts</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
