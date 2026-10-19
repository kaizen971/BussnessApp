import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const MIN_LENGTH = 8

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const passwordRef = useRef(null)

  useEffect(() => {
    if (!token) {
      setTokenError('Lien invalide : aucun token fourni.')
      setChecking(false)
      return
    }
    api.post('/backoffice/auth/verify-reset-token', { token })
      .then(res => setEmail(res.data.email || ''))
      .catch(err => setTokenError(err.response?.data?.error || 'Lien invalide ou expiré'))
      .finally(() => setChecking(false))
  }, [token])

  useEffect(() => {
    if (!checking && !tokenError) passwordRef.current?.focus()
  }, [checking, tokenError])

  const validate = () => {
    const e = {}
    if (!form.password) e.password = 'Requis'
    else if (form.password.length < MIN_LENGTH) e.password = `Min. ${MIN_LENGTH} caractères`
    if (!form.confirm) e.confirm = 'Requis'
    else if (form.confirm !== form.password) e.confirm = 'Les mots de passe ne correspondent pas'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/backoffice/auth/reset-password', { token, password: form.password })
      setDone(true)
      toast.success('Mot de passe réinitialisé')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la réinitialisation')
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }))
  }

  const inputClass = (field) => `w-full px-4 py-3 bg-white/[0.06] border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[15px] ${errors[field] ? 'border-red-400/60 focus:ring-red-400/30' : 'border-white/[0.08] focus:ring-primary-500/30 focus:border-primary-500/50'}`

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3 animate-in">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-[2.5px] border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-primary-600/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[420px] animate-in">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl mb-5 ${tokenError ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/30' : done ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/30'}`}>
            {tokenError ? <ShieldAlert className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">
            {tokenError ? 'Lien expiré' : done ? 'C\'est fait !' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            {tokenError
              ? 'Ce lien n\'est plus valable'
              : done
                ? 'Redirection vers la connexion...'
                : email || 'Choisissez un nouveau mot de passe'}
          </p>
        </div>

        {tokenError ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
            <p className="text-[14px] text-gray-400 leading-relaxed">{tokenError}</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Les liens de réinitialisation expirent après 1 heure et ne peuvent servir qu'une
              seule fois. Refaites une demande pour en recevoir un nouveau.
            </p>
            <Link
              to="/forgot-password"
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2.5 text-[15px]"
            >
              Nouvelle demande
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </Link>
          </div>
        ) : done ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
            <p className="text-[14px] text-gray-400 leading-relaxed">
              Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter au back
              office avec vos nouveaux identifiants.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 text-[15px]"
            >
              Se connecter
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className={`${inputClass('password')} pr-12`}
                  placeholder={`Min. ${MIN_LENGTH} caractères`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5">
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={set('confirm')}
                className={inputClass('confirm')}
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
              />
              {errors.confirm && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.confirm}</p>}
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
                  Réinitialiser
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-8 font-medium">
          BussnessApp Administration &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
