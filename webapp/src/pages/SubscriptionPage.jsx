import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Leaf, Star, Gem, Calendar, Building2, CheckCircle2, Clock, RefreshCw, CreditCard,
} from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { subscriptionAPI } from '../services/api'
import { FullPageLoader, Spinner } from '../components/ui'

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' }

const TIER_CONFIG = {
  free: { icon: Leaf, gradient: 'from-night-600 to-night-800', label: 'Gratuit' },
  basic: { icon: Star, gradient: 'from-gold-500 to-gold-700', label: 'Basic' },
  premium: { icon: Gem, gradient: 'from-premium to-[#6D28D9]', label: 'Premium' },
}

function getDurationLabel(plan) {
  if (plan.durationType === 'lifetime') return 'À vie'
  return `${plan.duration} ${DURATION_LABELS[plan.durationType] || plan.durationType}`
}

export default function SubscriptionPage() {
  const { subscription, plans, loading, isPremium, refreshSubscription } = useSubscription()
  const [searchParams, setSearchParams] = useSearchParams()
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const highlightedPlanId = searchParams.get('plan')
  const canceledShown = useRef(false)

  useEffect(() => {
    if (searchParams.get('canceled') === '1' && !canceledShown.current) {
      canceledShown.current = true
      toast('Paiement annulé. Vous pouvez réessayer quand vous voulez.', { icon: 'ℹ️' })
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('canceled')
        return next
      }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshSubscription()
    setRefreshing(false)
  }

  const handleSubscribe = async (plan) => {
    setCheckoutLoading(plan._id)
    try {
      const res = await subscriptionAPI.createCheckout(plan._id)
      if (res.data.activated) {
        toast.success('Votre plan gratuit est activé !')
        await refreshSubscription()
      } else if (res.data.url) {
        // Redirection vers Stripe Checkout
        window.location.href = res.data.url
        return
      }
    } catch (error) {
      console.error('Erreur checkout:', error)
      toast.error(error.response?.data?.error || 'Impossible de démarrer le paiement. Réessayez.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  if (loading) return <FullPageLoader />

  const currentTier = isPremium ? 'premium' : subscription?.hasSubscription ? 'basic' : 'free'
  const tierCfg = TIER_CONFIG[currentTier]
  const TierIcon = tierCfg.icon

  const totalDays = subscription?.endDate && subscription?.startDate
    ? Math.max(1, Math.ceil((new Date(subscription.endDate) - new Date(subscription.startDate)) / (1000 * 60 * 60 * 24)))
    : null
  const progressPct = subscription?.daysLeft !== null && totalDays
    ? Math.max(5, Math.min(100, (subscription.daysLeft / totalDays) * 100))
    : 100

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-[1100px] mx-auto">
      {/* Plan actuel */}
      <div className={`rounded-2xl p-6 bg-gradient-to-br ${tierCfg.gradient} animate-in`}>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <TierIcon className="w-6 h-6 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Votre plan actuel</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{subscription?.planLabel || tierCfg.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white ${
              isPremium ? 'bg-emerald-400/25' : 'bg-white/15'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPremium ? 'bg-emerald-300' : 'bg-white'}`} />
              {isPremium ? 'Actif' : subscription?.status === 'pending_payment' ? 'En attente' : 'Inactif'}
            </span>
            <button onClick={onRefresh} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="Actualiser">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {subscription?.hasSubscription ? (
          <div className="mt-5 pt-5 border-t border-white/15 space-y-2">
            <p className="flex items-center gap-2 text-sm text-white/85">
              <Calendar className="w-4 h-4 text-white/70" />
              {subscription.daysLeft !== null ? `${subscription.daysLeft} jours restants` : 'Illimité'}
            </p>
            <p className="flex items-center gap-2 text-sm text-white/85">
              <Building2 className="w-4 h-4 text-white/70" />
              {subscription.maxProjects} business max
            </p>
            {subscription.endDate && (
              <div className="pt-2">
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-[11px] text-white/60 mt-1.5 font-medium">
                  Expire le {new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-5 pt-5 border-t border-white/15 text-sm text-white/70 leading-relaxed">
            {subscription?.status === 'pending_payment'
              ? 'Votre paiement est en cours de traitement. Vous serez notifié par email.'
              : "Vous n'avez pas d'abonnement actif. Choisissez un plan ci-dessous pour souscrire en ligne."}
          </p>
        )}
      </div>

      {/* Fonctionnalités incluses */}
      {subscription?.features?.length > 0 && (
        <section className="animate-in stagger-1">
          <h2 className="text-lg font-bold text-cream mb-3">Fonctionnalités incluses</h2>
          <div className="card p-4 grid gap-1 sm:grid-cols-2">
            {subscription.features.map((f, i) => (
              <p key={i} className="flex items-center gap-3 py-2 text-sm text-gray-200 font-medium">
                <span className="w-6 h-6 rounded-full bg-gold-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold-500" />
                </span>
                {f}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Plans disponibles */}
      {plans.length > 0 && (
        <section className="animate-in stagger-2">
          <h2 className="text-lg font-bold text-cream">Plans disponibles</h2>
          <p className="text-[13px] text-gray-500 mb-4">Comparez les offres et payez en ligne en toute sécurité</p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            {plans.map((plan) => {
              const tier = plan.tier || 'basic'
              const cfg = TIER_CONFIG[tier] || TIER_CONFIG.basic
              const isCurrent = subscription?.planLabel === plan.name && subscription?.status === 'active'
              const isHighlighted = highlightedPlanId === plan._id
              return (
                <div
                  key={plan._id}
                  className={`card overflow-hidden transition-all ${
                    isCurrent ? '!border-gold-500' : isHighlighted ? '!border-premium shadow-premium' : ''
                  }`}
                >
                  <div className={`p-5 bg-gradient-to-r ${cfg.gradient}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white truncate">{plan.name}</p>
                        {plan.description && <p className="text-[12px] text-white/70 mt-0.5">{plan.description}</p>}
                      </div>
                      <p className="flex items-baseline flex-shrink-0">
                        <span className="text-[26px] font-extrabold text-white">{plan.price}</span>
                        <span className="text-base font-semibold text-white/80 ml-0.5">€</span>
                        <span className="text-[11px] text-white/60 ml-1">/{getDurationLabel(plan)}</span>
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Plan actuel
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-2.5">
                    <p className="flex items-center gap-2.5 text-sm text-gray-200">
                      <Building2 className="w-4 h-4 text-gold-500" />
                      <strong>{plan.maxProjects}</strong> business max
                    </p>
                    <p className="flex items-center gap-2.5 text-sm text-gray-200">
                      <Clock className="w-4 h-4 text-gold-500" />
                      {getDurationLabel(plan)} {plan.isRecurring ? '(renouvelable)' : ''}
                    </p>
                    {plan.features?.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-night-700 space-y-2">
                        {plan.features.map((f, i) => (
                          <p key={i} className="flex items-center gap-2 text-[13px] text-gray-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {f}
                          </p>
                        ))}
                      </div>
                    )}
                    {!isCurrent && (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={checkoutLoading !== null}
                        className={`w-full !py-3 mt-3 ${tier === 'premium' ? 'inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold rounded-xl bg-gradient-premium text-white shadow-premium hover:brightness-110 transition-all disabled:opacity-50' : 'btn-primary'}`}
                      >
                        {checkoutLoading === plan._id ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            {plan.price === 0 ? 'Activer gratuitement' : "S'abonner"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <p className="text-[12px] text-gray-600 text-center pb-4">
        Paiement sécurisé par Stripe. Une question ? Contactez le support.
      </p>
    </div>
  )
}
