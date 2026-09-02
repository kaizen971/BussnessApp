import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Clock, PartyPopper, RefreshCw } from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { subscriptionAPI } from '../services/api'
import { Spinner } from '../components/ui'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 15 // ~30 s

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshSubscription } = useSubscription()
  const sessionId = searchParams.get('session_id')
  // 'pending' → attente du webhook Stripe ; 'active' → abonnement activé ; 'timeout' → activation en cours
  const [status, setStatus] = useState('pending')
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!sessionId) {
      navigate('/abonnement', { replace: true })
      return
    }

    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      attemptsRef.current += 1
      try {
        const res = await subscriptionAPI.getCheckoutStatus(sessionId)
        if (res.data.status === 'active') {
          await refreshSubscription()
          if (!cancelled) setStatus('active')
          return
        }
      } catch (err) {
        console.error('Checkout status error:', err)
      }
      if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        if (!cancelled) setStatus('timeout')
        return
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const retry = () => {
    attemptsRef.current = 0
    setStatus('pending')
    // Relance le polling en re-naviguant sur la même URL
    navigate(0)
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-in">
        {status === 'pending' && (
          <>
            <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Spinner className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-extrabold text-cream">Paiement reçu !</h1>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              Nous activons votre abonnement, cela ne prend que quelques secondes...
            </p>
          </>
        )}

        {status === 'active' && (
          <>
            <div className="w-20 h-20 bg-gradient-gold-deep rounded-full flex items-center justify-center mx-auto mb-6 shadow-gold">
              <PartyPopper className="w-9 h-9 text-night-950" />
            </div>
            <h1 className="text-2xl font-extrabold text-gradient-gold">Abonnement activé !</h1>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              Félicitations ! Toutes les fonctionnalités de votre plan sont maintenant débloquées.
            </p>
            <div className="card p-4 mt-6 text-left space-y-2.5">
              {['Simulation Business Plan', 'Gestion de stock', 'CRM Clients', "Équipe & Paie", 'Planning', 'Commissions'].map(f => (
                <p key={f} className="flex items-center gap-2.5 text-[13px] text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                  {f}
                </p>
              ))}
            </div>
            <Link to="/" className="btn-primary w-full !py-3.5 mt-6">Accéder au tableau de bord</Link>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-9 h-9 text-amber-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-cream">Paiement reçu, activation en cours</h1>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              Votre paiement a bien été reçu. L'activation peut prendre quelques minutes —
              vous recevrez un email de confirmation.
            </p>
            <div className="space-y-3 mt-6">
              <button onClick={retry} className="btn-primary w-full !py-3">
                <RefreshCw className="w-4 h-4" />
                Vérifier à nouveau
              </button>
              <Link to="/abonnement" className="btn-ghost w-full">Voir mon abonnement</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
