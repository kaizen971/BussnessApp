import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Banknote, Heart, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Badge, SkeletonTable, EmptyState, ConfirmDialog } from '../components/ui'
import api from '../services/api'

const METHOD_ICONS = { card: CreditCard, cash: Banknote, donation: Heart }
const METHOD_LABELS = { card: 'Carte', cash: 'Liquide', donation: 'Donation' }

const STATUS_CONFIG = {
  pending_payment: { label: 'En attente', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  expired: { label: 'Expiré', variant: 'neutral' },
  cancelled: { label: 'Annulé', variant: 'danger' },
  suspended: { label: 'Suspendu', variant: 'warning' },
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activer', variant: 'success' },
  { value: 'suspended', label: 'Suspendre', variant: 'warning' },
  { value: 'cancelled', label: 'Annuler', variant: 'danger' },
]

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState({ open: false, sub: null, status: null })
  const [actionLoading, setActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.status = filter
    api.get('/backoffice/subscriptions', { params })
      .then(res => setSubscriptions(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleStatusChange = (sub, newStatus) => {
    const opt = STATUS_OPTIONS.find(o => o.value === newStatus)
    setConfirm({ open: true, sub, status: newStatus, label: opt?.label || newStatus, variant: opt?.variant || 'info' })
  }

  const confirmUpdate = async () => {
    setActionLoading(true)
    try {
      await api.put(`/backoffice/subscriptions/${confirm.sub._id}/status`, { status: confirm.status })
      toast.success('Statut mis à jour')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setActionLoading(false)
    setConfirm({ open: false, sub: null, status: null })
  }

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'active', label: 'Actifs' },
    { key: 'pending_payment', label: 'En attente' },
    { key: 'suspended', label: 'Suspendus' },
    { key: 'cancelled', label: 'Annulés' },
  ]

  const confirmMessage = () => {
    if (!confirm.sub) return ''
    const admin = confirm.sub.adminId
    const name = admin?.fullName || admin?.username || 'cet admin'
    if (confirm.status === 'active') return `L'abonnement de ${name} sera activé immédiatement.`
    if (confirm.status === 'suspended') return `L'abonnement de ${name} sera suspendu. L'accès sera limité.`
    if (confirm.status === 'cancelled') return `L'abonnement de ${name} sera annulé définitivement.`
    return `Modifier le statut de l'abonnement de ${name} ?`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader title="Abonnements" description="Suivez et gérez tous les abonnements" />

      {/* Filters */}
      <div className="flex gap-0.5 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto shadow-sm animate-in stagger-1">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${filter === f.key ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-in stagger-2">
        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Aucun abonnement trouvé"
            description="Les abonnements apparaîtront ici quand des admins seront créés"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Admin</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Statut</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Montant</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Business</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Période</th>
                  <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {subscriptions.map((sub, i) => {
                  const st = STATUS_CONFIG[sub.status] || { label: sub.status, variant: 'neutral' }
                  const MethodIcon = METHOD_ICONS[sub.paymentMethod] || CreditCard
                  const admin = sub.adminId

                  return (
                    <tr key={sub._id} className="hover:bg-primary-50/30 transition-colors group animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-5 py-3.5">
                        {admin ? (
                          <Link to={`/admins/${admin._id}`} className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-xs font-bold ring-1 ring-primary-200/50 flex-shrink-0">
                              {(admin.fullName || admin.username)?.[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">{admin.fullName || admin.username}</p>
                              <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Admin supprimé</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{sub.planName || sub.plan}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MethodIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{METHOD_LABELS[sub.paymentMethod]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={st.variant} dot>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-gray-900">{sub.amount}&euro;</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-sm font-semibold text-gray-700">{sub.maxProjects || '?'}</span>
                        <span className="text-xs text-gray-400 ml-0.5">max</span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-gray-500 font-medium">{formatDate(sub.startDate)} &rarr; {formatDate(sub.endDate)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="relative inline-block">
                          <select
                            value=""
                            onChange={e => { if (e.target.value) handleStatusChange(sub, e.target.value) }}
                            className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                          >
                            <option value="">Modifier...</option>
                            {STATUS_OPTIONS.filter(o => o.value !== sub.status).map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, sub: null, status: null })}
        onConfirm={confirmUpdate}
        loading={actionLoading}
        title={`${confirm.label || 'Modifier'} cet abonnement ?`}
        message={confirmMessage()}
        confirmText={confirm.label || 'Confirmer'}
        variant={confirm.variant || 'info'}
      />
    </div>
  )
}
