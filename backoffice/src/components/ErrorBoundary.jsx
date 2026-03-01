import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
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
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-6">
          <div className="max-w-md w-full text-center animate-in">
            <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Oups, une erreur est survenue</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-sm mx-auto">
              L'application a rencontré un problème inattendu. Essayez de rafraîchir la page ou de revenir à l'accueil.
            </p>

            {this.state.error && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 text-left">
                <p className="text-xs text-red-600 font-mono break-all">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex items-center gap-3 justify-center mt-6">
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl shadow-sm hover:bg-gray-50 transition-all"
              >
                <Home className="w-4 h-4" /> Accueil
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl shadow-sm shadow-primary-500/20 hover:bg-primary-600 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Rafraîchir
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
