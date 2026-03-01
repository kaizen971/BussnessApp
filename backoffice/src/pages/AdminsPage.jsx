import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Plus, MoreVertical, UserCheck, UserX, ChevronRight, CreditCard, Banknote, Heart, Send, RefreshCw, Users, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Badge, SkeletonTable, EmptyState, ConfirmDialog } from '../components/ui'
import api from '../services/api'

const SUB_STATUS = {
  pending_payment: { label: 'En attente', variant: 'warning' },
  active: { label: 'Actif', variant: 'success' },
  expired: { label: 'Expiré', variant: 'neutral' },
  cancelled: { label: 'Annulé', variant: 'danger' },
  suspended: { label: 'Suspendu', variant: 'warning' },
}

const METHOD_ICONS = { card: CreditCard, cash: Banknote, donation: Heart }
const METHOD_LABELS = { card: 'Carte', cash: 'Liquide', donation: 'Donation' }

export default function AdminsPage() {
  const [searchParams] = useSearchParams()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(searchParams.get('status') || 'all')
  const [activeMenu, setActiveMenu] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, admin: null, action: null })
  const [actionLoading, setActionLoading] = useState(false)

  const loadAdmins = () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.status = filter
    if (search) params.search = search
    api.get('/backoffice/admins', { params })
      .then(res => setAdmins(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAdmins() }, [filter])
  useEffect(() => {
    const t = setTimeout(() => { if (search !== '') loadAdmins(); else if (search === '' && !loading) loadAdmins() }, 350)
    return () => clearTimeout(t)
  }, [search])

  const handleAction = async () => {
    const { admin, action } = confirm
    setActionLoading(true)
    try {
      if (action === 'toggle') {
        await api.put(`/backoffice/admins/${admin._id}/status`)
        toast.success(`Admin ${admin.isActive ? 'désactivé' : 'activé'}`)
      } else if (action === 'credentials') {
        const res = await api.post(`/backoffice/admins/${admin._id}/send-credentials`)
        toast.success(res.data.message)
      } else if (action === 'resend') {
        const res = await api.post(`/backoffice/admins/${admin._id}/resend-payment-link`)
        toast.success(res.data.message)
      } else if (action === 'delete') {
        await api.delete(`/backoffice/admins/${admin._id}`)
        toast.success('Admin supprimé définitivement')
      }
      loadAdmins()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setActionLoading(false)
    setConfirm({ open: false, admin: null, action: null })
  }

  const openConfirm = (admin, action) => {
    setActiveMenu(null)
    setConfirm({ open: true, admin, action })
  }

  const confirmConfig = () => {
    const { admin, action } = confirm
    if (!admin) return {}
    if (action === 'toggle' && admin.isActive) return { title: 'Désactiver cet admin ?', message: `${admin.fullName || admin.username} n'aura plus accès à l'application et ses projets seront suspendus.`, confirmText: 'Désactiver', variant: 'danger' }
    if (action === 'toggle' && !admin.isActive) return { title: 'Réactiver cet admin ?', message: `${admin.fullName || admin.username} retrouvera l'accès à l'application.`, confirmText: 'Activer', variant: 'success' }
    if (action === 'credentials') return { title: 'Envoyer les identifiants ?', message: `Un nouveau mot de passe sera généré et envoyé à ${admin.email}.`, confirmText: 'Envoyer', variant: 'info' }
    if (action === 'resend') return { title: 'Renvoyer le lien de paiement ?', message: `Un email de rappel sera envoyé à ${admin.email}.`, confirmText: 'Renvoyer', variant: 'info' }
    if (action === 'delete') return { title: 'Supprimer définitivement ?', message: `${admin.fullName || admin.username} sera supprimé avec tous ses projets, abonnements et données. Cette action est irréversible.`, confirmText: 'Supprimer', variant: 'danger' }
    return {}
  }

  const filters = [
    { key: 'all', label: 'Tous', count: null },
    { key: 'active', label: 'Actifs' },
    { key: 'inactive', label: 'Inactifs' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader title="Administrateurs" description="Gérez les comptes admin et leurs abonnements">
        <Link to="/admins/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Créer un admin
        </Link>
      </PageHeader>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in stagger-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${filter === f.key ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-in stagger-2">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : admins.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun administrateur trouvé"
            description={search ? 'Essayez avec d\'autres termes de recherche' : 'Créez votre premier administrateur pour commencer'}
            action={!search ? () => window.location.href = '/admins/new' : undefined}
            actionLabel="Créer un admin"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Admin</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Statut</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Abonnement</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Paiement</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Business</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {admins.map((admin, i) => {
                  const sub = admin.subscription
                  const subCfg = sub ? SUB_STATUS[sub.status] : null
                  const MethodIcon = sub ? METHOD_ICONS[sub.paymentMethod] : null

                  return (
                    <tr key={admin._id} className={`hover:bg-primary-50/30 transition-colors group animate-in`} style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-5 py-3.5">
                        <Link to={`/admins/${admin._id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-sm font-bold ring-1 ring-primary-200/50 flex-shrink-0">
                            {(admin.fullName || admin.username)?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{admin.fullName || admin.username}</p>
                            <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={admin.isActive ? 'success' : 'danger'} dot>{admin.isActive ? 'Actif' : 'Inactif'}</Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {sub ? (
                          <div>
                            <Badge variant={subCfg?.variant || 'neutral'}>{subCfg?.label || sub.status}</Badge>
                            <p className="text-xs text-gray-500 mt-1 font-medium">{sub.planName || sub.plan}</p>
                            <p className="text-[11px] text-gray-400">{sub.amount}&euro; · max {sub.maxProjects || '?'} business</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Aucun</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {sub && MethodIcon ? (
                          <div className="flex items-center gap-2">
                            <MethodIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">{METHOD_LABELS[sub.paymentMethod]}</span>
                          </div>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-sm font-semibold text-gray-700">{admin.projectCount || 0}</span>
                        {sub?.maxProjects && <span className="text-xs text-gray-400">/{sub.maxProjects}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative">
                          <button onClick={() => setActiveMenu(activeMenu === admin._id ? null : admin._id)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeMenu === admin._id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 top-10 z-20 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 animate-scale-in">
                                <Link to={`/admins/${admin._id}`} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setActiveMenu(null)}>
                                  <ChevronRight className="w-4 h-4 text-gray-400" /> Voir les détails
                                </Link>
                                <div className="my-1 border-t border-gray-100" />
                                <button onClick={() => openConfirm(admin, 'toggle')}
                                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left font-medium hover:bg-gray-50 ${admin.isActive ? 'text-red-600' : 'text-emerald-600'}`}
                                >
                                  {admin.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                  {admin.isActive ? 'Désactiver' : 'Activer'}
                                </button>
                                <button onClick={() => openConfirm(admin, 'credentials')}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left font-medium"
                                >
                                  <Send className="w-4 h-4 text-gray-400" /> Envoyer identifiants
                                </button>
                                {sub?.status === 'pending_payment' && sub?.stripePaymentLinkUrl && (
                                  <button onClick={() => openConfirm(admin, 'resend')}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-gray-50 text-left font-medium"
                                  >
                                    <RefreshCw className="w-4 h-4" /> Renvoyer lien paiement
                                  </button>
                                )}
                                <div className="my-1 border-t border-gray-100" />
                                <button onClick={() => openConfirm(admin, 'delete')}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left font-medium"
                                >
                                  <Trash2 className="w-4 h-4" /> Supprimer
                                </button>
                              </div>
                            </>
                          )}
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
        onClose={() => setConfirm({ open: false, admin: null, action: null })}
        onConfirm={handleAction}
        loading={actionLoading}
        {...confirmConfig()}
      />
    </div>
  )
}
