import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const { token, login, initSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [needsInit, setNeedsInit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const emailRef = useRef(null)

  const [form, setForm] = useState({ email: '', password: '', username: '', fullName: '', initSecret: '' })

  useEffect(() => { if (token) navigate('/') }, [token, navigate])

  useEffect(() => {
    api.get('/backoffice/auth/check-init')
      .then(res => setNeedsInit(res.data.needsInit))
      .catch(() => setNeedsInit(false))
  }, [])

  useEffect(() => {
    if (needsInit !== null) emailRef.current?.focus()
  }, [needsInit])

  const validate = () => {
    const e = {}
    if (needsInit && !form.initSecret.trim()) e.initSecret = 'Requis'
    if (needsInit && !form.fullName.trim()) e.fullName = 'Requis'
    if (needsInit && !form.username.trim()) e.username = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format invalide'
    if (!form.password) e.password = 'Requis'
    else if (form.password.length < 6) e.password = 'Min. 6 caractères'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (needsInit) {
        await initSuperAdmin(form)
        toast.success('Super-admin créé avec succès !')
      } else {
        await login(form.email, form.password)
        toast.success('Connexion réussie')
      }
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }))
  }

  if (needsInit === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3 animate-in">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-[2.5px] border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const inputClass = (field) => `w-full px-4 py-3 bg-white/[0.06] border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[15px] ${errors[field] ? 'border-red-400/60 focus:ring-red-400/30' : 'border-white/[0.08] focus:ring-primary-500/30 focus:border-primary-500/50'}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-primary-600/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[420px] animate-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl shadow-xl shadow-primary-500/30 mb-5">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">BussnessApp</h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            {needsInit ? 'Créez votre compte super-administrateur' : 'Connectez-vous au back office'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-7 space-y-5">
          {needsInit && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-2">Secret d'initialisation</label>
                <input type="password" value={form.initSecret} onChange={set('initSecret')} className={inputClass('initSecret')} placeholder="Secret fourni par le développeur" autoComplete="off" />
                {errors.initSecret && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.initSecret}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-2">Nom complet</label>
                <input type="text" value={form.fullName} onChange={set('fullName')} className={inputClass('fullName')} placeholder="Jean Dupont" autoComplete="name" />
                {errors.fullName && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-2">Identifiant</label>
                <input type="text" value={form.username} onChange={set('username')} className={inputClass('username')} placeholder="superadmin" autoComplete="username" />
                {errors.username && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.username}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-[13px] font-medium text-gray-400 mb-2">Adresse email</label>
            <input ref={emailRef} type="email" value={form.email} onChange={set('email')} className={inputClass('email')} placeholder="admin@bussnessapp.com" autoComplete="email" />
            {errors.email && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-400 mb-2">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`${inputClass('password')} pr-12`} placeholder="Min. 6 caractères" autoComplete={needsInit ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5">
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1.5 animate-in-fast">{errors.password}</p>}
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
                {needsInit ? 'Créer le compte' : 'Se connecter'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8 font-medium">
          BussnessApp Administration &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
