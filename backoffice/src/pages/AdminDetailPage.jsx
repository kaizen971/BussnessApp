import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, UserCheck, UserX, Send, CreditCard, Activity, FolderOpen, Clock, Loader2, RefreshCw, Banknote, Heart, AlertTriangle, ChevronRight, Plus, Check, Package, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Skeleton, ConfirmDialog, Modal } from '../components/ui'
import api from '../services/api'

const METHOD_LABELS = { card: 'Carte', cash: 'Liquide', donation: 'Donation' }

const SUB_STATUS = {
  pending_payment: { label: 'En attente', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  expired: { label: 'Expiré', variant: 'neutral' },
  cancelled: { label: 'Annulé', variant: 'danger' },
  suspended: { label: 'Suspendu', variant: 'warning' },
}

const PAY_STATUS = {
  pending: { label: 'En attente', variant: 'warning' },
  completed: { label: 'Complété', variant: 'success' },
  failed: { label: 'Échoué', variant: 'danger' },
  refunded: { label: 'Remboursé', variant: 'neutral' },
}

const ACTION_LABELS = {
  login: 'Connexion', create_admin: 'Admin créé', deactivate_admin: 'Admin désactivé',
  activate_admin: 'Admin activé', send_credentials: 'Identifiants envoyés',
  update_subscription: 'Abonnement modifié', payment_completed: 'Paiement reçu',
  resend_payment_link: 'Lien renvoyé', assign_subscription: 'Abonnement attribué',
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatShort(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [tab, setTab] = useState('subscriptions')
  const [confirm, setConfirm] = useState({ open: false, type: null })
  const [showSubModal, setShowSubModal] = useState(false)
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [subForm, setSubForm] = useState({ planId: '', paymentMethod: 'cash', notes: '' })
  const [subSaving, setSubSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get(`/backoffice/admins/${id}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleConfirmAction = async () => {
    const type = confirm.type
    setActionLoading(type)
    try {
      if (type === 'toggle') {
        await api.put(`/backoffice/admins/${id}/status`)
        toast.success(`Admin ${data.admin.isActive ? 'désactivé' : 'activé'}`)
        load()
      } else if (type === 'creds') {
        const res = await api.post(`/backoffice/admins/${id}/send-credentials`)
        toast.success(res.data.message)
      } else if (type === 'link') {
        const res = await api.post(`/backoffice/admins/${id}/resend-payment-link`)
        toast.success(res.data.message)
      } else if (type === 'delete') {
        await api.delete(`/backoffice/admins/${id}`)
        toast.success('Admin supprimé définitivement')
        navigate('/admins')
        return
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setActionLoading(null)
    setConfirm({ open: false, type: null })
  }

  const openSubModal = async () => {
    setShowSubModal(true)
    setSubForm({ planId: '', paymentMethod: 'cash', notes: '' })
    if (plans.length === 0) {
      setPlansLoading(true)
      try {
        const res = await api.get('/backoffice/plans', { params: { active: 'true' } })
        setPlans(res.data)
        if (res.data.length > 0) setSubForm(f => ({ ...f, planId: res.data[0]._id }))
      } catch { toast.error('Erreur chargement des plans') }
      setPlansLoading(false)
    } else {
      if (!subForm.planId && plans.length > 0) setSubForm(f => ({ ...f, planId: plans[0]._id }))
    }
  }

  const handleAssignSubscription = async (e) => {
    e.preventDefault()
    if (!subForm.planId) { toast.error('Sélectionnez un plan'); return }
    setSubSaving(true)
    try {
      const res = await api.post(`/backoffice/admins/${id}/subscription`, subForm)
      toast.success(res.data.message)
      if (res.data.paymentLink) toast.success('Lien Stripe envoyé par email', { duration: 5000 })
      setShowSubModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setSubSaving(false)
  }

  const confirmConfig = () => {
    if (!data) return {}
    const admin = data.admin
    if (confirm.type === 'toggle' && admin.isActive) return { title: 'Désactiver cet admin ?', message: `${admin.fullName} n'aura plus accès à l'application.`, confirmText: 'Désactiver', variant: 'danger' }
    if (confirm.type === 'toggle') return { title: 'Réactiver cet admin ?', message: `${admin.fullName} retrouvera l'accès.`, confirmText: 'Activer', variant: 'success' }
    if (confirm.type === 'creds') return { title: 'Envoyer les identifiants ?', message: `Un nouveau mot de passe sera envoyé à ${admin.email}.`, confirmText: 'Envoyer', variant: 'info' }
    if (confirm.type === 'link') return { title: 'Renvoyer le lien ?', message: `Un email de rappel sera envoyé à ${admin.email}.`, confirmText: 'Renvoyer', variant: 'info' }
    if (confirm.type === 'delete') return { title: 'Supprimer définitivement ?', message: `${admin.fullName || admin.username} sera supprimé avec tous ses projets, abonnements et données. Cette action est irréversible.`, confirmText: 'Supprimer', variant: 'danger' }
    return {}
  }

  const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' }
  const PAYMENT_METHODS = [
    { id: 'card', label: 'Carte bancaire', desc: 'Lien Stripe par email', icon: CreditCard, color: 'blue' },
    { id: 'cash', label: 'Liquide', desc: 'Paiement reçu en main', icon: Banknote, color: 'emerald' },
    { id: 'donation', label: 'Donation', desc: 'Accès offert', icon: Heart, color: 'pink' },
  ]

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in">
        <Skeleton className="h-4 w-32" />
        <div className="card p-6">
          <div className="flex items-start gap-5">
            <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-80" />
            </div>
          </div>
        </div>
        <div className="flex gap-1"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div>
        <div className="card"><div className="p-5 space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div></div>
      </div>
    )
  }

  if (!data) return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="card p-12 text-center animate-in">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-600">Admin non trouvé</p>
        <Link to="/admins" className="btn-primary mt-4">Retour aux admins</Link>
      </div>
    </div>
  )

  const { admin, subscriptions, payments, projects, activities } = data
  const latestSub = subscriptions[0]
  const hasPendingPayment = latestSub?.status === 'pending_payment' && latestSub?.stripePaymentLinkUrl

  const tabs = [
    { key: 'subscriptions', label: 'Abonnements', count: subscriptions.length, icon: CreditCard },
    { key: 'payments', label: 'Paiements', count: payments.length, icon: Banknote },
    { key: 'projects', label: 'Projets', count: projects.length, icon: FolderOpen },
    { key: 'activity', label: 'Activité', count: activities.length, icon: Activity },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm animate-in">
        <button onClick={() => navigate('/admins')} className="text-gray-400 hover:text-gray-600 transition-colors font-medium">Administrateurs</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-gray-700 font-medium truncate">{admin.fullName || admin.username}</span>
      </nav>

      {/* Header card */}
      <div className="card p-6 animate-in stagger-1">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg shadow-primary-500/20">
            {(admin.fullName || admin.username)?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{admin.fullName || admin.username}</h1>
              <Badge variant={admin.isActive ? 'success' : 'danger'} dot>{admin.isActive ? 'Actif' : 'Inactif'}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{admin.email}</p>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">@{admin.username}</span>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">Créé le {formatShort(admin.createdAt)}</span>
              {latestSub && <Badge variant={SUB_STATUS[latestSub.status]?.variant || 'neutral'}>{latestSub.planName || latestSub.plan}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <button
              onClick={() => setConfirm({ open: true, type: 'toggle' })}
              disabled={actionLoading === 'toggle'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 ${admin.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm'}`}
            >
              {actionLoading === 'toggle' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : admin.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {admin.isActive ? 'Désactiver' : 'Activer'}
            </button>
            <button
              onClick={() => setConfirm({ open: true, type: 'creds' })}
              disabled={actionLoading === 'creds'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 hover:shadow-sm transition-all disabled:opacity-50"
            >
              {actionLoading === 'creds' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Identifiants
            </button>
            {hasPendingPayment && (
              <button
                onClick={() => setConfirm({ open: true, type: 'link' })}
                disabled={actionLoading === 'link'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm transition-all disabled:opacity-50"
              >
                {actionLoading === 'link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Lien paiement
              </button>
            )}
            <button
              onClick={openSubModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Abonnement
            </button>
            <button
              onClick={() => setConfirm({ open: true, type: 'delete' })}
              disabled={actionLoading === 'delete'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm transition-all disabled:opacity-50"
            >
              {actionLoading === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Supprimer
            </button>
          </div>
        </div>

        {!admin.isActive && (
          <div className="mt-5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Compte désactivé</p>
              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">L'accès à l'application et aux projets de cet admin est suspendu.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-white border border-gray-100 rounded-xl p-1 shadow-sm overflow-x-auto animate-in stagger-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tab === t.key ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${tab === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card overflow-hidden animate-in stagger-3">
        {tab === 'subscriptions' && (
          subscriptions.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Aucun abonnement</p>
              <p className="text-xs text-gray-400 mt-1">Cet admin n'a pas encore d'abonnement</p>
              <button onClick={openSubModal} className="btn-primary mt-4 text-[13px] py-2">
                <Plus className="w-3.5 h-3.5" /> Attribuer un abonnement
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Statut</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Montant</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Paiement</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Période</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {subscriptions.map(sub => {
                    const st = SUB_STATUS[sub.status] || { label: sub.status, variant: 'neutral' }
                    return (
                      <tr key={sub._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-gray-900">{sub.planName || sub.plan}</p>
                          <p className="text-xs text-gray-400 mt-0.5">max {sub.maxProjects || '?'} business</p>
                        </td>
                        <td className="px-5 py-3.5"><Badge variant={st.variant} dot>{st.label}</Badge></td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{sub.amount}&euro;</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{METHOD_LABELS[sub.paymentMethod] || sub.paymentMethod}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">
                          {formatShort(sub.startDate)} &rarr; {formatShort(sub.endDate)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'payments' && (
          payments.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Aucun paiement</p>
              <p className="text-xs text-gray-400 mt-1">Pas encore de transaction enregistrée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Montant</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Méthode</th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {payments.map(pay => {
                    const st = PAY_STATUS[pay.status] || { label: pay.status, variant: 'neutral' }
                    return (
                      <tr key={pay._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-gray-700">{formatDate(pay.paidAt || pay.createdAt)}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{pay.amount}&euro;</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}</td>
                        <td className="px-5 py-3.5"><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'projects' && (
          projects.length === 0 ? (
            <div className="py-16 text-center">
              <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Aucun projet</p>
              <p className="text-xs text-gray-400 mt-1">Cet admin n'a pas encore créé de business</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/60">
              {projects.map((proj, i) => (
                <div key={proj._id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors animate-in`} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="w-11 h-11 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center ring-1 ring-primary-200/50">
                    <FolderOpen className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{proj.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{proj.description || 'Pas de description'} · {proj.currency || 'EUR'}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-lg flex-shrink-0">{formatShort(proj.createdAt)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'activity' && (
          activities.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Aucune activité</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/60 max-h-[500px] overflow-y-auto scrollbar-thin">
              {activities.map((log, i) => (
                <div key={log._id} className={`flex items-start gap-3.5 px-5 py-4 hover:bg-gray-50/50 transition-colors animate-in`} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-gray-100">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                    {log.details && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{log.details}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 font-medium bg-gray-50 px-2.5 py-1 rounded-lg">{formatDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, type: null })}
        onConfirm={handleConfirmAction}
        loading={!!actionLoading}
        {...confirmConfig()}
      />

      <Modal open={showSubModal} onClose={() => setShowSubModal(false)} title="Attribuer un abonnement">
        <form onSubmit={handleAssignSubscription} className="p-6 space-y-5">
          {latestSub?.status === 'active' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Abonnement actif existant</p>
                <p className="text-xs text-amber-600 mt-0.5">L'abonnement actuel ({latestSub.planName}) sera annulé et remplacé par le nouveau.</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Plan d'abonnement</label>
            {plansLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : plans.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <Package className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun plan actif</p>
                <Link to="/plans" className="text-xs text-primary-500 font-semibold mt-1 inline-block">Créer un plan</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map(plan => {
                  const isSelected = subForm.planId === plan._id
                  return (
                    <button key={plan._id} type="button" onClick={() => setSubForm(f => ({ ...f, planId: plan._id }))}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-primary-300 bg-primary-50/50 ring-2 ring-primary-300/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{plan.price}</span>
                        <span className="text-xs text-gray-400">&euro;</span>
                      </div>
                      <p className={`text-sm font-semibold mt-1 ${isSelected ? 'text-primary-600' : 'text-gray-700'}`}>{plan.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plan.durationType === 'lifetime' ? 'À vie' : `${plan.duration} ${DURATION_LABELS[plan.durationType]}`}</span>
                        <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {plan.maxProjects} biz</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Mode de paiement</label>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon
                const isSelected = subForm.paymentMethod === method.id
                const colorMap = { blue: 'border-blue-300 bg-blue-50', emerald: 'border-emerald-300 bg-emerald-50', pink: 'border-pink-300 bg-pink-50' }
                const iconColorMap = { blue: 'text-blue-600 bg-blue-100', emerald: 'text-emerald-600 bg-emerald-100', pink: 'text-pink-600 bg-pink-100' }
                return (
                  <button key={method.id} type="button" onClick={() => setSubForm(f => ({ ...f, paymentMethod: method.id }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${isSelected ? `${colorMap[method.color]} ring-2 ring-opacity-30` : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${isSelected ? iconColorMap[method.color] : 'bg-gray-50 text-gray-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700">{method.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{method.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Notes (optionnel)</label>
            <textarea value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Notes internes..." />
          </div>

          <div className="flex items-center gap-3 justify-end pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setShowSubModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-all">Annuler</button>
            <button type="submit" disabled={subSaving || !subForm.planId} className="btn-primary">
              {subSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {subForm.paymentMethod === 'card' ? 'Attribuer & Envoyer le lien' : 'Attribuer & Activer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
