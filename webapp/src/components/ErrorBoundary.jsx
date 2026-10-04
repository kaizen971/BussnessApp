import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-night-900 text-center px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-cream">Une erreur est survenue</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-sm">
            L'application a rencontré un problème inattendu. Rechargez la page pour continuer.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6">
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
