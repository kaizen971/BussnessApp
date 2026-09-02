import { useNavigate } from 'react-router-dom'
import {
  Lock, LineChart, Users, Boxes, UserRound, CalendarDays, Banknote,
  CheckCircle2, Gem, Building2, Infinity as InfinityIcon,
} from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'

const PREMIUM_FEATURES = [
  { icon: LineChart, label: 'Simulation Business Plan', desc: 'Simulez et planifiez votre activité' },
  { icon: Users, label: "Gestion d'équipe", desc: 'Gérez votre personnel et la paie' },
  { icon: Boxes, label: 'Gestion de stock avancée', desc: 'Mouvements, alertes et historique' },
  { icon: UserRound, label: 'CRM Clients', desc: 'Gérez vos relations clients' },
  { icon: CalendarDays, label: 'Planning', desc: 'Organisez votre agenda professionnel' },
  { icon: Banknote, label: 'Commissions', desc: 'Calcul automatique des commissions' },
]

export default function PaywallPage({ featureName }) {
  const { plans } = useSubscription()
  const navigate = useNavigate()

  const premiumPlan = plans.find(p => p.tier === 'premium') || plans[plans.length - 1]

  return (
    <div className="p-4 sm:p-6 max-w-[720px] mx-auto">
      <div className="text-center pt-6 mb-8 animate-in">
        <div className="w-20 h-20 bg-gradient-premium rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-premium">
          <Lock className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-cream">Fonctionnalité Premium</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
          {featureName
            ? `"${featureName}" est disponible avec l'abonnement Premium.`
            : 'Cette fonctionnalité nécessite un abonnement Premium.'}
        </p>
      </div>

      <div className="card p-5 mb-6 animate-in stagger-1">
        <p className="text-[15px] font-bold text-cream mb-2">Débloquez toutes ces fonctionnalités :</p>
        <div className="divide-y divide-night-700">
          {PREMIUM_FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="flex items-center gap-3 py-3">
                <span className="w-10 h-10 rounded-xl bg-premium/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-premium-light" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cream">{f.label}</p>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">{f.desc}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-premium-light flex-shrink-0" />
              </div>
            )
          })}
        </div>
      </div>

      {premiumPlan && (
        <div className="rounded-2xl p-5 mb-6 bg-gradient-premium animate-in stagger-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold text-white">{premiumPlan.name}</p>
              {premiumPlan.description && <p className="text-[12px] text-white/70 mt-0.5">{premiumPlan.description}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[26px] font-extrabold text-white leading-none">{premiumPlan.price}€</p>
              <p className="text-[11px] text-white/60 mt-1">
                /{premiumPlan.durationType === 'lifetime' ? 'à vie' : `${premiumPlan.duration} ${premiumPlan.durationType === 'months' ? 'mois' : premiumPlan.durationType}`}
              </p>
            </div>
          </div>
          <div className="flex gap-5 mt-4 pt-4 border-t border-white/15">
            <p className="flex items-center gap-1.5 text-[13px] text-white/85 font-medium">
              <Building2 className="w-4 h-4 text-white/70" />
              {premiumPlan.maxProjects} business
            </p>
            <p className="flex items-center gap-1.5 text-[13px] text-white/85 font-medium">
              <InfinityIcon className="w-4 h-4 text-white/70" />
              Toutes les fonctionnalités
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 pb-8 animate-in stagger-3">
        <button
          onClick={() => navigate(premiumPlan ? `/abonnement?plan=${premiumPlan._id}` : '/abonnement')}
          className="btn-primary w-full !py-3.5"
        >
          <Gem className="w-5 h-5" />
          Passer au Premium
        </button>
        <button onClick={() => navigate(-1)} className="btn-ghost w-full">Retour</button>
        <p className="text-[12px] text-gray-600 text-center">Paiement en ligne sécurisé par Stripe</p>
      </div>
    </div>
  )
}
