import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Bug, Lightbulb, TrendingUp, MessageSquare, MessagesSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { feedbackAPI } from '../services/api'
import { Modal, EmptyState, PageHeader, Badge, SkeletonTable, Spinner } from '../components/ui'

const TYPES = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10' },
  { value: 'feature', label: 'Fonctionnalité', icon: Lightbulb, color: 'text-gold-400', bg: 'bg-gold-500/10' },
  { value: 'improvement', label: 'Amélioration', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'other', label: 'Autre', icon: MessageSquare, color: 'text-gray-400', bg: 'bg-white/5' },
]

const getTypeInfo = (type) => TYPES.find(t => t.value === type) || TYPES[3]

const STATUS_INFO = {
  pending: { label: 'En attente', variant: 'warning' },
  in_review: { label: 'En cours', variant: 'info' },
  resolved: { label: 'Résolu', variant: 'success' },
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [formData, setFormData] = useState({ type: 'feature', message: '' })

  const loadFeedbacks = useCallback(async () => {
    try {
      const response = await feedbackAPI.getAll({ projectId: user?.projectId })
      setFeedbacks(response.data || [])
    } catch (error) {
      console.error('Error loading feedbacks:', error)
      toast.error('Impossible de charger les feedbacks')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  useEffect(() => { loadFeedbacks() }, [loadFeedbacks])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.message) {
      toast.error('Veuillez saisir un message')
      return
    }
    setSaving(true)
    try {
      await feedbackAPI.create({ ...formData, projectId: user?.projectId })
      setFormData({ type: 'feature', message: '' })
      setModalVisible(false)
      loadFeedbacks()
      toast.success('Feedback envoyé avec succès')
    } catch {
      toast.error("Impossible d'envoyer le feedback")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[900px] mx-auto">
      <PageHeader title="Feedback" description="Partagez vos idées, améliorations et signalements">
        <button onClick={() => setModalVisible(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouveau feedback
        </button>
      </PageHeader>

      {loading ? (
        <div className="card"><SkeletonTable rows={4} cols={3} /></div>
      ) : feedbacks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MessagesSquare}
            title="Aucun feedback"
            description="Partagez vos idées et améliorations"
            action={() => setModalVisible(true)}
            actionLabel="Envoyer un feedback"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((item) => {
            const typeInfo = getTypeInfo(item.type)
            const statusInfo = STATUS_INFO[item.status] || { label: 'Inconnu', variant: 'neutral' }
            const TypeIcon = typeInfo.icon
            return (
              <div key={item._id} className="card p-4 flex items-start gap-3 animate-in">
                <span className={`w-10 h-10 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-cream">{typeInfo.label}</p>
                    <Badge variant={statusInfo.variant} dot>{statusInfo.label}</Badge>
                  </div>
                  <p className="text-[13px] text-gray-300 mt-1.5 leading-relaxed">{item.message}</p>
                  <p className="text-[11.5px] text-gray-600 mt-2">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title="Nouveau feedback" size="sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Type de feedback *</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((type) => {
                const TypeIcon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      formData.type === type.value ? 'border-gold-500 bg-gold-500/10' : 'border-night-600 bg-night-900 hover:border-night-500'
                    }`}
                  >
                    <TypeIcon className={`w-4 h-4 ${type.color}`} />
                    <span className="text-[12.5px] font-medium text-gray-300">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="input-label">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Décrivez votre feedback en détail..."
              rows={4}
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : 'Envoyer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
