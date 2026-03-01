import { useState, useRef, useEffect } from 'react'
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function AccessGatePage({ onAccessGranted }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Code requis')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/backoffice/auth/verify-access', { accessKey: code })
      if (res.data.valid) {
        sessionStorage.setItem('bo_access_key', code)
        api.defaults.headers.common['X-Access-Key'] = code
        toast.success('Accès autorisé')
        onAccessGranted()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Code d\'accès incorrect')
      setCode('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-primary-600/[0.04] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[400px] animate-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl shadow-xl shadow-orange-500/30 mb-5">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Zone protégée</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            Entrez le code d'accès pour continuer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-gray-400 mb-2">
              Code d'accès
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Lock className="w-[16px] h-[16px]" />
              </div>
              <input
                ref={inputRef}
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError('') }}
                className={`w-full pl-11 pr-4 py-3 bg-white/[0.06] border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[15px] ${error ? 'border-red-400/60 focus:ring-red-400/30' : 'border-white/[0.08] focus:ring-primary-500/30 focus:border-primary-500/50'}`}
                placeholder="Entrez le code..."
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2 animate-in-fast flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:from-amber-700 active:to-orange-800 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 text-[15px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Vérifier
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8 font-medium">
          Accès restreint aux administrateurs autorisés
        </p>
      </div>
    </div>
  )
}
