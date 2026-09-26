import { useNavigate } from 'react-router-dom'
import { GraduationCap, Lightbulb, TrendingUp, ArrowRight, Briefcase } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CHOICES = [
  {
    key: 'tutorial',
    to: '/tutoriel',
    icon: GraduationCap,
    iconClass: 'text-gold-600',
    title: 'Tutoriel de Démarrage',
    description: 'Guide étape par étape pour configurer votre business (Recommandé)',
    adminOnly: true,
  },
  {
    key: 'simulation',
    to: '/simulation',
    icon: Lightbulb,
    iconClass: 'text-gold-500',
    title: 'Valider une idée de business ou de produit',
    description: 'Simule la rentabilité, calcule ton point mort et crée ton business plan',
    adminOnly: true,
  },
  {
    key: 'business',
    to: '/',
    icon: TrendingUp,
    iconClass: 'text-cream',
    title: 'Suivre mon business en cours',
    description: 'Gère tes ventes, dépenses, stock et clients au quotidien',
    adminOnly: false,
  },
]

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const choices = CHOICES.filter(c => !c.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gold-700/30 via-night-900 to-night-950 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-in">
          <div className="w-20 h-20 bg-gradient-gold-deep rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Briefcase className="w-10 h-10 text-night-950" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-cream">Entreprendre avec succès</h1>
          {isAdmin && (
            <p className="text-gray-400 mt-3">Valide ton idée. Pilote ton business. Simplement.</p>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-cream text-center mb-8 animate-in stagger-1">
          Que veux-tu faire aujourd'hui ?
        </h2>

        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          {choices.map(({ key, to, icon: Icon, iconClass, title, description }, i) => (
            <button
              key={key}
              onClick={() => navigate(to)}
              className={`card-hover p-6 text-center group animate-in stagger-${i + 2} flex flex-col`}
            >
              <span className="w-16 h-16 rounded-2xl bg-night-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Icon className={`w-8 h-8 ${iconClass}`} />
              </span>
              <p className="text-base font-bold text-cream mb-2">{title}</p>
              <p className="text-[13px] text-gray-400 leading-relaxed flex-1">{description}</p>
              <span className="flex justify-center mt-4 text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
