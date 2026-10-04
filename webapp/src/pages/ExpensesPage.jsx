import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Wallet, Repeat, Users, ShoppingCart, TrendingUp, Lock, Pencil, Trash2, UserRound, Upload,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { expensesAPI, teamPayrollAPI } from '../services/api'
import { Modal, ConfirmDialog, EmptyState, PageHeader, TabBar, SkeletonTable, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'

const CATEGORY_INFO = {
  purchase: { label: 'Achat', className: 'bg-red-500/10 text-red-400 ring-red-500/20', icon: ShoppingCart, iconColor: 'text-red-400', iconBg: 'bg-red-500/10' },
  variable: { label: 'Variable', className: 'bg-gold-500/10 text-gold-400 ring-gold-500/20', icon: TrendingUp, iconColor: 'text-gold-400', iconBg: 'bg-gold-500/10' },
  fixed: { label: 'Fixe', className: 'bg-sky-500/10 text-sky-400 ring-sky-500/20', icon: Lock, iconColor: 'text-sky-400', iconBg: 'bg-sky-500/10' },
}

const getCategoryInfo = (category) => CATEGORY_INFO[category] || { label: 'Autre', className: 'bg-white/5 text-gray-400 ring-white/10', icon: Wallet, iconColor: 'text-gray-400', iconBg: 'bg-white/5' }

const EMPTY_FORM = { amount: '', category: 'variable', description: '', isRecurring: false, recurringDay: '1' }

export default function ExpensesPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [expenses, setExpenses] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [payrollData, setPayrollData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [editingExpense, setEditingExpense] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { type: 'expense' | 'recurring', item }
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [importOpen, setImportOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const loadAll = useCallback(async () => {
    try {
      const [expensesRes, recurringRes] = await Promise.all([
        expensesAPI.getAll(user?.projectId),
        expensesAPI.getRecurring(user?.projectId),
      ])
      setExpenses(expensesRes.data || [])
      setRecurringExpenses(recurringRes.data?.data || [])
      if (isAdmin) {
        const now = new Date()
        try {
          const payrollRes = await teamPayrollAPI.getPayroll(user?.projectId, now.getMonth() + 1, now.getFullYear())
          setPayrollData(payrollRes.data)
        } catch (err) {
          console.error('Error loading payroll:', err)
        }
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
      toast.error('Impossible de charger les dépenses')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId, isAdmin])

  useEffect(() => { loadAll() }, [loadAll])

  const openCreate = () => {
    setEditingExpense(null)
    setFormData(EMPTY_FORM)
    setModalVisible(true)
  }

  const openEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      isRecurring: false,
      recurringDay: '1',
    })
    setModalVisible(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount) {
      toast.error('Veuillez saisir un montant')
      return
    }
    if (!editingExpense && formData.isRecurring) {
      const day = parseInt(formData.recurringDay)
      if (!day || day < 1 || day > 28) {
        toast.error('Veuillez saisir un jour valide (1-28)')
        return
      }
    }
    setSaving(true)
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense._id, {
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
        })
        toast.success('Dépense modifiée avec succès')
      } else {
        const expenseData = {
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          projectId: user?.projectId,
          isRecurring: formData.isRecurring,
        }
        if (formData.isRecurring) expenseData.recurringDay = parseInt(formData.recurringDay)
        await expensesAPI.create(expenseData)
        toast.success(formData.isRecurring ? 'Dépense récurrente ajoutée avec succès' : 'Dépense ajoutée avec succès')
      }
      setModalVisible(false)
      setEditingExpense(null)
      setFormData(EMPTY_FORM)
      loadAll()
    } catch {
      toast.error("Impossible d'enregistrer la dépense")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'recurring') {
        await expensesAPI.deleteRecurring(deleteTarget.item._id)
        toast.success('Dépense récurrente supprimée')
      } else {
        await expensesAPI.delete(deleteTarget.item._id)
        toast.success('Dépense supprimée')
      }
      setDeleteTarget(null)
      loadAll()
    } catch {
      toast.error('Impossible de supprimer la dépense')
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalRecurring = recurringExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalPayroll = payrollData?.totals?.totalPayroll || 0
  const totalCharges = totalExpenses + totalPayroll

  const tabs = [
    { key: 'all', label: 'Dépenses' },
    { key: 'recurring', label: '🔁 Récurrentes' },
    ...(isAdmin ? [{ key: 'payroll', label: '👥 Salaires' }] : []),
  ]

  if (loading) {
    return <div className="p-4 sm:p-6"><div className="card"><SkeletonTable rows={6} /></div></div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto">
      <PageHeader title="Dépenses" description="Suivez vos charges et dépenses récurrentes">
        {isAdmin && (
          <button onClick={() => setImportOpen(true)} className="btn-secondary">
            <Upload className="w-4 h-4" />
            Importer CSV
          </button>
        )}
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouvelle dépense
        </button>
      </PageHeader>

      {/* Total des charges */}
      <div className="card p-5 border-l-4 !border-l-red-500/70">
        <p className="text-[13px] text-gray-400 font-medium">Total des charges</p>
        <p className="text-3xl font-extrabold text-cream mt-1">{formatPrice(totalCharges)}</p>
        <div className="flex gap-5 mt-2 flex-wrap">
          <p className="text-[12.5px] text-gray-500">Dépenses : <span className="text-red-400 font-semibold">{formatPrice(totalExpenses)}</span></p>
          {isAdmin && (
            <p className="text-[12.5px] text-gray-500">Masse salariale : <span className="text-amber-400 font-semibold">{formatPrice(totalPayroll)}</span></p>
          )}
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} className="max-w-md" />

      {activeTab === 'all' && (
        <div className="card overflow-hidden">
          {expenses.length === 0 ? (
            <EmptyState icon={Wallet} title="Aucune dépense enregistrée" description="Ajoutez vos premières dépenses" action={openCreate} actionLabel="Nouvelle dépense" />
          ) : (
            <div className="divide-y divide-night-700/60">
              {expenses.map((item) => {
                const cat = getCategoryInfo(item.category)
                const CatIcon = cat.icon
                return (
                  <div key={item._id} className="flex items-start gap-3 p-4">
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.iconBg}`}>
                      <CatIcon className={`w-5 h-5 ${cat.iconColor}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-bold text-red-400">-{formatPrice(item.amount)}</p>
                        {item.parentExpenseId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400" title="Générée automatiquement">
                            <Repeat className="w-3 h-3" />
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cat.className}`}>{cat.label}</span>
                      </div>
                      {item.description && <p className="text-[13px] text-gray-400 mt-0.5">{item.description}</p>}
                      <p className="text-[11.5px] text-gray-600 mt-1">
                        {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(item)} className="btn-ghost !p-2" title="Modifier">
                        <Pencil className="w-4 h-4 text-gold-500" />
                      </button>
                      <button onClick={() => setDeleteTarget({ type: 'expense', item })} className="btn-ghost !p-2" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {recurringExpenses.length > 0 && (
            <div className="card p-5 border-l-4 !border-l-amber-500/70">
              <p className="text-[13px] text-gray-400 font-medium">Total mensuel récurrent</p>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">{formatPrice(totalRecurring)}</p>
              <p className="text-[12px] text-gray-500 mt-1">{recurringExpenses.length} dépense(s) récurrente(s)</p>
            </div>
          )}
          <div className="card overflow-hidden">
            {recurringExpenses.length === 0 ? (
              <EmptyState icon={Repeat} title="Aucune dépense récurrente" description="Les dépenses récurrentes sont générées automatiquement chaque mois" />
            ) : (
              <div className="divide-y divide-night-700/60">
                {recurringExpenses.map((item) => {
                  const cat = getCategoryInfo(item.category)
                  return (
                    <div key={item._id} className="flex items-start gap-3 p-4">
                      <span className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Repeat className="w-5 h-5 text-amber-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-bold text-red-400">-{formatPrice(item.amount)}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cat.className}`}>{cat.label}</span>
                        </div>
                        {item.description && <p className="text-[13px] text-gray-400 mt-0.5">{item.description}</p>}
                        <p className="text-[11.5px] text-gray-600 mt-1">Tous les {item.recurringDay} du mois</p>
                      </div>
                      <button onClick={() => setDeleteTarget({ type: 'recurring', item })} className="btn-ghost !p-2 flex-shrink-0" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && isAdmin && (
        <div className="space-y-4">
          {payrollData && (
            <div className="card p-5 border-l-4 !border-l-amber-500/70">
              <p className="text-[13px] text-gray-400 font-medium">Masse salariale — {payrollData.period?.label}</p>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">{formatPrice(payrollData.totals?.totalPayroll || 0)}</p>
              <div className="flex gap-5 mt-2 flex-wrap text-[12px] text-gray-500">
                <span>Salaires : {formatPrice(payrollData.totals?.totalSalary || 0)}</span>
                <span>Commissions : {formatPrice(payrollData.totals?.totalCommissions || 0)}</span>
                <span>{payrollData.totals?.totalHours?.toFixed(1) || 0}h totales</span>
              </div>
            </div>
          )}
          <div className="card overflow-hidden">
            {!payrollData?.employees?.length ? (
              <EmptyState icon={Users} title="Aucun salaire ce mois" description="Les salaires sont calculés à partir du planning complété" />
            ) : (
              <div className="divide-y divide-night-700/60">
                {payrollData.employees.map((item) => (
                  <div key={item.user._id} className="flex items-start gap-3 p-4">
                    <span className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <UserRound className="w-5 h-5 text-amber-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-bold text-red-400">-{formatPrice(item.totalDue)}</p>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">Salaire</span>
                      </div>
                      <p className="text-[13px] text-gray-300 mt-0.5">{item.user.fullName || item.user.username}</p>
                      <p className="text-[11.5px] text-gray-600 mt-1">
                        {item.daysWorked}j travaillés • {item.hours.toFixed(1)}h
                        {item.commissions > 0 && <span className="text-gold-500"> · +{formatPrice(item.commissions)} commissions</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal ajout/édition */}
      <Modal
        open={modalVisible}
        onClose={() => { setModalVisible(false); setEditingExpense(null); setFormData(EMPTY_FORM) }}
        title={editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Montant *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.00"
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Catégorie</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_INFO).map(([key, cat]) => {
                const CatIcon = cat.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, category: key }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      formData.category === key ? 'border-gold-500 bg-gold-500/10' : 'border-night-600 bg-night-900 hover:border-night-500'
                    }`}
                  >
                    <CatIcon className={`w-5 h-5 ${cat.iconColor}`} />
                    <span className="text-[12px] font-medium text-gray-300">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Description de la dépense"
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {!editingExpense && (
            <div className="rounded-xl bg-night-900 border border-night-700 p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-gray-300">
                  <Repeat className="w-4 h-4 text-amber-400" />
                  Dépense récurrente mensuelle
                </span>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, isRecurring: !p.isRecurring }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formData.isRecurring ? 'bg-gold-500' : 'bg-night-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${formData.isRecurring ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </label>
              {formData.isRecurring && (
                <div>
                  <label className="input-label">Jour du mois (1-28)</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.recurringDay}
                    onChange={(e) => setFormData(p => ({ ...p, recurringDay: e.target.value }))}
                    className="input-field"
                  />
                  <p className="text-[11.5px] text-gray-500 mt-1.5">La dépense sera générée automatiquement chaque mois à cette date.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setModalVisible(false); setEditingExpense(null); setFormData(EMPTY_FORM) }} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : editingExpense ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={deleteTarget?.type === 'recurring'
          ? 'Voulez-vous vraiment supprimer cette dépense récurrente ? Elle ne sera plus générée automatiquement.'
          : 'Voulez-vous vraiment supprimer cette dépense ?'}
        confirmText="Supprimer"
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="expenses"
        onImported={loadAll}
      />
    </div>
  )
}
