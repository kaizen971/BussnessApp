import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FullPageLoader } from './ui'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return children
}
