import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Briefcase, User, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    const result = await login(username, password)
    setLoading(false)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      toast.error(result.error || 'Erreur de connexion')
    }
  }

  return (
    <div className="min-h-screen bg-night-900 flex flex-col lg:flex-row">
      {/* Panneau branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-night relative overflow-hidden items-center justify-center p-12">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-md text-center animate-in">
          <div className="w-24 h-24 bg-gradient-gold-deep rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-gold">
            <Briefcase className="w-12 h-12 text-night-950" />
          </div>
          <h1 className="text-4xl font-extrabold text-gradient-gold tracking-tight">
            Entreprendre avec succès
          </h1>
          <p className="text-gray-400 mt-4 text-lg">Gérez votre business intelligemment</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              ['Ventes', 'Suivez vos revenus'],
              ['Stock', 'Gérez vos produits'],
              ['Équipe', 'Pilotez vos salariés'],
            ].map(([t, d]) => (
              <div key={t} className="card p-4">
                <p className="text-sm font-bold text-gold-400">{t}</p>
                <p className="text-[11px] text-gray-500 mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-in">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-gold-deep rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-gold">
              <Briefcase className="w-8 h-8 text-night-950" />
            </div>
            <h1 className="text-2xl font-extrabold text-gradient-gold">EAS</h1>
            <p className="text-sm text-gray-400 mt-1">Gérez votre business intelligemment</p>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-cream text-center mb-6">Connexion</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="input-label">Nom d'utilisateur ou Email</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Entrez votre identifiant"
                    autoComplete="username"
                    autoCapitalize="none"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    autoComplete="current-password"
                    className="input-field pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 mt-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-night-950/30 border-t-night-950 rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </form>

            <div className="mt-4">
              <Link to="/register" className="btn-secondary w-full !py-3">
                Créer un compte
              </Link>
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center mt-6">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  )
}
