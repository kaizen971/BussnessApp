import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react'

// ============= CONFIRM DIALOG =============

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirmer', cancelText = 'Annuler', variant = 'danger', loading = false }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus()
      const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleEsc)
        document.body.style.overflow = ''
      }
    }
  }, [open, onClose])

  if (!open) return null

  const iconMap = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    info: <Info className="w-6 h-6 text-gold-500" />,
    success: <CheckCircle className="w-6 h-6 text-gold-400" />,
  }

  const btnMap = {
    danger: 'bg-danger hover:brightness-110 active:brightness-95 text-white focus-visible:ring-red-500/30',
    warning: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white focus-visible:ring-amber-500/30',
    info: 'bg-gradient-gold-deep text-night-950 hover:brightness-110 focus-visible:ring-gold-500/30',
    success: 'bg-gradient-gold-deep text-night-950 hover:brightness-110 focus-visible:ring-gold-500/30',
  }

  const bgMap = {
    danger: 'bg-red-500/10',
    warning: 'bg-amber-500/10',
    info: 'bg-gold-500/10',
    success: 'bg-gold-500/10',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative bg-night-800 border border-night-600 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 ${bgMap[variant]} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {iconMap[variant]}
          </div>
          <h3 className="text-lg font-semibold text-cream">{title}</h3>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-night-700 hover:bg-night-600 active:bg-night-500 rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ${btnMap[variant]}`}
          >
            {loading ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{confirmText}</span> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============= SKELETON =============

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="divide-y divide-night-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ animationDelay: `${i * 50}ms` }}>
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton key={j} className={`h-3.5 flex-1 ${j === 0 ? 'max-w-[180px]' : 'max-w-[120px]'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============= EMPTY STATE =============

export function EmptyState({ icon: Icon, title, description, action, actionLabel, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center animate-in ${className}`}>
      <div className="w-20 h-20 bg-gradient-to-br from-night-700 to-night-800 rounded-2xl flex items-center justify-center mb-5 border border-night-600">
        {Icon && <Icon className="w-8 h-8 text-gold-500/60" />}
      </div>
      <h3 className="text-base font-semibold text-gray-200">{title}</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button onClick={action} className="btn-primary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ============= PAGE HEADER =============

export function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-cream tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">{children}</div>}
    </div>
  )
}

// ============= BADGE =============

const BADGE_VARIANTS = {
  success: 'bg-gold-500/10 text-gold-400 ring-gold-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  info: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  neutral: 'bg-white/5 text-gray-400 ring-white/10',
  purple: 'bg-premium/10 text-premium-light ring-premium/25',
  gold: 'bg-gold-500/15 text-gold-400 ring-gold-500/30',
}

export function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'success' || variant === 'gold' ? 'bg-gold-400' : variant === 'danger' ? 'bg-red-400' : variant === 'warning' ? 'bg-amber-400' : variant === 'purple' ? 'bg-premium-light' : 'bg-gray-400'}`} />}
      {children}
    </span>
  )
}

// ============= MODAL =============

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleEsc)
        document.body.style.overflow = ''
      }
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={`relative bg-night-800 border border-night-600 rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-night-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-cream">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-night-700 text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============= STAT CARD =============

export function Stat({ label, value, sub, icon: Icon, color = 'bg-gradient-gold-deep', iconClass = 'text-night-950', onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`card-hover p-5 group animate-in text-left w-full ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-400 font-medium">{label}</p>
          <p className="text-[26px] font-bold text-cream mt-1.5 tracking-tight leading-none truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
          {Icon && <Icon className={`w-5 h-5 ${iconClass}`} />}
        </div>
      </div>
    </Tag>
  )
}

// ============= TAB BAR =============

export function TabBar({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-night-800 border border-night-600/60 rounded-xl overflow-x-auto scrollbar-thin ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 min-w-fit px-4 py-2 text-[13px] font-medium rounded-lg whitespace-nowrap transition-all ${
            active === tab.key
              ? 'bg-gradient-gold-deep text-night-950 shadow-gold-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ============= SPINNER =============

export function Spinner({ className = 'w-6 h-6' }) {
  return <span className={`inline-block border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin ${className}`} />
}

export function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-night-900">
      <div className="w-12 h-12 bg-gradient-gold-deep rounded-2xl flex items-center justify-center shadow-gold animate-pulse">
        <span className="w-5 h-5 border-[2.5px] border-night-950/25 border-t-night-950 rounded-full animate-spin" />
      </div>
    </div>
  )
}
