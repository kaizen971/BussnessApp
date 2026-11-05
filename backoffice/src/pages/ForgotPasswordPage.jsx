import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, ArrowRight, ArrowLeft, MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Requis')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Format invalide')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/backoffice/auth/forgot-password', { email: email.trim() })
      setSent(true)
      toast.success(res.data.message || 'Email envoyé')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-primary-600/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[420px] animate-in">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl mb-5 ${sent ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/30'}`}>
            {sent ? <MailCheck className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">
            {sent ? 'Vérifiez vos emails' : 'Mot de passe oublié'}
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            {sent
              ? 'Le lien de réinitialisation est valable 1 heure'
              : 'Recevez un lien de réinitialisation par email'}
          </p>
        </div>

        {sent ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
            <p className="text-[14px] text-gray-400 leading-relaxed">
              Si un compte super-administrateur existe avec l'adresse{' '}
              <span className="text-white font-medium">{email.trim()}</span>, un lien de
              réinitialisation vient d'y être envoyé.
            </p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Pensez à vérifier vos spams. Le lien expire au bout d'une heure et ne peut servir
              qu'une seule fois.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2.5 text-[15px]"
            >
              Retour à la connexion
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail('') }}
              className="w-full text-[13px] text-gray-500 hover:text-gray-300 font-medium transition-colors"
            >
              Utiliser une autre adresse email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Adresse email</label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className={`w-full px-4 py-3 bg-white/[0.06] border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[15px] ${error ? 'border-red-400/60 focus:ring-red-400/30' : 'border-white/[0.08] focus:ring-primary-500/30 focus:border-primary-500/50'}`}
                placeholder="admin@bussnessapp.com"
                autoComplete="email"
              />
              {error && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:from-primary-700 active:to-primary-800 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 text-[15px] mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Envoyer le lien
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </Link>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-8 font-medium">
          BussnessApp Administration &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
