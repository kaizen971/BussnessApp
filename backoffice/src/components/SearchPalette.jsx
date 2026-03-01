import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, Users, CreditCard, Package, UserPlus, ArrowRight, CornerDownLeft } from 'lucide-react'

const STATIC_ROUTES = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/', keywords: 'accueil home stats' },
  { id: 'admins', label: 'Administrateurs', desc: 'Gérer les admins', icon: Users, path: '/admins', keywords: 'utilisateurs users gestion' },
  { id: 'new-admin', label: 'Créer un admin', desc: 'Nouveau compte administrateur', icon: UserPlus, path: '/admins/new', keywords: 'ajouter nouveau create' },
  { id: 'plans', label: 'Plans d\'abonnement', desc: 'Gérer les plans et tarifs', icon: Package, path: '/plans', keywords: 'prix tarif subscription' },
  { id: 'subscriptions', label: 'Abonnements', desc: 'Suivi des abonnements', icon: CreditCard, path: '/subscriptions', keywords: 'paiements stripe facturation' },
]

export default function SearchPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    if (!query.trim()) return STATIC_ROUTES
    const q = query.toLowerCase()
    return STATIC_ROUTES.filter(r =>
      r.label.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      r.keywords.includes(q)
    )
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) {
        navigate(results[selected].path)
        onClose()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, results, selected, navigate, onClose])

  useEffect(() => {
    const el = listRef.current?.children[selected]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-200/50">
        <div className="flex items-center gap-3 px-5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une page, une action..."
            className="flex-1 py-4 text-[15px] bg-transparent outline-none placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-md border border-gray-200">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[340px] overflow-y-auto scrollbar-thin py-2">
          {results.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun résultat pour "{query}"</p>
            </div>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => { navigate(item.path); onClose() }}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex items-center gap-3.5 w-full px-5 py-3 text-left transition-all ${
                    i === selected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    i === selected ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${i === selected ? 'text-primary-700' : 'text-gray-800'}`}>{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                  </div>
                  {i === selected && <ArrowRight className="w-4 h-4 text-primary-400 flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <CornerDownLeft className="w-3 h-3" /> ouvrir
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="font-mono">↑↓</span> naviguer
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="font-mono">esc</span> fermer
          </div>
        </div>
      </div>
    </div>
  )
}
