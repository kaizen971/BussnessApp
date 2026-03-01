import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import AccessGatePage from './pages/AccessGatePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminsPage from './pages/AdminsPage'
import CreateAdminPage from './pages/CreateAdminPage'
import AdminDetailPage from './pages/AdminDetailPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import PlansPage from './pages/PlansPage'
import SuperAdminsPage from './pages/SuperAdminsPage'
import NotFoundPage from './pages/NotFoundPage'

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fb]">
        <div className="flex flex-col items-center gap-4 animate-in">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25">
              <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <div className="absolute -inset-3 bg-primary-500/10 rounded-3xl animate-pulse" />
          </div>
          <div className="text-center mt-2">
            <p className="text-sm font-semibold text-gray-600">BussnessApp</p>
            <p className="text-xs text-gray-400 mt-0.5">Chargement en cours...</p>
          </div>
        </div>
      </div>
    )
  }
  return token ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="admins/new" element={<CreateAdminPage />} />
        <Route path="admins/:id" element={<AdminDetailPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="super-admins" element={<SuperAdminsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function AccessGateWrapper({ children }) {
  const [hasAccess, setHasAccess] = useState(() => !!sessionStorage.getItem('bo_access_key'))
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const savedKey = sessionStorage.getItem('bo_access_key')
    if (savedKey) {
      import('./services/api').then(({ default: api }) => {
        api.post('/backoffice/auth/verify-access', { accessKey: savedKey })
          .then(res => {
            if (res.data.valid) {
              setHasAccess(true)
            } else {
              sessionStorage.removeItem('bo_access_key')
              setHasAccess(false)
            }
          })
          .catch(() => {
            sessionStorage.removeItem('bo_access_key')
            setHasAccess(false)
          })
          .finally(() => setChecking(false))
      })
    } else {
      setChecking(false)
    }
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-6 h-6 border-[2.5px] border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return <AccessGatePage onAccessGranted={() => setHasAccess(true)} />
  }

  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 20, right: 20 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f0f20',
              color: '#fff',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 500,
              padding: '12px 16px',
              boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#0f0f20' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#0f0f20' },
            },
          }}
        />
        <AccessGateWrapper>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </AccessGateWrapper>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
