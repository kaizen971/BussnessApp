import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { FullPageLoader } from './ui'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth()
  const { hasWebappAccess, loading: subLoading } = useSubscription()
  const location = useLocation()

  if (authLoading || subLoading) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isSubscriptionPage = location.pathname === '/abonnement' ||
    location.pathname.startsWith('/abonnement/')

  if (isAdmin && !hasWebappAccess && !isSubscriptionPage) {
    return <Navigate to="/abonnement" replace />
  }

  return children
}
