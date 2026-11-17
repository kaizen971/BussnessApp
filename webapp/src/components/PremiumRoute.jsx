import { useSubscription } from '../contexts/SubscriptionContext'
import { FullPageLoader } from './ui'
import PaywallPage from '../pages/PaywallPage'

// Équivalent web du PremiumGate de frontend/App.js : si l'écran est réservé
// aux abonnés et que l'utilisateur n'a pas d'abonnement actif, on affiche
// le paywall à la place de la page.
export default function PremiumRoute({ screenKey, featureName, children }) {
  const { canAccessScreen, loading } = useSubscription()

  if (loading) return <FullPageLoader />
  if (!canAccessScreen(screenKey)) {
    return <PaywallPage featureName={featureName} />
  }

  return children
}
