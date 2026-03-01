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
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
  }

  const btnMap = {
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500/30',
    warning: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-amber-500/30',
    info: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus-visible:ring-blue-500/30',
    success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 focus-visible:ring-emerald-500/30',
  }

  const bgMap = {
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-blue-50',
    success: 'bg-emerald-50',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 ${bgMap[variant]} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {iconMap[variant]}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all disabled:opacity-50 ${btnMap[variant]}`}
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

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
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
    <div className="divide-y divide-gray-50">
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
      <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
        {Icon && <Icon className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">{description}</p>
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-shrink-0">{children}</div>}
    </div>
  )
}

// ============= BADGE =============

const BADGE_VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  danger: 'bg-red-50 text-red-700 ring-red-600/10',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  neutral: 'bg-gray-50 text-gray-600 ring-gray-500/10',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/10',
}

export function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'success' ? 'bg-emerald-500' : variant === 'danger' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-500' : variant === 'info' ? 'bg-blue-500' : 'bg-gray-400'}`} />}
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
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

// ============= TOOLTIP (simple) =============

export function Stat({ label, value, sub, icon: Icon, color = 'bg-primary-500', to, className = '' }) {
  const Tag = to ? 'a' : 'div'
  return (
    <Tag href={to} className={`card-hover p-5 group animate-in ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className="text-[26px] font-bold text-gray-900 mt-1.5 tracking-tight leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
      </div>
    </Tag>
  )
}
