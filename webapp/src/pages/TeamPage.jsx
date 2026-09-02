import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  UserPlus, Users, CheckCircle2, ShieldCheck, Star, UserRound, Camera,
  Lock, Unlock, Pencil, ArrowLeftRight, Clock, Banknote, Wallet,
  ChevronLeft, ChevronRight, Info,
} from 'lucide-react'
import api, { usersAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { getQuickSelectValues } from '../utils/currency'
import { Modal, ConfirmDialog, EmptyState, PageHeader, Badge, SkeletonCard, Spinner } from '../components/ui'

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const ROLE_INFO = {
  admin: { label: 'Administrateur', icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10' },
  responsable: { label: 'Responsable', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  manager: { label: 'Responsable', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  cashier: { label: 'Salarié', icon: UserRound, color: 'text-sky-400', bg: 'bg-sky-500/10' },
}

const getRoleInfo = (role) => ROLE_INFO[role] || { label: role, icon: UserRound, color: 'text-gray-400', bg: 'bg-white/5' }

const getRolePermissions = (role) => {
  switch (role) {
    case 'admin': return 'Accès complet : gestion des utilisateurs, produits, ventes, clients, et configuration'
    case 'manager': return 'Gestion des produits, ventes, clients et accès aux rapports'
    case 'cashier': return 'Ajout de ventes et consultation du catalogue'
    default: return 'Permissions non définies'
  }
}

const EMPTY_FORM = { username: '', email: '', password: '', fullName: '', role: 'cashier', photo: null }

export default function TeamPage() {
  const { user } = useAuth()
  const { format: formatPrice, currency } = useCurrency()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [selectedUser, setSelectedUser] = useState(null)
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [commissionModalVisible, setCommissionModalVisible] = useState(false)
  const [salaryModalVisible, setSalaryModalVisible] = useState(false)
  const [editInfoModalVisible, setEditInfoModalVisible] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)
  const [commissionRate, setCommissionRate] = useState('0')
  const [hourlyRate, setHourlyRate] = useState('0')
  const [editInfoData, setEditInfoData] = useState({ fullName: '', email: '', newPassword: '', confirmPassword: '' })
  const [payrollModalVisible, setPayrollModalVisible] = useState(false)
  const [payrollData, setPayrollData] = useState(null)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1)
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())

  const isManagerRole = ['admin', 'responsable', 'manager'].includes(user?.role)

  const loadUsers = useCallback(async () => {
    try {
      const response = await usersAPI.getAll(user?.projectId)
      setUsers(response.data || [])
    } catch {
      toast.error('Impossible de charger les collaborateurs')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  const loadPayroll = useCallback(async (month = payrollMonth, year = payrollYear) => {
    try {
      setPayrollLoading(true)
      const response = await api.get(`/projects/${user?.projectId}/team-payroll`, { params: { month, year } })
      setPayrollData(response.data)
    } catch (error) {
      console.error('Error loading payroll:', error)
    } finally {
      setPayrollLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.projectId, payrollMonth, payrollYear])

  useEffect(() => {
    loadUsers()
    if (isManagerRole) loadPayroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changePayrollMonth = (direction) => {
    let newMonth = payrollMonth + direction
    let newYear = payrollYear
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    setPayrollMonth(newMonth)
    setPayrollYear(newYear)
    loadPayroll(newMonth, newYear)
  }

  const getMonthLabel = () =>
    new Date(payrollYear, payrollMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.username || !formData.email || !formData.password || !formData.fullName) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSaving(true)
    try {
      await api.post('/users', { ...formData, projectId: user?.projectId })
      setModalVisible(false)
      setFormData(EMPTY_FORM)
      loadUsers()
      toast.success('Collaborateur créé avec succès')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    const target = statusTarget
    if (!target) return
    try {
      await api.put(`/users/${target._id}/status`, { isActive: !target.isActive })
      setStatusTarget(null)
      loadUsers()
      toast.success(`Compte ${target.isActive ? 'désactivé' : 'activé'}`)
    } catch {
      toast.error('Impossible de modifier le statut')
    }
  }

  const handleChangeRole = async (newRole) => {
    if (!selectedUser) return
    try {
      await api.put(`/users/${selectedUser._id}/role`, { role: newRole })
      setRoleModalVisible(false)
      setSelectedUser(null)
      loadUsers()
      toast.success('Rôle modifié avec succès')
    } catch {
      toast.error('Impossible de modifier le rôle')
    }
  }

  const handleUpdateCommission = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    const rate = parseFloat(commissionRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Le taux doit être entre 0 et 100%')
      return
    }
    try {
      await api.put(`/users/${selectedUser._id}/commission`, { commissionRate: rate })
      setCommissionModalVisible(false)
      setSelectedUser(null)
      loadUsers()
      toast.success('Taux de commission modifié avec succès')
    } catch {
      toast.error('Impossible de modifier le taux de commission')
    }
  }

  const handleUpdateHourlyRate = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    const rate = parseFloat(hourlyRate)
    if (isNaN(rate) || rate < 0) {
      toast.error('Le salaire horaire doit être un nombre positif')
      return
    }
    try {
      await api.put(`/users/${selectedUser._id}/hourly-rate`, { hourlyRate: rate })
      setSalaryModalVisible(false)
      setSelectedUser(null)
      loadUsers()
      toast.success('Salaire horaire modifié avec succès')
    } catch {
      toast.error('Impossible de modifier le salaire horaire')
    }
  }

  const handleUpdateUserInfo = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!editInfoData.fullName.trim() || !editInfoData.email.trim()) {
      toast.error("Veuillez remplir le nom et l'email")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editInfoData.email)) {
      toast.error('Veuillez entrer un email valide')
      return
    }
    if (editInfoData.newPassword) {
      if (editInfoData.newPassword.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères')
        return
      }
      if (editInfoData.newPassword !== editInfoData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas')
        return
      }
    }
    try {
      await api.put(`/users/${selectedUser._id}/info`, {
        fullName: editInfoData.fullName,
        email: editInfoData.email,
      })
      if (editInfoData.newPassword && user?.role === 'admin') {
        await api.put(`/users/${selectedUser._id}/password`, { newPassword: editInfoData.newPassword })
      }
      setEditInfoModalVisible(false)
      setSelectedUser(null)
      loadUsers()
      toast.success('Informations modifiées avec succès')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impossible de modifier les informations')
    }
  }

  const handleMemberPhotoChange = async (member, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const base64Image = await fileToBase64(file)
      await api.put(`/users/${member._id}/photo`, { photo: base64Image })
      await loadUsers()
      toast.success('Photo mise à jour avec succès')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impossible de mettre à jour la photo')
    }
  }

  const handleFormPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const base64Image = await fileToBase64(file)
      setFormData(prev => ({ ...prev, photo: base64Image }))
    } catch {
      toast.error("Impossible de traiter l'image")
    }
  }

  const quickHourly = getQuickSelectValues(currency.code)

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1300px] mx-auto">
      <PageHeader title="Gestion d'équipe" description={`${users.length} membre(s)`}>
        <button onClick={() => { setFormData(EMPTY_FORM); setModalVisible(true) }} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Nouveau collaborateur
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <div className="card p-4 text-center">
          <Users className="w-6 h-6 text-gold-500 mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-cream">{users.length}</p>
          <p className="text-[11.5px] text-gray-500">Total</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-emerald-400">{users.filter(u => u.isActive).length}</p>
          <p className="text-[11.5px] text-gray-500">Actifs</p>
        </div>
        <div className="card p-4 text-center">
          <ShieldCheck className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
          <p className="text-lg font-extrabold text-amber-400">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-[11.5px] text-gray-500">Admins</p>
        </div>
      </div>

      {/* Bandeau masse salariale */}
      {isManagerRole && (
        <button
          onClick={() => { loadPayroll(); setPayrollModalVisible(true) }}
          className="card-hover w-full p-4 flex items-center gap-3 text-left"
        >
          <span className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-gold-500" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-cream">Masse salariale du mois</span>
            <span className="block text-[12px] text-gray-500 capitalize">{getMonthLabel()}</span>
          </span>
          {payrollData ? (
            <span className="text-lg font-extrabold text-gold-400 flex-shrink-0">{formatPrice(payrollData.totals?.totalPayroll || 0)}</span>
          ) : (
            <Spinner className="w-5 h-5" />
          )}
          <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
        </button>
      )}

      {/* Liste des membres */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="Aucun collaborateur" description="Ajoutez un membre à votre équipe" action={() => setModalVisible(true)} actionLabel="Nouveau collaborateur" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {users.map((item) => {
            const roleInfo = getRoleInfo(item.role)
            const RoleIcon = roleInfo.icon
            const canEditPhoto = user?.role === 'admin'
            return (
              <div key={item._id} className="card p-4 animate-in">
                <div className="flex items-start gap-3">
                  <label className={`relative flex-shrink-0 ${canEditPhoto ? 'cursor-pointer group' : ''}`}>
                    {canEditPhoto && <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMemberPhotoChange(item, e)} />}
                    {item.photo ? (
                      <img src={item.photo} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                    ) : (
                      <span className={`w-14 h-14 rounded-2xl ${roleInfo.bg} flex items-center justify-center`}>
                        <RoleIcon className={`w-7 h-7 ${roleInfo.color}`} />
                      </span>
                    )}
                    {canEditPhoto && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-3 h-3 text-night-950" />
                      </span>
                    )}
                  </label>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-cream truncate">{item.fullName}</p>
                    <p className="text-[12px] text-gray-500">@{item.username}</p>
                    <p className="text-[12px] text-gray-500 truncate">{item.email}</p>
                  </div>
                  <Badge variant={item.isActive ? 'success' : 'danger'} dot>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </span>
                  <p className="text-[11.5px] text-gray-500 mt-1.5 leading-relaxed">{getRolePermissions(item.role)}</p>
                </div>

                {/* Rémunération */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-night-700/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase">Salaire</p>
                      <p className="text-[12.5px] font-bold text-cream truncate">{formatPrice(item.hourlyRate || 0)}/h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase">Commission</p>
                      <p className="text-[12.5px] font-bold text-cream">{item.commissionRate || 0}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase">Total comm.</p>
                      <p className="text-[12.5px] font-bold text-gold-400 truncate">{formatPrice(item.totalCommissions || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-night-700/60 flex-wrap">
                  {user?.role === 'admin' && item._id !== user.id && item.role !== 'admin' && (
                    <button onClick={() => setStatusTarget(item)} className={`btn-ghost !py-1.5 !px-2.5 ${item.isActive ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      {item.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                  {(user?.role === 'admin' || user?.role === 'responsable') && item._id !== user.id && (
                    <button onClick={() => { setSelectedUser(item); setEditInfoData({ fullName: item.fullName || '', email: item.email || '', newPassword: '', confirmPassword: '' }); setEditInfoModalVisible(true) }} className="btn-ghost !py-1.5 !px-2.5 text-gold-500">
                      <Pencil className="w-4 h-4" />
                      Infos
                    </button>
                  )}
                  {item.role !== 'admin' && user?.role === 'admin' && (
                    <button onClick={() => { setSelectedUser(item); setRoleModalVisible(true) }} className="btn-ghost !py-1.5 !px-2.5 text-gold-400">
                      <ArrowLeftRight className="w-4 h-4" />
                      Rôle
                    </button>
                  )}
                  {isManagerRole && (
                    <>
                      <button onClick={() => { setSelectedUser(item); setHourlyRate(item.hourlyRate?.toString() || '0'); setSalaryModalVisible(true) }} className="btn-ghost !py-1.5 !px-2.5 text-sky-400">
                        <Clock className="w-4 h-4" />
                        Salaire
                      </button>
                      <button onClick={() => { setSelectedUser(item); setCommissionRate(item.commissionRate?.toString() || '0'); setCommissionModalVisible(true) }} className="btn-ghost !py-1.5 !px-2.5 text-emerald-400">
                        <Banknote className="w-4 h-4" />
                        Commission
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 mt-2">Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création */}
      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title="Nouveau collaborateur" size="sm">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {user?.role === 'admin' && (
            <label className="block cursor-pointer w-fit mx-auto">
              <input type="file" accept="image/*" className="hidden" onChange={handleFormPhotoChange} />
              {formData.photo ? (
                <img src={formData.photo} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto" />
              ) : (
                <span className="flex flex-col items-center justify-center gap-1 w-20 h-20 rounded-2xl border-2 border-dashed border-night-500 hover:border-gold-500/60 transition-colors">
                  <Camera className="w-5 h-5 text-gold-500" />
                  <span className="text-[10px] text-gray-500">Photo</span>
                </span>
              )}
            </label>
          )}
          <input type="text" value={formData.fullName} onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="Nom complet *" className="input-field" />
          <input type="text" value={formData.username} onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))} placeholder="Nom d'utilisateur *" autoCapitalize="none" className="input-field" />
          <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email *" className="input-field" />
          <input type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Mot de passe *" autoComplete="new-password" className="input-field" />
          <div>
            <label className="input-label">Rôle *</label>
            <select value={formData.role} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))} className="input-field">
              <option value="cashier">Salarié</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <p className="flex items-start gap-2 p-3 rounded-xl bg-gold-500/[0.06] border border-gold-500/20 text-[12px] text-gray-300 leading-relaxed">
            <Info className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
            {getRolePermissions(formData.role)}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal rôle */}
      <Modal open={roleModalVisible} onClose={() => setRoleModalVisible(false)} title="Changer le rôle" size="sm">
        <div className="p-5 space-y-2">
          {selectedUser && (
            <p className="text-[13px] text-gray-400 mb-3">Nouveau rôle pour <span className="font-bold text-cream">{selectedUser.fullName}</span> :</p>
          )}
          {[['cashier', 'Salarié'], ['manager', 'Manager']].map(([role, label]) => {
            const info = getRoleInfo(role)
            const RIcon = info.icon
            return (
              <button
                key={role}
                onClick={() => handleChangeRole(role)}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl border transition-all ${
                  selectedUser?.role === role ? 'border-gold-500 bg-gold-500/10' : 'border-night-600 bg-night-900 hover:border-night-500'
                }`}
              >
                <span className={`w-9 h-9 rounded-lg ${info.bg} flex items-center justify-center`}>
                  <RIcon className={`w-5 h-5 ${info.color}`} />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-cream">{label}</span>
                  <span className="block text-[11px] text-gray-500">{getRolePermissions(role)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Modal commission */}
      <Modal open={commissionModalVisible} onClose={() => setCommissionModalVisible(false)} title="Taux de commission" size="sm">
        <form onSubmit={handleUpdateCommission} className="p-6 space-y-4">
          {selectedUser && <p className="text-[13px] text-gray-400">Commission de <span className="font-bold text-cream">{selectedUser.fullName}</span> sur chaque vente :</p>}
          <div className="relative">
            <input type="number" step="0.1" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="input-field pr-9 text-lg font-bold" autoFocus />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 2, 5, 10, 15].map(v => (
              <button key={v} type="button" onClick={() => setCommissionRate(v.toString())} className="px-3 py-1.5 rounded-full bg-night-700 hover:bg-gold-500/15 hover:text-gold-400 text-[12.5px] text-gray-300 transition-colors">
                {v}%
              </button>
            ))}
          </div>
          <button type="submit" className="btn-primary w-full !py-3">Enregistrer</button>
        </form>
      </Modal>

      {/* Modal salaire horaire */}
      <Modal open={salaryModalVisible} onClose={() => setSalaryModalVisible(false)} title="Salaire horaire" size="sm">
        <form onSubmit={handleUpdateHourlyRate} className="p-6 space-y-4">
          {selectedUser && <p className="text-[13px] text-gray-400">Salaire horaire de <span className="font-bold text-cream">{selectedUser.fullName}</span> :</p>}
          <div className="relative">
            <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="input-field pr-14 text-lg font-bold" autoFocus />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">{currency.symbol}/h</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickHourly.map(v => (
              <button key={v} type="button" onClick={() => setHourlyRate(v.toString())} className="px-3 py-1.5 rounded-full bg-night-700 hover:bg-gold-500/15 hover:text-gold-400 text-[12.5px] text-gray-300 transition-colors">
                {formatPrice(v)}
              </button>
            ))}
          </div>
          <button type="submit" className="btn-primary w-full !py-3">Enregistrer</button>
        </form>
      </Modal>

      {/* Modal édition infos */}
      <Modal open={editInfoModalVisible} onClose={() => setEditInfoModalVisible(false)} title="Modifier les informations" size="sm">
        <form onSubmit={handleUpdateUserInfo} className="p-6 space-y-4">
          <div>
            <label className="input-label">Nom complet *</label>
            <input type="text" value={editInfoData.fullName} onChange={(e) => setEditInfoData(p => ({ ...p, fullName: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="input-label">Email *</label>
            <input type="email" value={editInfoData.email} onChange={(e) => setEditInfoData(p => ({ ...p, email: e.target.value }))} className="input-field" />
          </div>
          {user?.role === 'admin' && (
            <div className="rounded-xl bg-night-900 border border-night-700 p-4 space-y-3">
              <p className="text-[12px] font-semibold text-gray-400">Réinitialiser le mot de passe (optionnel)</p>
              <input type="password" value={editInfoData.newPassword} onChange={(e) => setEditInfoData(p => ({ ...p, newPassword: e.target.value }))} placeholder="Nouveau mot de passe" autoComplete="new-password" className="input-field" />
              <input type="password" value={editInfoData.confirmPassword} onChange={(e) => setEditInfoData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirmer le mot de passe" autoComplete="new-password" className="input-field" />
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditInfoModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">Enregistrer</button>
          </div>
        </form>
      </Modal>

      {/* Modal masse salariale */}
      <Modal open={payrollModalVisible} onClose={() => setPayrollModalVisible(false)} title="Masse salariale" size="lg">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changePayrollMonth(-1)} className="btn-ghost !p-2"><ChevronLeft className="w-5 h-5" /></button>
            <p className="text-sm font-bold text-cream capitalize">{getMonthLabel()}</p>
            <button onClick={() => changePayrollMonth(1)} className="btn-ghost !p-2"><ChevronRight className="w-5 h-5" /></button>
          </div>

          {payrollLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !payrollData?.employees?.length ? (
            <EmptyState icon={Wallet} title="Aucun salaire ce mois" description="Les salaires sont calculés à partir du planning complété" />
          ) : (
            <>
              <div className="card !bg-night-900 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase">Total</p>
                  <p className="text-[15px] font-extrabold text-gold-400">{formatPrice(payrollData.totals?.totalPayroll || 0)}</p>
                </div>
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase">Salaires</p>
                  <p className="text-[15px] font-bold text-cream">{formatPrice(payrollData.totals?.totalSalary || 0)}</p>
                </div>
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase">Commissions</p>
                  <p className="text-[15px] font-bold text-cream">{formatPrice(payrollData.totals?.totalCommissions || 0)}</p>
                </div>
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase">Heures</p>
                  <p className="text-[15px] font-bold text-cream">{payrollData.totals?.totalHours?.toFixed(1) || 0}h</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {payrollData.employees.map((emp) => (
                  <div key={emp.user._id} className="flex items-center gap-3 p-3 rounded-xl bg-night-900 border border-night-700">
                    <span className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <UserRound className="w-5 h-5 text-amber-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-cream truncate">{emp.user.fullName || emp.user.username}</p>
                      <p className="text-[11.5px] text-gray-500">
                        {emp.daysWorked}j • {emp.hours.toFixed(1)}h
                        {emp.commissions > 0 && ` · +${formatPrice(emp.commissions)} comm.`}
                      </p>
                    </div>
                    <p className="text-[14px] font-bold text-gold-400 flex-shrink-0">{formatPrice(emp.totalDue)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        title={statusTarget?.isActive ? 'Désactiver le compte' : 'Activer le compte'}
        message={`Voulez-vous ${statusTarget?.isActive ? 'désactiver' : 'activer'} le compte de ${statusTarget?.fullName} ?`}
        confirmText="Confirmer"
        variant={statusTarget?.isActive ? 'danger' : 'success'}
      />
    </div>
  )
}
