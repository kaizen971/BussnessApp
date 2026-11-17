import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Settings2, RefreshCw, Check, CheckCheck, Moon, Zap, Loader2 } from 'lucide-react'
import { Badge, Modal, SkeletonRow } from './ui'
import api from '../services/api'

const TABS = [
  { key: 'pending', label: 'À traiter' },
  { key: 'ongoing', label: 'Inactifs en cours' },
  { key: 'all', label: 'Historique' },
]

const RESOLUTION_LABELS = {
  reactivated: 'activité reprise',
  account_disabled: 'compte désactivé',
  threshold_changed: 'seuil modifié',
  account_deleted: 'compte supprimé',
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function plural(n, word) {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}

function SettingsModal({ open, onClose, settings, onSaved }) {
  const [enabled, setEnabled] = useState(true)
  const [days, setDays] = useState(14)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && settings) {
      setEnabled(settings.enabled)
      setDays(settings.inactivityDays)
      setError('')
    }
  }, [open, settings])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/backoffice/activity-alerts/settings', { enabled, inactivityDays: Number(days) })
      onSaved(res.data.settings)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Réglages des alertes d'activité" size="sm">
      <form onSubmit={save} className="p-6 space-y-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-800">Alertes activées</p>
            <p className="text-xs text-gray-400 mt-0.5">Vérification automatique toutes les heures</p>
          </div>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-5 h-5 accent-primary-500" />
        </label>
        <div>
          <label className="input-label" htmlFor="inactivity-days">Seuil d'inactivité (jours)</label>
          <input
            id="inactivity-days" type="number" min={1} max={365} step={1} required
            value={days} onChange={e => setDays(e.target.value)} className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Une alerte est levée quand un client (le propriétaire ou son équipe) n'a ni utilisé l'application ni
            enregistré de vente depuis ce nombre de jours. Une seule alerte par période d'inactivité.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function ActivityAlertsPanel({ onCountsChange }) {
  const [tab, setTab] = useState('pending')
  const [data, setData] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (which = tab) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/backoffice/activity-alerts', { params: { status: which, limit: 100 } })
      setData(res.data)
      onCountsChange?.(res.data.counts)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les alertes')
    } finally {
      setLoading(false)
    }
  }, [tab, onCountsChange])

  useEffect(() => { load(tab) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/backoffice/activity-alerts/settings').then(res => setSettings(res.data)).catch(() => {})
  }, [])

  const acknowledge = async (ids) => {
    if (!ids.length) return
    try {
      await api.post('/backoffice/activity-alerts/acknowledge', { ids })
      await load(tab)
    } catch (err) {
      setError(err.response?.data?.error || 'Action impossible')
    }
  }

  const runNow = async () => {
    setRunning(true)
    try {
      await api.post('/backoffice/activity-alerts/run')
      await load(tab)
    } catch (err) {
      setError(err.response?.data?.error || 'Vérification impossible')
    } finally {
      setRunning(false)
    }
  }

  const alerts = data?.alerts || []
  const openIds = alerts.filter(a => a.status === 'open').map(a => a._id)
  const counts = data?.counts || { inactivity: 0, reactivation: 0 }

  return (
    <div className="card animate-in" id="activity-alerts">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <BellRing className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-gray-900 text-[15px]">Suivi d'activité clients</h2>
          {settings && (
            <Badge variant={settings.enabled ? 'neutral' : 'warning'}>
              {settings.enabled ? `Seuil : ${plural(settings.inactivityDays, 'jour')}` : 'Désactivé'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {tab === 'pending' && openIds.length > 1 && (
            <button onClick={() => acknowledge(openIds)} className="btn-ghost text-xs py-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Tout marquer traité
            </button>
          )}
          <button onClick={runNow} disabled={running} className="btn-ghost text-xs py-1.5" title="Lancer la vérification maintenant">
            <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} /> Vérifier
          </button>
          <button onClick={() => setSettingsOpen(true)} className="btn-ghost text-xs py-1.5" title="Réglages">
            <Settings2 className="w-3.5 h-3.5" /> Réglages
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-5 pt-3">
        {TABS.map(t => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t.label}
            {t.key === 'pending' && counts.inactivity + counts.reactivation > 0 && ` (${counts.inactivity + counts.reactivation})`}
            {t.key === 'ongoing' && data?.ongoingInactive > 0 && ` (${data.ongoingInactive})`}
          </button>
        ))}
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-gray-100/60 max-h-[420px] overflow-y-auto scrollbar-thin mt-2">
        {loading && !data ? (
          [0, 1, 2].map(i => <SkeletonRow key={i} />)
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BellRing className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {tab === 'pending' ? 'Aucune alerte à traiter' : tab === 'ongoing' ? 'Aucun client inactif' : 'Aucune alerte'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Les clients inactifs et les reprises d'activité s'afficheront ici</p>
          </div>
        ) : (
          alerts.map(alert => {
            const inactivity = alert.type === 'inactivity'
            const name = alert.admin ? (alert.admin.fullName || alert.admin.username) : 'Client supprimé'
            return (
              <div key={alert._id} className="flex items-center gap-3.5 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${inactivity ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {inactivity ? <Moon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {alert.admin
                      ? <Link to={`/admins/${alert.admin._id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate">{name}</Link>
                      : <span className="text-sm font-semibold text-gray-400">{name}</span>}
                    {inactivity
                      ? <Badge variant="warning">Inactif depuis {plural(alert.inactiveDays ?? 0, 'jour')}</Badge>
                      : <Badge variant="success">Activité reprise</Badge>}
                    {alert.status === 'acknowledged' && <Badge variant="neutral">Traitée</Badge>}
                    {alert.status === 'resolved' && <Badge variant="neutral">Clôturée · {RESOLUTION_LABELS[alert.resolution] || 'résolue'}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {inactivity
                      ? `Dernière activité le ${formatDate(alert.lastActivityAt)} · alerte du ${formatDate(alert.createdAt)}`
                      : `De retour le ${formatDate(alert.lastActivityAt)} après ${plural(alert.inactiveDays ?? 0, 'jour')} d'inactivité`}
                    {alert.admin?.email && ` · ${alert.admin.email}`}
                  </p>
                </div>
                {alert.status === 'open' && (
                  <button onClick={() => acknowledge([alert._id])} className="btn-ghost text-xs py-1.5 flex-shrink-0" title="Marquer comme traitée">
                    <Check className="w-3.5 h-3.5" /> Traité
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <SettingsModal
        open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings}
        onSaved={(s) => { setSettings(s); load(tab) }}
      />
    </div>
  )
}
