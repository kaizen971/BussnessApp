import { useState, useEffect } from 'react'
import { ShieldCheck, Plus, UserCheck, UserX, Loader2, Eye, EyeOff, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Badge, SkeletonTable, EmptyState, ConfirmDialog, Modal } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SuperAdminsPage() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, admin: null })
  const [actionLoading, setActionLoading] = useState(false)

  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const load = () => {
    setLoading(true)
    api.get('/backoffice/super-admins')
      .then(res => setAdmins(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Requis'
    if (!form.username.trim()) e.username = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format invalide'
    if (!form.password) e.password = 'Requis'
    else if (form.password.length < 6) e.password = 'Min. 6 caractères'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/backoffice/super-admins', form)
      toast.success('Super-admin créé avec succès')
      setShowCreate(false)
      setForm({ fullName: '', username: '', email: '', password: '' })
      setErrors({})
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création')
    }
    setSaving(false)
  }

  const handleToggle = async () => {
    const { admin } = confirm
    setActionLoading(true)
    try {
      await api.put(`/backoffice/super-admins/${admin._id}/status`)
      toast.success(`Super-admin ${admin.isActive ? 'désactivé' : 'activé'}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setActionLoading(false)
    setConfirm({ open: false, admin: null })
  }

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }))
  }

  const inputClass = (field) => `w-full px-4 py-2.5 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm ${errors[field] ? 'border-red-300 focus:ring-red-400/30' : 'border-gray-200 focus:ring-primary-500/30 focus:border-primary-500/50'}`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader title="Super-Administrateurs" description="Gérez les comptes super-admin du backoffice">
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Créer un super-admin
        </button>
      </PageHeader>

      <div className="card overflow-hidden animate-in stagger-1">
        {loading ? (
          <SkeletonTable rows={4} />
        ) : admins.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucun super-admin"
            description="Créez votre premier super-administrateur"
            action={() => setShowCreate(true)}
            actionLabel="Créer un super-admin"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Super-Admin</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Statut</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Dernière connexion</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Créé le</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {admins.map((sa, i) => {
                  const isMe = sa._id === user?.id
                  return (
                    <tr key={sa._id} className="hover:bg-primary-50/30 transition-colors group animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600 rounded-xl flex items-center justify-center text-sm font-bold ring-1 ring-violet-200/50 flex-shrink-0">
                            {sa.fullName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">{sa.fullName}</p>
                              {isMe && <Badge variant="purple">Vous</Badge>}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{sa.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={sa.isActive ? 'success' : 'danger'} dot>{sa.isActive ? 'Actif' : 'Inactif'}</Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-xs text-gray-500">
                        {sa.lastLogin ? formatDate(sa.lastLogin) : <span className="italic text-gray-300">Jamais</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-gray-500">
                        {formatDate(sa.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        {!isMe && (
                          <button
                            onClick={() => setConfirm({ open: true, admin: sa })}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                              sa.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {sa.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            {sa.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
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
        onClose={() => setConfirm({ open: false, admin: null })}
        onConfirm={handleToggle}
        loading={actionLoading}
        title={confirm.admin?.isActive ? 'Désactiver ce super-admin ?' : 'Réactiver ce super-admin ?'}
        message={confirm.admin?.isActive
          ? `${confirm.admin?.fullName} ne pourra plus se connecter au backoffice.`
          : `${confirm.admin?.fullName} retrouvera l'accès au backoffice.`}
        confirmText={confirm.admin?.isActive ? 'Désactiver' : 'Activer'}
        variant={confirm.admin?.isActive ? 'danger' : 'success'}
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setErrors({}) }} title="Nouveau super-admin">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nom complet</label>
            <input type="text" value={form.fullName} onChange={set('fullName')} className={inputClass('fullName')} placeholder="Jean Dupont" autoComplete="name" />
            {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Identifiant</label>
            <input type="text" value={form.username} onChange={set('username')} className={inputClass('username')} placeholder="superadmin2" autoComplete="username" />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputClass('email')} placeholder="admin@bussnessapp.com" autoComplete="email" />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`${inputClass('password')} pr-10`} placeholder="Min. 6 caractères" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowCreate(false); setErrors({}) }} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-all">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer le super-admin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
