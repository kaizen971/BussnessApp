import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Wallet, Repeat, Users, ShoppingCart, TrendingUp, Lock, Pencil, Trash2, UserRound, Upload,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { expensesAPI, teamPayrollAPI, usersAPI } from '../services/api'
import { Modal, ConfirmDialog, EmptyState, PageHeader, TabBar, SkeletonTable, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'
import { EXPENSE_CATEGORIES, LEGACY_EXPENSE_CATEGORIES, getExpenseCategoryLabel } from '../constants/expenseCategories'

const CATEGORY_INFO = {
  purchase: { label: 'Achat', className: 'bg-red-500/10 text-red-400 ring-red-500/20', icon: ShoppingCart, iconColor: 'text-red-400', iconBg: 'bg-red-500/10' },
  variable: { label: 'Variable', className: 'bg-gold-500/10 text-gold-400 ring-gold-500/20', icon: TrendingUp, iconColor: 'text-gold-400', iconBg: 'bg-gold-500/10' },
  fixed: { label: 'Fixe', className: 'bg-sky-500/10 text-sky-400 ring-sky-500/20', icon: Lock, iconColor: 'text-sky-400', iconBg: 'bg-sky-500/10' },
}

const getCategoryInfo = (category) => ({
  ...(CATEGORY_INFO[category] || { className: 'bg-white/5 text-gray-400 ring-white/10', icon: Wallet, iconColor: 'text-gray-400', iconBg: 'bg-white/5' }),
  label: getExpenseCategoryLabel(category),
})

const EMPTY_FORM = { amount: '', category: 'purchase', description: '', userId: '', isRecurring: false, recurringDay: '1' }

export default function ExpensesPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [expenses, setExpenses] = useState([])
  const [employees, setEmployees] = useState([])
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

  const isAdmin = ['admin', 'manager', 'responsable'].includes(user?.role)

  const loadAll = useCallback(async () => {
    try {
      const [expensesRes, recurringRes] = await Promise.all([
        expensesAPI.getAll(user?.projectId),
        expensesAPI.getRecurring(user?.projectId),
      ])
      setExpenses(expensesRes.data || [])
      setRecurringExpenses(recurringRes.data?.data || [])
      const usersRes = await usersAPI.getAll(user?.projectId)
      setEmployees(usersRes.data || [])
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
      userId: expense.userId?._id || expense.userId || '',
      isRecurring: false,
      recurringDay: '1',
    })
    setModalVisible(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    if (!formData.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Saisissez un montant positif')
      return
    }
    if (formData.category === 'salary_advances' && !formData.userId) {
      toast.error('Choisissez le salarié concerné par l’avance')
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
          amount,
          category: formData.category,
          description: formData.description,
          userId: formData.userId,
        })
        toast.success('Dépense modifiée avec succès')
      } else {
        const expenseData = {
          amount,
          category: formData.category,
          description: formData.description,
          userId: formData.userId,
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

  const thisMonth = new Date()
  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.date)
    return date.getFullYear() === thisMonth.getFullYear() && date.getMonth() === thisMonth.getMonth()
  })
  const totalExpenses = monthlyExpenses.filter(e => !['salary_advances', 'salaries'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0)
  const totalAdvances = monthlyExpenses.filter(e => e.category === 'salary_advances').reduce((sum, e) => sum + e.amount, 0)
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
        <p className="text-[13px] text-gray-400 font-medium">Total des charges du mois</p>
        <p className="text-3xl font-extrabold text-cream mt-1">{formatPrice(totalCharges)}</p>
        <div className="flex gap-5 mt-2 flex-wrap">
          <p className="text-[12.5px] text-gray-500">Dépenses : <span className="text-red-400 font-semibold">{formatPrice(totalExpenses)}</span></p>
          <p className="text-[12.5px] text-gray-500">Avances versées : <span className="text-sky-400 font-semibold">{formatPrice(totalAdvances)}</span></p>
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
                      {item.category === 'salary_advances' && <p className="text-[12px] text-sky-400 mt-0.5">{item.userId?.fullName || 'Avance non attribuée'}</p>}
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
              <EmptyState icon={Users} title="Aucun salaire ce mois" description="Configurez une rémunération dans l’équipe" />
            ) : (
              <div className="divide-y divide-night-700/60">
                {payrollData.employees.map((item) => (
                  <div key={item.user._id} className="flex items-start gap-3 p-4">
                    <span className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <UserRound className="w-5 h-5 text-amber-400" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-bold text-red-400">{formatPrice(item.remainingDue)} à verser</p>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">Salaire</span>
                      </div>
                      <p className="text-[13px] text-gray-300 mt-0.5">{item.user.fullName || item.user.username}</p>
                      <p className="text-[11.5px] text-gray-500 mt-1">Rémunération {formatPrice(item.totalDue)} · avances {formatPrice(item.advances || 0)}</p>
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
        title={formData.category === 'salary_advances' ? (editingExpense ? 'Modifier l’avance' : 'Avance sur salaire') : editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Type d’opération</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={formData.category !== 'salary_advances'} onClick={() => setFormData(p => p.category === 'salary_advances' ? { ...p, category: 'purchase', userId: '' } : p)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${formData.category !== 'salary_advances' ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-night-600 text-gray-400'}`}>Dépense</button>
              <button type="button" aria-pressed={formData.category === 'salary_advances'} onClick={() => setFormData(p => ({ ...p, category: 'salary_advances', isRecurring: false }))} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${formData.category === 'salary_advances' ? 'border-sky-400 bg-sky-400/10 text-sky-300' : 'border-night-600 text-gray-400'}`}>Avance sur salaire</button>
            </div>
          </div>
          {formData.category !== 'salary_advances' && <div>
            <label className="input-label">Catégorie</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              className="input-field"
            >
              {EXPENSE_CATEGORIES.filter(({ value }) => value !== 'salary_advances').map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              {LEGACY_EXPENSE_CATEGORIES.filter(({ value }) => value === formData.category).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>}
          {formData.category === 'salary_advances' && <div>
            <label className="input-label">Salarié concerné *</label>
            <select value={formData.userId} onChange={(e) => setFormData(p => ({ ...p, userId: e.target.value, isRecurring: false }))} className="input-field">
              <option value="">Choisir un salarié</option>
              {editingExpense?.userId?.deletedAt && <option value={editingExpense.userId._id}>{editingExpense.userId.fullName || editingExpense.userId.username} (archivé)</option>}
              {employees.filter(emp => !emp.deletedAt || emp._id === formData.userId).map(emp => <option key={emp._id} value={emp._id}>{emp.fullName || emp.username}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Déduite automatiquement du reste à verser ce mois.</p>
          </div>}
          <div>
            <label className="input-label">Montant *</label>
            <input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="input-field" />
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

          {!editingExpense && formData.category !== 'salary_advances' && (
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
