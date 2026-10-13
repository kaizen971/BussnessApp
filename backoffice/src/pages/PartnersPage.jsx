import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Tag, Users, UserCheck, CreditCard, ChevronRight, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader, SkeletonTable, EmptyState, Stat } from '../components/ui'
import api from '../services/api'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function percent(part, total) {
  if (!total) return '0 %'
  return `${Math.round((part / total) * 100)} %`
}

export default function PartnersPage() {
  const [data, setData] = useState({ partners: [], totalSignups: 0, partnerSignups: 0 })
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    api.get('/backoffice/partners/stats', { params })
      .then(res => setData(res.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [from, to])

  const exportCsv = () => {
    const header = ['Code', 'Inscriptions', 'Comptes actifs', 'Abonnements actifs', 'Première inscription', 'Dernière inscription']
    const rows = data.partners.map(p => [p.code, p.signups, p.activeAccounts, p.activeSubscriptions, formatDate(p.firstSignup), formatDate(p.lastSignup)])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codes-partenaires${from ? `-${from}` : ''}${to ? `-${to}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { partners, totalSignups, partnerSignups } = data

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader title="Partenaires" description="Inscriptions générées par chaque code promo / code partenaire">
        <button onClick={exportCsv} disabled={!partners.length} className="btn-secondary">
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 animate-in stagger-1">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Inscrits depuis le</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Jusqu'au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="text-xs font-semibold text-gray-500 hover:text-gray-700 pb-3">
            Réinitialiser
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in stagger-1">
        <Stat label="Codes partenaires utilisés" value={partners.length} icon={Tag} />
        <Stat label="Inscriptions via un code" value={partnerSignups} sub={`${percent(partnerSignups, totalSignups)} des inscriptions`} icon={Users} color="bg-emerald-500" />
        <Stat label="Inscriptions totales" value={totalSignups} icon={UserCheck} color="bg-gray-500" />
      </div>

      <div className="card overflow-hidden animate-in stagger-2">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : partners.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Aucune inscription avec un code partenaire"
            description="Les codes saisis à l'inscription (ou via un lien /register?code=XXX) apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Code</th>
                  <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Inscriptions</th>
                  <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Comptes actifs</th>
                  <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Abonnements actifs</th>
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Dernière inscription</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {partners.map((p, i) => (
                  <tr key={p.code} className="hover:bg-primary-50/30 transition-colors group animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-5 py-3.5">
                      <Link to={`/admins?partner=${encodeURIComponent(p.code)}`} className="inline-flex items-center gap-2 font-semibold text-sm text-gray-900 group-hover:text-primary-600">
                        <Tag className="w-4 h-4 text-primary-500" /> {p.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900">{p.signups}</td>
                    <td className="px-5 py-3.5 text-right text-sm text-gray-700 hidden md:table-cell">{p.activeAccounts}</td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" /> {p.activeSubscriptions}
                        <span className="text-[11px] text-gray-400">({percent(p.activeSubscriptions, p.signups)})</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 hidden lg:table-cell">{formatDate(p.lastSignup)}</td>
                    <td className="px-5 py-3.5">
                      <Link to={`/admins?partner=${encodeURIComponent(p.code)}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 inline-flex" title="Voir les inscrits">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
