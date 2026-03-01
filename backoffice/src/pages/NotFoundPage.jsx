import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-6">
      <div className="max-w-md w-full text-center animate-in">
        <div className="relative mb-8">
          <div className="text-[120px] font-black text-gray-100 leading-none select-none tracking-tighter">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center shadow-inner">
              <Search className="w-9 h-9 text-primary-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Page introuvable</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex items-center gap-3 justify-center mt-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl shadow-sm hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl shadow-sm shadow-primary-500/20 hover:bg-primary-600 transition-all"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
