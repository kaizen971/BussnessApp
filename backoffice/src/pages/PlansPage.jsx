import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Package, FolderOpen, Clock, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, EmptyState, ConfirmDialog, Modal, Badge } from '../components/ui'
import api from '../services/api'

const DURATION_TYPES = [
  { value: 'days', label: 'Jour(s)' },
  { value: 'months', label: 'Mois' },
  { value: 'years', label: 'Année(s)' },
  { value: 'lifetime', label: 'À vie' },
]

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' }

const emptyForm = {
  name: '', description: '', price: '', duration: 1, durationType: 'months',
  maxProjects: 1, features: '', isRecurring: true, sortOrder: 0
}

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, plan: null, action: null })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/backoffice/plans')
      .then(res => setPlans(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditing(plan._id)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      duration: plan.duration,
      durationType: plan.durationType,
      maxProjects: plan.maxProjects,
      features: (plan.features || []).join('\n'),
      isRecurring: plan.isRecurring,
      sortOrder: plan.sortOrder || 0
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const data = {
      ...form,
      price: parseFloat(form.price),
      duration: parseInt(form.duration),
      maxProjects: parseInt(form.maxProjects),
      sortOrder: parseInt(form.sortOrder),
      features: form.features ? form.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
      isRecurring: form.durationType === 'lifetime' ? false : form.isRecurring
    }

    try {
      if (editing) {
        await api.put(`/backoffice/plans/${editing}`, data)
        toast.success('Plan mis à jour')
      } else {
        await api.post('/backoffice/plans', data)
        toast.success('Plan créé')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setSaving(false)
  }

  const handleConfirm = async () => {
    const { plan, action } = confirm
    setConfirmLoading(true)
    try {
      if (action === 'toggle') {
        await api.put(`/backoffice/plans/${plan._id}`, { isActive: !plan.isActive })
        toast.success(`Plan ${plan.isActive ? 'désactivé' : 'activé'}`)
      } else if (action === 'delete') {
        await api.delete(`/backoffice/plans/${plan._id}`)
        toast.success('Plan supprimé')
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
    setConfirmLoading(false)
    setConfirm({ open: false, plan: null, action: null })
  }

  const confirmConfig = () => {
    const { plan, action } = confirm
    if (!plan) return {}
    if (action === 'delete') return {
      title: 'Supprimer ce plan ?',
      message: `Le plan "${plan.name}" sera supprimé définitivement. Les abonnements existants ne seront pas affectés.`,
      confirmText: 'Supprimer',
      variant: 'danger'
    }
    if (action === 'toggle' && plan.isActive) return {
      title: 'Désactiver ce plan ?',
      message: `Le plan "${plan.name}" ne sera plus disponible pour les nouveaux admins.`,
      confirmText: 'Désactiver',
      variant: 'warning'
    }
    return {
      title: 'Activer ce plan ?',
      message: `Le plan "${plan.name}" sera de nouveau disponible.`,
      confirmText: 'Activer',
      variant: 'success'
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader title="Plans d'abonnement" description="Configurez les plans, tarifs, durées et limites">
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Créer un plan
        </button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex justify-between"><div className="skeleton h-5 w-28" /><div className="skeleton h-8 w-16" /></div>
              <div className="space-y-2"><div className="skeleton h-4 w-40" /><div className="skeleton h-4 w-32" /></div>
              <div className="skeleton h-px w-full" />
              <div className="flex gap-2"><div className="skeleton h-8 w-24" /><div className="skeleton h-8 w-20" /><div className="skeleton h-8 w-8 ml-auto" /></div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Aucun plan créé"
            description="Créez votre premier plan d'abonnement pour commencer à gérer vos admins"
            action={openCreate}
            actionLabel="Créer un plan"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <div key={plan._id} className={`card overflow-hidden transition-all duration-200 hover:shadow-md animate-in ${!plan.isActive ? 'opacity-60 hover:opacity-80' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                      <Badge variant={plan.isActive ? 'success' : 'neutral'}>
                        {plan.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {plan.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{plan.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-2xl font-bold text-primary-600 tracking-tight">{plan.price}<span className="text-sm font-normal text-gray-400 ml-0.5">&euro;</span></p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-blue-100">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-gray-700 font-medium">
                        {plan.durationType === 'lifetime' ? 'À vie' : `${plan.duration} ${DURATION_LABELS[plan.durationType]}`}
                      </span>
                      {plan.isRecurring && plan.durationType !== 'lifetime' && (
                        <Badge variant="info" className="ml-2 text-[9px] py-0">récurrent</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-violet-100">
                      <FolderOpen className="w-4 h-4 text-violet-500" />
                    </div>
                    <span className="text-gray-700"><strong className="font-semibold">{plan.maxProjects}</strong> business max</span>
                  </div>
                </div>

                {plan.features?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    <div className="space-y-2">
                      {plan.features.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-gray-500">
                          <div className="w-4 h-4 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                          </div>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                <button
                  onClick={() => setConfirm({ open: true, plan, action: 'toggle' })}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${plan.isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                >
                  {plan.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {plan.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => openEdit(plan)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button
                  onClick={() => setConfirm({ open: true, plan, action: 'delete' })}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 rounded-lg hover:bg-red-50 transition-all ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier le plan' : 'Créer un plan'}>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="input-label">Nom du plan *</label>
            <input type="text" required value={form.name} onChange={set('name')} className="input-field" placeholder="Ex: Starter, Pro, Enterprise..." />
          </div>

          <div>
            <label className="input-label">Description</label>
            <input type="text" value={form.description} onChange={set('description')} className="input-field" placeholder="Courte description du plan..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Prix (&euro;) *</label>
              <input type="number" step="0.01" min="0" required value={form.price} onChange={set('price')} className="input-field" placeholder="19.99" />
            </div>
            <div>
              <label className="input-label">Nb business max *</label>
              <input type="number" min="1" required value={form.maxProjects} onChange={set('maxProjects')} className="input-field" placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Durée *</label>
              <input type="number" min="1" required value={form.durationType === 'lifetime' ? 1 : form.duration}
                onChange={set('duration')}
                disabled={form.durationType === 'lifetime'}
                className="input-field disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="1"
              />
            </div>
            <div>
              <label className="input-label">Type de durée *</label>
              <select value={form.durationType} onChange={(e) => setForm(f => ({ ...f, durationType: e.target.value, isRecurring: e.target.value === 'lifetime' ? false : f.isRecurring }))}
                className="input-field bg-white"
              >
                {DURATION_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.durationType !== 'lifetime' && (
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">Paiement récurrent</span>
                <p className="text-xs text-gray-400">Renouvellement automatique à chaque période</p>
              </div>
            </label>
          )}

          <div>
            <label className="input-label">Fonctionnalités incluses</label>
            <textarea value={form.features} onChange={set('features')} rows={3} className="input-field resize-none"
              placeholder={"Gestion des ventes\nGestion du stock\nExport PDF/Excel"}
            />
            <p className="text-[11px] text-gray-400 mt-1">Une fonctionnalité par ligne</p>
          </div>

          <div>
            <label className="input-label">Ordre d'affichage</label>
            <input type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} className="input-field" />
          </div>

          <div className="flex items-center gap-3 justify-end pt-3 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Enregistrer' : 'Créer le plan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, plan: null, action: null })}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        {...confirmConfig()}
      />
    </div>
  )
}
