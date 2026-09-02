import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import ProtectedRoute from './components/ProtectedRoute'
import PremiumRoute from './components/PremiumRoute'
import Layout from './components/Layout'
import { FullPageLoader } from './components/ui'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import SalesPage from './pages/SalesPage'
import ExpensesPage from './pages/ExpensesPage'
import ProductsPage from './pages/ProductsPage'
import ProjectsPage from './pages/ProjectsPage'
import CategoriesPage from './pages/CategoriesPage'
import FeedbackPage from './pages/FeedbackPage'
import SimulationPage from './pages/SimulationPage'
import StockPage from './pages/StockPage'
import CustomersPage from './pages/CustomersPage'
import TeamPage from './pages/TeamPage'
import PlanningPage from './pages/PlanningPage'
import CommissionsPage from './pages/CommissionsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import CheckoutSuccessPage from './pages/CheckoutSuccessPage'
import TutorialPage from './pages/TutorialPage'

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="ventes" element={<SalesPage />} />
        <Route path="depenses" element={<ExpensesPage />} />
        <Route path="produits" element={<ProductsPage />} />
        <Route path="projets" element={<ProjectsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="feedback" element={<FeedbackPage />} />

        <Route path="simulation" element={
          <PremiumRoute screenKey="Simulation" featureName="Simulation Business Plan"><SimulationPage /></PremiumRoute>
        } />
        <Route path="stock" element={
          <PremiumRoute screenKey="Stock" featureName="Gestion de stock"><StockPage /></PremiumRoute>
        } />
        <Route path="clients" element={
          <PremiumRoute screenKey="Customers" featureName="CRM Clients"><CustomersPage /></PremiumRoute>
        } />
        <Route path="equipe" element={
          <PremiumRoute screenKey="Team" featureName="Gestion d'équipe"><TeamPage /></PremiumRoute>
        } />
        <Route path="planning" element={
          <PremiumRoute screenKey="Planning" featureName="Planning"><PlanningPage /></PremiumRoute>
        } />
        <Route path="commissions" element={
          <PremiumRoute screenKey="Commissions" featureName="Commissions"><CommissionsPage /></PremiumRoute>
        } />

        <Route path="abonnement" element={<SubscriptionPage />} />
        <Route path="abonnement/succes" element={<CheckoutSuccessPage />} />
        <Route path="tutoriel" element={<TutorialPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/app">
        <AuthProvider>
          <CurrencyProvider>
            <SubscriptionProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1A1A1A',
                    color: '#F5F5F5',
                    border: '1px solid #3D3D3D',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                  },
                  success: { iconTheme: { primary: '#D4AF37', secondary: '#0D0D0D' } },
                  error: { iconTheme: { primary: '#DC3545', secondary: '#F5F5F5' } },
                }}
              />
              <AppRoutes />
            </SubscriptionProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
