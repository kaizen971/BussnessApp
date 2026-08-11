import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  UserPlus, User, AtSign, Mail, Lock, Check, CheckCircle2, Tag, Clock,
  Building2, Leaf, Star, Gem, AlertCircle, Eye, EyeOff, ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { subscriptionAPI, legalAPI } from '../services/api'
import { Modal, Spinner } from '../components/ui'

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' }

const TIER_ICONS = { free: Leaf, basic: Star, premium: Gem }

const TIER_CLASSES = {
  free: 'from-night-600 to-night-800',
  basic: 'from-gold-500 to-gold-700',
  premium: 'from-premium to-[#6D28D9]',
}

export function getTier(plan) {
  if (plan.price === 0) return 'free'
  if (plan.tier === 'basic') return 'basic'
  if (plan.tier === 'premium') return 'premium'
  return 'basic'
}

export function getDurationLabel(plan) {
  if (plan.durationType === 'lifetime') return 'À vie'
  return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`
}

export function PlanCard({ plan, selected, onSelect }) {
  const tier = getTier(plan)
  const Icon = TIER_ICONS[tier] || Star

  return (
    <button
      type="button"
      onClick={() => onSelect(plan._id)}
      className={`relative w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
        selected ? 'border-gold-500 shadow-gold-sm' : 'border-transparent hover:border-night-500'
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 z-10 w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-gold-500" />
        </span>
      )}
      <div className={`p-5 bg-gradient-to-br ${selected ? TIER_CLASSES[tier] : 'from-night-700 to-night-800'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gold-500'}`} />
          </span>
          <span className="flex items-start">
            <span className="text-3xl font-extrabold text-white">{plan.price}</span>
            <span className="text-base font-semibold text-white/70 mt-1 ml-0.5">€</span>
          </span>
        </div>
        <p className="text-lg font-bold text-white mb-2">{plan.name}</p>
        <div className="flex items-center gap-3 flex-wrap text-[13px] text-white/70">
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{getDurationLabel(plan)}</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{plan.maxProjects} business max</span>
          {plan.isRecurring && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold text-white">récurrent</span>
          )}
        </div>
        {plan.features?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
            {plan.features.map((feature, idx) => (
              <p key={idx} className="flex items-center gap-2 text-[13px] text-white/80">
                <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${selected ? 'text-emerald-300' : 'text-gold-500'}`} />
                {feature}
              </p>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

export function CguModal({ open, onClose, onAccept, onDecline }) {
  const [cgu, setCgu] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || cgu || loading) return
    let cancelled = false
    setLoading(true)
    legalAPI.getCGU()
      .then((res) => { if (!cancelled) setCgu(res.data) })
      .catch(() => { if (!cancelled) toast.error('Impossible de charger les CGU') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title={cgu?.title || "Conditions Générales d'Utilisation"} size="lg">
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : cgu ? (
          <>
            <p className="text-[15px] font-bold text-gold-500 text-center mb-6">{cgu.appName}</p>
            {cgu.sections?.map((section) => (
              <div key={section.id} className="mb-5">
                <h3 className="text-sm font-bold text-cream mb-1.5">{section.id}. {section.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>
            ))}
            {cgu.updatedAt && (
              <p className="text-xs text-gray-600 text-center italic mt-4">Dernière mise à jour : {cgu.updatedAt}</p>
            )}
          </>
        ) : null}
      </div>
      <div className="flex gap-3 p-4 border-t border-night-700">
        <button onClick={onDecline} className="btn-secondary flex-1">Refuser</button>
        <button onClick={onAccept} className="btn-primary flex-[2]">
          <CheckCircle2 className="w-4 h-4" />
          Accepter
        </button>
      </div>
    </Modal>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', fullName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cguAccepted, setCguAccepted] = useState(false)
  const [cguModalVisible, setCguModalVisible] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const updateField = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))

  const fetchPlans = async () => {
    setLoadingPlans(true)
    try {
      const response = await subscriptionAPI.getPlans()
      setPlans(response.data || [])
    } catch (error) {
      console.error('Erreur chargement plans:', error)
      toast.error('Impossible de charger les plans. Veuillez réessayer.')
    } finally {
      setLoadingPlans(false)
    }
  }

  const validateStep1 = () => {
    const { username, email, password, confirmPassword, fullName } = formData
    if (!username || !email || !password || !fullName) {
      toast.error('Veuillez remplir tous les champs')
      return false
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return false
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }
    return true
  }

  const goToStep2 = (e) => {
    e.preventDefault()
    if (!validateStep1()) return
    if (!cguAccepted) {
      toast.error("Vous devez accepter les Conditions Générales d'Utilisation pour continuer.")
      return
    }
    fetchPlans()
    setStep(2)
  }

  const handleRegister = async () => {
    if (!selectedPlanId) {
      toast.error("Veuillez choisir un plan d'accompagnement")
      return
    }

    const selectedPlan = plans.find(p => p._id === selectedPlanId)
    const isPaidPlan = selectedPlan && selectedPlan.price > 0

    setLoading(true)
    const { username, email, password, fullName } = formData
    // Plan payant : inscription sans plan (compte auto-activé), puis paiement
    // Stripe self-service depuis la page Abonnement.
    const payload = isPaidPlan
      ? { username, email, password, fullName }
      : { username, email, password, fullName, selectedPlanId }
    const result = await register(payload)
    setLoading(false)

    if (result.success) {
      if (isPaidPlan) {
        toast.success('Compte créé ! Finalisez votre abonnement pour accéder à toutes les fonctionnalités.')
        navigate(`/abonnement?plan=${selectedPlanId}`, { replace: true })
        return
      }
      toast.success(result.message || 'Votre compte est actif. Bienvenue !')
      navigate('/onboarding', { replace: true })
    } else {
      toast.error(result.error || "Erreur d'inscription")
    }
  }

  const stepTitles = {
    1: { title: 'Créer un compte', subtitle: "Rejoignez EAS dès aujourd'hui" },
    2: { title: 'Choisir votre plan', subtitle: "Sélectionnez l'offre qui vous convient" },
  }

  return (
    <div className="min-h-screen bg-night-900 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto animate-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-gold-deep rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-gold">
            {step === 1 ? <UserPlus className="w-8 h-8 text-night-950" /> : <Tag className="w-8 h-8 text-night-950" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cream">{stepTitles[step].title}</h1>
          <p className="text-sm text-gray-400 mt-1.5">{stepTitles[step].subtitle}</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center mt-5">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s ? 'bg-gold-500 text-night-950'
                    : step === s ? 'bg-cream text-night-950 scale-110'
                    : 'bg-white/10 text-gray-500'
                }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </span>
                {s < 2 && <span className={`w-10 h-0.5 mx-1 ${step > s ? 'bg-gold-500/60' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={goToStep2} className="card p-6 sm:p-8 space-y-4">
            <div>
              <label className="input-label">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={formData.fullName} onChange={updateField('fullName')} placeholder="Entrez votre nom complet" className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="input-label">Nom d'utilisateur</label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={formData.username} onChange={updateField('username')} placeholder="Choisissez un nom d'utilisateur" autoCapitalize="none" className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" value={formData.email} onChange={updateField('email')} placeholder="votre.email@exemple.com" autoComplete="email" className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="input-label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={updateField('password')} placeholder="Minimum 6 caractères" autoComplete="new-password" className="input-field pl-10 pr-11" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="input-label">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={updateField('confirmPassword')} placeholder="Retapez votre mot de passe" autoComplete="new-password" className="input-field pl-10" />
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <span
                onClick={(e) => { e.preventDefault(); setCguAccepted(a => !a) }}
                className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  cguAccepted ? 'bg-gold-500 border-gold-500' : 'border-night-500 bg-night-900'
                }`}
              >
                {cguAccepted && <Check className="w-3.5 h-3.5 text-night-950" />}
              </span>
              <span className="text-[13px] text-gray-400">
                J'accepte les{' '}
                <button type="button" onClick={() => setCguModalVisible(true)} className="text-gold-500 font-semibold underline hover:text-gold-400">
                  Conditions Générales d'Utilisation
                </button>
              </span>
            </label>

            <button type="submit" className="btn-primary w-full !py-3 mt-2">Suivant - Choisir un plan</button>
            <Link to="/login" className="btn-ghost w-full">
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="card p-4 flex items-center gap-3">
              <Tag className="w-6 h-6 text-gold-500 flex-shrink-0" />
              <div>
                <p className="text-[15px] font-bold text-cream">Plan d'accompagnement</p>
                <p className="text-[13px] text-gray-500">Choisissez le plan adapté à vos besoins</p>
              </div>
            </div>

            {loadingPlans ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <Spinner />
                <p className="text-sm text-gray-500">Chargement des plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="card p-8 text-center">
                <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-4">Aucun plan disponible pour le moment</p>
                <button onClick={fetchPlans} className="btn-ghost mx-auto">Réessayer</button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1">
                {plans.map((plan) => (
                  <PlanCard key={plan._id} plan={plan} selected={selectedPlanId === plan._id} onSelect={setSelectedPlanId} />
                ))}
              </div>
            )}

            <div className="card p-4 space-y-2">
              <button
                onClick={handleRegister}
                disabled={!selectedPlanId || loading}
                className="btn-primary w-full !py-3.5"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-night-950/30 border-t-night-950 rounded-full animate-spin" />
                    Inscription...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Valider l'inscription
                  </>
                )}
              </button>
              <button onClick={() => setStep(1)} className="btn-ghost w-full">Retour</button>
            </div>
          </div>
        )}
      </div>

      <CguModal
        open={cguModalVisible}
        onClose={() => setCguModalVisible(false)}
        onAccept={() => { setCguAccepted(true); setCguModalVisible(false) }}
        onDecline={() => { setCguAccepted(false); setCguModalVisible(false) }}
      />
    </div>
  )
}
