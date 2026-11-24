import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Users, LayoutGrid, Tag, Boxes, Settings, Rocket,
  Check, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'
import { PageHeader } from '../components/ui'

const STEPS = [
  {
    id: 1,
    title: 'Créer votre business',
    icon: Briefcase,
    description: "Configurez l'identité de votre commerce.",
    details: [
      'Depuis la page "Mes business", cliquez sur "Nouveau business".',
      "Renseignez le nom, la devise et le secteur d'activité.",
      '(Admin uniquement) Ajoutez un logo pour personnaliser votre espace.',
    ],
    action: 'Aller aux Projets',
    route: '/projets',
  },
  {
    id: 2,
    title: 'Ajouter votre équipe',
    icon: Users,
    description: 'Invitez vos collaborateurs.',
    details: [
      'Accédez au menu "Équipe".',
      'Ajoutez un membre avec son rôle (manager, vendeur...).',
      "Définissez son niveau d'accès (lecture, ventes, admin).",
      '(Admin uniquement) Personnalisez la photo de profil de chaque membre.',
    ],
    action: "Gérer l'équipe",
    route: '/equipe',
  },
  {
    id: 3,
    title: 'Créer les catégories',
    icon: LayoutGrid,
    description: 'Organisez vos produits et services.',
    details: [
      'Dans le menu "Catégories", créez des familles : Soins, Boissons, Accessoires...',
      'Cela facilitera la navigation lors des ventes.',
    ],
    action: 'Créer une catégorie',
    route: '/categories',
  },
  {
    id: 4,
    title: 'Ajouter vos produits',
    icon: Tag,
    description: 'Remplissez votre catalogue.',
    details: [
      'Ajoutez vos produits ou services un par un.',
      'Indiquez le nom, le prix unitaire et la catégorie.',
      'Ajoutez une description si nécessaire.',
    ],
    action: 'Ajouter un produit',
    route: '/produits',
  },
  {
    id: 5,
    title: 'Configurer le stock',
    icon: Boxes,
    description: 'Initialisez vos quantités.',
    details: [
      'Dans le menu "Stock", ajustez les quantités disponibles.',
      'Vous pourrez ensuite suivre les entrées et sorties.',
      'Gérez les réapprovisionnements facilement.',
    ],
    action: 'Gérer le Stock',
    route: '/stock',
  },
  {
    id: 6,
    title: 'Paramètres de vente',
    icon: Settings,
    description: "Personnalisez l'expérience de vente.",
    details: [
      'Activez les retours ou annulations si besoin.',
      "Configurez l'affichage de l'historique pour les employés.",
      "Gérez les options d'export et de partage de tickets.",
    ],
    action: 'Tableau de bord',
    route: '/',
  },
  {
    id: 8,
    title: 'Lancer votre activité',
    icon: Rocket,
    description: 'Vous êtes prêt !',
    details: [
      'Enregistrez vos premières ventes.',
      'Suivez vos performances en temps réel.',
      'Exportez vos données comptables.',
    ],
    action: 'Commencer',
    route: '/',
  },
]

export default function TutorialPage() {
  const navigate = useNavigate()
  const [expandedStep, setExpandedStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])

  const toggleStep = (index) => setExpandedStep(expandedStep === index ? null : index)

  const markAsDone = (index) => {
    if (!completedSteps.includes(index)) {
      setCompletedSteps([...completedSteps, index])
      if (index < STEPS.length - 1) {
        setExpandedStep(index + 1)
      }
    }
  }

  const progress = Math.round((completedSteps.length / STEPS.length) * 100)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[860px] mx-auto">
      <PageHeader
        title="Tutoriel de Démarrage"
        description="Suivez ces étapes pour configurer votre espace de gestion et lancer votre activité sereinement."
      />

      {/* Barre de progression */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-gray-300">{progress}% complété</p>
          <p className="text-[12px] text-gray-500">{completedSteps.length}/{STEPS.length} étapes</p>
        </div>
        <div className="h-2 rounded-full bg-night-700 overflow-hidden">
          <div className="h-full bg-gradient-gold-deep rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Étapes */}
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isExpanded = expandedStep === index
          const isCompleted = completedSteps.includes(index)
          const Icon = step.icon
          return (
            <div key={step.id} className={`card overflow-hidden transition-all ${isExpanded ? '!border-gold-500/40' : ''}`}>
              <button onClick={() => toggleStep(index)} className="flex items-center gap-4 w-full p-4 text-left">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isCompleted ? 'bg-gold-500' : isExpanded ? 'bg-gradient-gold-deep' : 'bg-night-700'
                }`}>
                  {isCompleted
                    ? <Check className="w-5 h-5 text-night-950" />
                    : <Icon className={`w-5 h-5 ${isExpanded ? 'text-night-950' : 'text-gray-400'}`} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-cream'}`}>
                    {step.title}
                  </span>
                  <span className="block text-[13px] text-gray-500 mt-0.5">{step.description}</span>
                </span>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pl-[76px] animate-in-fast">
                  <ul className="space-y-1.5 mb-4">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-gray-400 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-[7px] flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => navigate(step.route)} className="btn-primary !py-2">
                      {step.action}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {!isCompleted && (
                      <button onClick={() => markAsDone(index)} className="btn-ghost">
                        Marquer comme fait
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-600 text-center pb-4">Besoin d'aide supplémentaire ? Contactez le support.</p>
    </div>
  )
}
