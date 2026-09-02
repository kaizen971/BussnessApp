import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, Banknote, Trash2,
  CheckCircle2, XCircle, Ban, UserRound, Wallet, Repeat, StickyNote,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { Modal, ConfirmDialog, PageHeader, Spinner } from '../components/ui'

const DAYS_OF_WEEK = [
  { label: 'Lundi', value: 1, short: 'Lun' },
  { label: 'Mardi', value: 2, short: 'Mar' },
  { label: 'Mercredi', value: 3, short: 'Mer' },
  { label: 'Jeudi', value: 4, short: 'Jeu' },
  { label: 'Vendredi', value: 5, short: 'Ven' },
  { label: 'Samedi', value: 6, short: 'Sam' },
  { label: 'Dimanche', value: 0, short: 'Dim' },
]

const STATUS_INFO = {
  scheduled: { label: 'Planifié', icon: CalendarDays, chip: 'bg-sky-500/10 text-sky-400 ring-sky-500/20', border: 'border-l-sky-400' },
  completed: { label: 'Terminé', icon: CheckCircle2, chip: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', border: 'border-l-emerald-400' },
  absent: { label: 'Absent', icon: XCircle, chip: 'bg-red-500/10 text-red-400 ring-red-500/20', border: 'border-l-red-400' },
  cancelled: { label: 'Annulé', icon: Ban, chip: 'bg-white/5 text-gray-400 ring-white/10', border: 'border-l-gray-500' },
}

const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lundi
  return new Date(d.setDate(diff))
}

const toInputDate = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const EMPTY_FORM = {
  userId: '', date: toInputDate(new Date()), startTime: '09:00', endTime: '17:00',
  notes: '', status: 'scheduled', isRecurring: false, recurringDays: [], endDate: '',
}

export default function PlanningPage() {
  const { user, selectedProjectId } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [schedules, setSchedules] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [editScheduleModal, setEditScheduleModal] = useState(false)
  const [editScheduleData, setEditScheduleData] = useState({ startTime: '', endTime: '', notes: '' })
  const [editSalaryModal, setEditSalaryModal] = useState(false)
  const [editDailySalary, setEditDailySalary] = useState('')
  const [salaryStats, setSalaryStats] = useState(null)
  const [salaryModalVisible, setSalaryModalVisible] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager'
  const isCashier = user?.role === 'cashier'

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedWeek)
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start)
      day.setDate(day.getDate() + i)
      return day
    })
  }, [selectedWeek])

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true)
      const weekStart = weekDays[0]
      const weekEnd = weekDays[6]
      const params = {
        projectId: selectedProjectId || user?.projectId,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      }
      if (isCashier) params.userId = user.id
      const response = await api.get('/schedules', { params })
      setSchedules(response.data.data || [])
    } catch (error) {
      console.error('Erreur chargement planning:', error)
      toast.error('Impossible de charger les plannings')
    } finally {
      setLoading(false)
    }
  }, [weekDays, selectedProjectId, user, isCashier])

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/users', { params: { projectId: selectedProjectId || user?.projectId } })
      setUsers(response.data || [])
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
    }
  }, [selectedProjectId, user?.projectId])

  useEffect(() => {
    const t = setTimeout(() => {
      loadSchedules()
      if (isAdmin) loadUsers()
    }, 200)
    return () => clearTimeout(t)
  }, [loadSchedules, loadUsers, isAdmin])

  const schedulesByDay = useMemo(() => {
    const map = {}
    for (const schedule of schedules) {
      const key = new Date(schedule.date).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(schedule)
    }
    return map
  }, [schedules])

  const totalCompletedHours = useMemo(
    () => schedules.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.duration || 0), 0),
    [schedules]
  )

  const changeWeek = (direction) => {
    setSelectedWeek(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + direction * 7)
      return newDate
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.userId) {
      toast.error('Veuillez sélectionner un employé')
      return
    }
    if (formData.isRecurring && formData.recurringDays.length === 0) {
      toast.error('Veuillez sélectionner au moins un jour pour la récurrence')
      return
    }
    setSaving(true)
    try {
      const dataToSend = {
        ...formData,
        date: formData.date,
        endDate: formData.endDate || null,
        projectId: selectedProjectId || user?.projectId,
      }
      const response = await api.post('/schedules', dataToSend)
      toast.success(response.data.count ? response.data.message : 'Planning créé')
      setModalVisible(false)
      setFormData(EMPTY_FORM)
      loadSchedules()
    } catch (error) {
      console.error('Erreur sauvegarde planning:', error)
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/schedules/${deleteTarget}`)
      setDeleteTarget(null)
      loadSchedules()
      toast.success('Planning supprimé')
    } catch {
      toast.error('Impossible de supprimer le planning')
    }
  }

  const handleUpdateSchedule = async (e) => {
    e.preventDefault()
    if (!selectedSchedule) return
    try {
      await api.put(`/schedules/${selectedSchedule._id}`, editScheduleData)
      toast.success('Horaires modifiés avec succès')
      setEditScheduleModal(false)
      setSelectedSchedule(null)
      loadSchedules()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impossible de modifier les horaires')
    }
  }

  const handleUpdateDailySalary = async (e) => {
    e.preventDefault()
    if (!selectedSchedule) return
    try {
      const dailySalaryValue = editDailySalary.trim() === '' ? null : parseFloat(editDailySalary)
      await api.put(`/schedules/${selectedSchedule._id}`, { dailySalary: dailySalaryValue })
      toast.success(dailySalaryValue !== null
        ? `Salaire journalier modifié à ${formatPrice(dailySalaryValue)}`
        : 'Salaire remis au calcul par défaut (taux horaire)')
      setEditSalaryModal(false)
      setSelectedSchedule(null)
      setEditDailySalary('')
      loadSchedules()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impossible de modifier le salaire')
    }
  }

  const handleUpdateStatus = async (scheduleId, newStatus) => {
    try {
      await api.put(`/schedules/${scheduleId}`, { status: newStatus })
      toast.success(`Planning marqué comme ${STATUS_INFO[newStatus]?.label.toLowerCase()}`)
      loadSchedules()
    } catch {
      toast.error('Impossible de modifier le statut')
    }
  }

  const loadSalaryStats = async () => {
    try {
      const now = new Date()
      const response = await api.get(`/users/${user._id || user.id}/salary-stats`, {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      })
      setSalaryStats(response.data)
      setSalaryModalVisible(true)
    } catch (error) {
      console.error('Erreur chargement salaire:', error)
      toast.error('Impossible de charger les statistiques de salaire')
    }
  }

  const toggleDay = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayValue)
        ? prev.recurringDays.filter(d => d !== dayValue)
        : [...prev.recurringDays, dayValue],
    }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader title="Planning" description={`${totalCompletedHours.toFixed(1)}h terminées cette semaine`}>
        {isCashier && (
          <button onClick={loadSalaryStats} className="btn-secondary">
            <Wallet className="w-4 h-4 text-gold-500" />
            Mon salaire
          </button>
        )}
        {isAdmin && (
          <button onClick={() => { setFormData(EMPTY_FORM); setModalVisible(true) }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouveau créneau
          </button>
        )}
      </PageHeader>

      {/* Navigation semaine */}
      <div className="card p-3 flex items-center justify-between">
        <button onClick={() => changeWeek(-1)} className="btn-ghost !p-2"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-sm font-bold text-cream text-center">
          Semaine du {weekDays[0].getDate()} {weekDays[0].toLocaleDateString('fr-FR', { month: 'short' })} au{' '}
          {weekDays[6].getDate()} {weekDays[6].toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
        </p>
        <button onClick={() => changeWeek(1)} className="btn-ghost !p-2"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        /* Grille semaine : 7 colonnes sur desktop, empilée sur mobile */
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 items-start">
          {weekDays.map((day, index) => {
            const daySchedules = schedulesByDay[day.toDateString()] || []
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={index} className={`card p-3 min-h-[120px] ${isToday ? '!border-gold-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className={`text-[12px] font-bold capitalize ${isToday ? 'text-gold-400' : 'text-gray-300'}`}>
                      {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </p>
                    <p className="text-[11px] text-gray-500">{day.getDate()} {day.toLocaleDateString('fr-FR', { month: 'short' })}</p>
                  </div>
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded-full bg-gold-500/15 text-[9.5px] font-bold text-gold-400 uppercase">Auj.</span>
                  )}
                </div>

                {daySchedules.length === 0 ? (
                  <p className="text-[11px] text-gray-600 text-center py-3">—</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedules.map((schedule) => {
                      const statusInfo = STATUS_INFO[schedule.status] || STATUS_INFO.scheduled
                      const userName = schedule.userId?.fullName || schedule.userId?.username || 'Inconnu'
                      return (
                        <div key={schedule._id} className={`rounded-lg bg-night-900 border border-night-700 border-l-2 ${statusInfo.border} p-2.5`}>
                          <div className="flex items-center gap-1.5">
                            {schedule.userId?.photo ? (
                              <img src={schedule.userId.photo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <UserRound className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            )}
                            <p className="text-[11.5px] font-semibold text-cream truncate flex-1">{userName}</p>
                          </div>
                          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {schedule.startTime}–{schedule.endTime} ({schedule.duration}h)
                          </p>
                          <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ring-1 ring-inset ${statusInfo.chip}`}>
                            {statusInfo.label}
                          </span>
                          {schedule.dailySalary !== null && schedule.dailySalary !== undefined && (
                            <p className="flex items-center gap-1 text-[10.5px] text-gold-400 mt-1">
                              <Banknote className="w-3 h-3" />
                              {formatPrice(schedule.dailySalary)}
                            </p>
                          )}
                          {schedule.notes && (
                            <p className="flex items-start gap-1 text-[10.5px] text-gray-500 mt-1">
                              <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{schedule.notes}</span>
                            </p>
                          )}
                          {isAdmin && (
                            <>
                              <div className="flex items-center gap-0.5 mt-2 pt-1.5 border-t border-night-700/60">
                                <button onClick={() => { setSelectedSchedule(schedule); setEditScheduleData({ startTime: schedule.startTime || '09:00', endTime: schedule.endTime || '17:00', notes: schedule.notes || '' }); setEditScheduleModal(true) }} className="p-1 rounded hover:bg-night-700 text-sky-400" title="Modifier les horaires">
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setSelectedSchedule(schedule); setEditDailySalary(schedule.dailySalary?.toString() ?? ''); setEditSalaryModal(true) }} className="p-1 rounded hover:bg-night-700 text-gold-500" title="Salaire journalier">
                                  <Banknote className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteTarget(schedule._id)} className="p-1 rounded hover:bg-night-700 text-red-400" title="Supprimer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <span className="flex-1" />
                              </div>
                              <div className="flex items-center gap-0.5 mt-1">
                                {Object.entries(STATUS_INFO).map(([status, info]) => {
                                  const SIcon = info.icon
                                  const active = schedule.status === status
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => !active && handleUpdateStatus(schedule._id, status)}
                                      title={info.label}
                                      className={`p-1 rounded transition-colors ${active ? info.chip.split(' ').slice(0, 2).join(' ') : 'text-gray-600 hover:text-gray-400 hover:bg-night-700'}`}
                                    >
                                      <SIcon className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création */}
      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title="Nouveau créneau" size="sm">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="input-label">Employé *</label>
            <select value={formData.userId} onChange={(e) => setFormData(p => ({ ...p, userId: e.target.value }))} className="input-field">
              <option value="">Sélectionner un employé</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.fullName || u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Date *</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Début</label>
              <input type="time" value={formData.startTime} onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Fin</label>
              <input type="time" value={formData.endTime} onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes (optionnel)" className="input-field resize-none" />
          </div>

          <div className="rounded-xl bg-night-900 border border-night-700 p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-gray-300">
                <Repeat className="w-4 h-4 text-amber-400" />
                Créneau récurrent
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
              <>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        formData.recurringDays.includes(day.value)
                          ? 'bg-gold-500 text-night-950'
                          : 'bg-night-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="input-label">Jusqu'au (optionnel)</label>
                  <input type="date" value={formData.endDate} min={formData.date} onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))} className="input-field" />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal édition horaires */}
      <Modal open={editScheduleModal} onClose={() => setEditScheduleModal(false)} title="Modifier les horaires" size="sm">
        <form onSubmit={handleUpdateSchedule} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Début</label>
              <input type="time" value={editScheduleData.startTime} onChange={(e) => setEditScheduleData(p => ({ ...p, startTime: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Fin</label>
              <input type="time" value={editScheduleData.endTime} onChange={(e) => setEditScheduleData(p => ({ ...p, endTime: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={editScheduleData.notes} onChange={(e) => setEditScheduleData(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-none" />
          </div>
          <button type="submit" className="btn-primary w-full !py-3">Enregistrer</button>
        </form>
      </Modal>

      {/* Modal salaire journalier */}
      <Modal open={editSalaryModal} onClose={() => setEditSalaryModal(false)} title="Salaire journalier" size="sm">
        <form onSubmit={handleUpdateDailySalary} className="p-6 space-y-4">
          <p className="text-[12.5px] text-gray-400 leading-relaxed">
            Fixez un salaire journalier pour ce créneau, ou laissez vide pour utiliser le calcul par défaut (taux horaire × heures).
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            value={editDailySalary}
            onChange={(e) => setEditDailySalary(e.target.value)}
            placeholder="Laisser vide = taux horaire"
            autoFocus
            className="input-field"
          />
          <button type="submit" className="btn-primary w-full !py-3">Enregistrer</button>
        </form>
      </Modal>

      {/* Modal mon salaire (salarié) */}
      <Modal open={salaryModalVisible} onClose={() => setSalaryModalVisible(false)} title="Mon salaire ce mois" size="sm">
        <div className="p-6">
          {salaryStats ? (
            <div className="space-y-3">
              <div className="card !bg-night-900 p-4 text-center">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total dû</p>
                <p className="text-3xl font-extrabold text-gold-400 mt-1">{formatPrice(salaryStats.totalDue || salaryStats.totalSalary || 0)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card !bg-night-900 p-3.5 text-center">
                  <p className="text-[10.5px] text-gray-500 uppercase">Heures</p>
                  <p className="text-[15px] font-bold text-cream mt-0.5">{(salaryStats.totalHours || salaryStats.hours || 0).toFixed?.(1) ?? salaryStats.totalHours}h</p>
                </div>
                <div className="card !bg-night-900 p-3.5 text-center">
                  <p className="text-[10.5px] text-gray-500 uppercase">Jours travaillés</p>
                  <p className="text-[15px] font-bold text-cream mt-0.5">{salaryStats.daysWorked || 0}</p>
                </div>
              </div>
              {salaryStats.commissions > 0 && (
                <p className="text-[12.5px] text-gray-400 text-center">
                  dont <span className="text-gold-400 font-semibold">{formatPrice(salaryStats.commissions)}</span> de commissions
                </p>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmation"
        message="Voulez-vous vraiment supprimer ce planning ?"
        confirmText="Supprimer"
      />
    </div>
  )
}
