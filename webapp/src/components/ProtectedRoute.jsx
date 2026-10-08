import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { FullPageLoader } from './ui'
import { Lock } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isAdmin, logout, loading: authLoading } = useAuth()
  const { hasWebappAccess, employeeLocked, loading: subLoading } = useSubscription()
  const location = useLocation()

  if (authLoading || subLoading) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isSubscriptionPage = location.pathname === '/abonnement' ||
    location.pathname.startsWith('/abonnement/')

  if (isAdmin && !hasWebappAccess && !isSubscriptionPage) {
    return <Navigate to="/abonnement" replace />
  }

  // Employé d'un business dont l'essai / l'abonnement est terminé
  if (!isAdmin && employeeLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/15 flex items-center justify-center">
            <Lock className="w-7 h-7 text-gold-500" />
          </div>
          <h1 className="text-xl font-bold">Accès suspendu</h1>
          <p className="text-gray-400 text-sm">
            L'abonnement de votre business a expiré. Contactez votre responsable pour le renouveler.
          </p>
          <button onClick={logout} className="btn-secondary w-full">Se déconnecter</button>
        </div>
      </div>
    )
  }

  return children
}
