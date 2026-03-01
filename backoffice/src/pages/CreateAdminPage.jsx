import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Banknote, Heart, Loader2, Eye, EyeOff, Send, Link2, FolderOpen, Clock, Check, AlertCircle, ChevronRight, User, Mail, Lock, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, Skeleton, Badge } from '../components/ui'
import api from '../services/api'

const PAYMENT_METHODS = [
  { id: 'card', label: 'Carte bancaire', desc: 'Lien de paiement Stripe par email', icon: CreditCard, accent: 'blue' },
  { id: 'cash', label: 'Liquide', desc: 'Paiement reçu en main propre', icon: Banknote, accent: 'emerald' },
  { id: 'donation', label: 'Donation', desc: 'Accès offert gratuitement', icon: Heart, accent: 'pink' },
]

const ACCENT_CLASSES = {
  blue: { selected: 'border-blue-300 bg-blue-50 ring-blue-300/50', icon: 'text-blue-600 bg-blue-100', dot: 'bg-blue-500' },
  emerald: { selected: 'border-emerald-300 bg-emerald-50 ring-emerald-300/50', icon: 'text-emerald-600 bg-emerald-100', dot: 'bg-emerald-500' },
  pink: { selected: 'border-pink-300 bg-pink-50 ring-pink-300/50', icon: 'text-pink-600 bg-pink-100', dot: 'bg-pink-500' },
}

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' }

const STEPS = [
  { key: 'info', label: 'Informations', num: 1 },
  { key: 'plan', label: 'Plan', num: 2 },
  { key: 'payment', label: 'Paiement', num: 3 },
]

export default function CreateAdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '',
    paymentMethod: 'cash', planId: '', notes: ''
  })

  useEffect(() => {
    api.get('/backoffice/plans', { params: { active: 'true' } })
      .then(res => {
        setPlans(res.data)
        if (res.data.length > 0) setForm(f => ({ ...f, planId: res.data[0]._id }))
      })
      .catch(() => toast.error('Erreur chargement des plans'))
      .finally(() => setPlansLoading(false))
  }, [])

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }))
  }

  const selectedPlan = plans.find(p => p._id === form.planId)
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === form.paymentMethod)

  const validateStep = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.fullName.trim()) e.fullName = 'Requis'
      if (!form.username.trim()) e.username = 'Requis'
      if (!form.email.trim()) e.email = 'Requis'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format invalide'
      if (!form.password) e.password = 'Requis'
      else if (form.password.length < 6) e.password = 'Min. 6 caractères'
    }
    if (s === 1 && !form.planId) e.planId = 'Sélectionnez un plan'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 2))
  }

  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  const getDurationLabel = (plan) => {
    if (plan.durationType === 'lifetime') return 'À vie'
    return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(2)) return
    if (!form.planId) { toast.error('Sélectionnez un plan'); return }
    setLoading(true)
    try {
      const res = await api.post('/backoffice/admins', form)
      toast.success(res.data.message)
      if (res.data.paymentLink) toast.success('Lien Stripe envoyé', { duration: 5000 })
      navigate('/admins')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) => `input-field ${errors[field] ? 'border-red-300 focus:ring-red-300/30 focus:border-red-400' : ''}`

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6 animate-in">
        <button onClick={() => navigate('/admins')} className="text-gray-400 hover:text-gray-600 transition-colors font-medium">Administrateurs</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-gray-700 font-medium">Nouveau</span>
      </nav>

      <PageHeader title="Créer un administrateur" description="Créez un compte admin et assignez-lui un plan" />

      {/* Stepper */}
      <div className="flex items-center gap-0 my-8 animate-in stagger-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <button
              onClick={() => { if (i < step) setStep(i) }}
              className={`flex items-center gap-2.5 ${i <= step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < step ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25' :
                i === step ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-gray-900' : i < step ? 'text-emerald-600' : 'text-gray-400'}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-3">
                <div className={`h-0.5 rounded-full transition-all duration-500 ${i < step ? 'bg-emerald-400' : 'bg-gray-100'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Info */}
        {step === 0 && (
          <div className="card p-6 space-y-5 animate-in">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>
                <p className="text-xs text-gray-400">Renseignez les informations du nouvel admin</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Nom complet *</label>
                <input type="text" value={form.fullName} onChange={set('fullName')} className={inputClass('fullName')} placeholder="Jean Dupont" />
                {errors.fullName && <p className="text-xs text-red-500 mt-1 animate-in-fast">{errors.fullName}</p>}
              </div>
              <div>
                <label className="input-label">Nom d'utilisateur *</label>
                <input type="text" value={form.username} onChange={set('username')} className={inputClass('username')} placeholder="jean.dupont" />
                {errors.username && <p className="text-xs text-red-500 mt-1 animate-in-fast">{errors.username}</p>}
              </div>
              <div>
                <label className="input-label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email *</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputClass('email')} placeholder="jean@exemple.com" />
                {errors.email && <p className="text-xs text-red-500 mt-1 animate-in-fast">{errors.email}</p>}
              </div>
              <div>
                <label className="input-label flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-gray-400" /> Mot de passe *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`${inputClass('password')} pr-10`} placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1 animate-in-fast">{errors.password}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={nextStep} className="btn-primary">
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Plan */}
        {step === 1 && (
          <div className="card p-6 space-y-5 animate-in">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Plan d'abonnement</h2>
                <p className="text-xs text-gray-400">Choisissez le plan adapté à cet admin</p>
              </div>
            </div>

            {plansLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0,1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-10 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-amber-800">Aucun plan actif</p>
                <p className="text-xs text-amber-600 mt-1">Créez d'abord un plan dans la section "Plans"</p>
                <button type="button" onClick={() => navigate('/plans')} className="btn-primary mt-4 !bg-amber-600 !shadow-amber-600/20 hover:!bg-amber-700">Créer un plan</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map(plan => {
                  const isSelected = form.planId === plan._id
                  return (
                    <button
                      key={plan._id} type="button"
                      onClick={() => setForm(f => ({ ...f, planId: plan._id }))}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-300 bg-primary-50/50 ring-2 ring-primary-300/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-sm shadow-primary-500/25 animate-scale-in">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold tracking-tight ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{plan.price}</span>
                        <span className="text-sm text-gray-400">&euro;</span>
                      </div>
                      <p className={`text-sm font-semibold mt-1 ${isSelected ? 'text-primary-600' : 'text-gray-700'}`}>{plan.name}</p>
                      {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {getDurationLabel(plan)}
                          {plan.isRecurring && plan.durationType !== 'lifetime' && <Badge variant="info" className="text-[9px] py-0">récurrent</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                          <strong>{plan.maxProjects}</strong> business max
                        </div>
                      </div>

                      {plan.features?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                          {plan.features.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400">
                              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" /> {f}
                            </div>
                          ))}
                          {plan.features.length > 3 && <p className="text-[11px] text-gray-400">+{plan.features.length - 3} autre(s)</p>}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button type="button" onClick={prevStep} className="btn-ghost">Retour</button>
              <button type="button" onClick={nextStep} className="btn-primary" disabled={!form.planId}>
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment + Summary */}
        {step === 2 && (
          <div className="space-y-5 animate-in">
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Mode de paiement</h2>
                  <p className="text-xs text-gray-400">Comment cet admin va-t-il payer ?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon
                  const isSelected = form.paymentMethod === method.id
                  const cls = ACCENT_CLASSES[method.accent]
                  return (
                    <button
                      key={method.id} type="button"
                      onClick={() => setForm(f => ({ ...f, paymentMethod: method.id }))}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected ? `${cls.selected} ring-2` : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isSelected ? cls.icon : 'bg-gray-50 text-gray-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{method.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{method.desc}</p>
                    </button>
                  )
                })}
              </div>

              <div>
                <label className="input-label flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> Notes (optionnel)</label>
                <textarea value={form.notes} onChange={set('notes')} rows={2} className="input-field resize-none" placeholder="Notes internes..." />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-dark-950 to-dark-900 rounded-2xl p-6 text-white animate-in stagger-1">
              <h3 className="font-semibold text-base mb-4">Récapitulatif</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Admin</span>
                  <span className="font-medium">{form.fullName || '...'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Email</span>
                  <span className="font-medium">{form.email || '...'}</span>
                </div>
                <div className="border-t border-white/10 my-2" />
                {selectedPlan ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Plan</span>
                      <span className="font-medium">{selectedPlan.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Prix</span>
                      <span className="font-semibold text-lg">{selectedPlan.price}&euro;</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Durée</span>
                      <span className="font-medium">{getDurationLabel(selectedPlan)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Business max</span>
                      <span className="font-medium">{selectedPlan.maxProjects}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-amber-300 text-sm">Aucun plan sélectionné</p>
                )}
                <div className="border-t border-white/10 my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Paiement</span>
                  <span className="font-medium">{selectedMethod?.label}</span>
                </div>
              </div>

              <div className="mt-5 p-4 bg-white/[0.07] rounded-xl text-sm leading-relaxed border border-white/[0.05]">
                {form.paymentMethod === 'card' ? (
                  <p className="flex items-start gap-2.5"><Link2 className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" /> Un lien de paiement Stripe sera envoyé par email. Le compte sera activé après paiement.</p>
                ) : (
                  <p className="flex items-start gap-2.5"><Send className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" /> Les identifiants de connexion seront envoyés par email immédiatement.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={prevStep} className="btn-ghost">Retour</button>
              <button type="submit" disabled={loading || !form.planId} className="btn-primary px-6">
                {loading ? (
                  <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création...</span>
                ) : (
                  <>{form.paymentMethod === 'card' ? 'Créer & Envoyer le lien' : 'Créer & Envoyer les identifiants'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
