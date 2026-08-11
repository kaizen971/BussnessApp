import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Banknote, Clock, CheckCircle2, UserRound, HandCoins } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { ConfirmDialog, EmptyState, PageHeader, Badge, SkeletonTable } from '../components/ui'

const formatDate = (date) =>
  new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function CommissionsPage() {
  const { user, selectedProjectId } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payTarget, setPayTarget] = useState(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'responsable' || user?.role === 'manager'

  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true)
      const params = { projectId: selectedProjectId || user?.projectId }
      if (!isAdmin) params.userId = user.id
      const response = await api.get('/commissions', { params })
      setCommissions(response.data.data || [])
      setStats(response.data.stats || null)
    } catch (error) {
      console.error('Erreur chargement commissions:', error)
      toast.error('Impossible de charger les commissions')
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId, user, isAdmin])

  useEffect(() => { loadCommissions() }, [loadCommissions])

  const handleMarkAsPaid = async () => {
    if (!payTarget) return
    try {
      await api.put(`/commissions/${payTarget._id}/pay`)
      toast.success('Commission marquée comme payée')
      setPayTarget(null)
      loadCommissions()
    } catch {
      toast.error('Impossible de mettre à jour la commission')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto">
      <PageHeader
        title="Commissions"
        description={isAdmin ? `${commissions.length} commission(s)` : 'Mes commissions'}
      />

      {stats && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="card p-4 text-center">
            <Banknote className="w-6 h-6 text-gold-500 mx-auto mb-1.5" />
            <p className="text-lg font-extrabold text-cream">{formatPrice(stats.total || 0)}</p>
            <p className="text-[11.5px] text-gray-500">Total</p>
          </div>
          <div className="card p-4 text-center">
            <Clock className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
            <p className="text-lg font-extrabold text-amber-400">{formatPrice(stats.pending || 0)}</p>
            <p className="text-[11.5px] text-gray-500">En attente</p>
          </div>
          <div className="card p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-lg font-extrabold text-emerald-400">{formatPrice(stats.paid || 0)}</p>
            <p className="text-[11.5px] text-gray-500">Payées</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><SkeletonTable rows={5} /></div>
      ) : commissions.length === 0 ? (
        <div className="card">
          <EmptyState icon={HandCoins} title="Aucune commission" description="Les commissions apparaîtront après les ventes" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {commissions.map((item) => {
            const userName = item.userId?.fullName || item.userId?.username || 'Inconnu'
            const isPending = item.status === 'pending'
            return (
              <div key={item._id} className="card p-4 animate-in">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <UserRound className="w-5 h-5 text-emerald-400" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-cream truncate">{userName}</p>
                    <p className="text-[11.5px] text-gray-500">{formatDate(item.date)}</p>
                  </div>
                  <Badge variant={isPending ? 'warning' : 'success'} dot>
                    {isPending ? 'En attente' : 'Payée'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-night-700/60">
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Vente</p>
                    <p className="text-[13px] font-semibold text-cream mt-0.5">{formatPrice(item.saleAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Taux</p>
                    <p className="text-[13px] font-semibold text-cream mt-0.5">{item.rate}%</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Commission</p>
                    <p className="text-[15px] font-extrabold text-gold-400 mt-0.5">{formatPrice(item.amount || 0)}</p>
                  </div>
                </div>

                {isAdmin && isPending && (
                  <button onClick={() => setPayTarget(item)} className="btn-primary w-full mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Marquer comme payée
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onConfirm={handleMarkAsPaid}
        title="Confirmation"
        message="Marquer cette commission comme payée ?"
        confirmText="Confirmer"
        variant="success"
      />
    </div>
  )
}
