import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Calculator, Save, TrendingUp, CalendarDays, BarChart3, CheckCircle2,
  AlertCircle, Info, LineChart as LineChartIcon,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { simulationAPI } from '../services/api'
import { Spinner } from '../components/ui'
import { SERIES, CHART_TEXT, TOOLTIP_STYLE } from '../utils/chartTheme'

const STORAGE_KEY = '@simulation_last_business_plan'

const EMPTY_FORM = {
  productName: '', unitPrice: '', costPrice: '', variableCosts: '',
  initialInvestment: '', monthlyRent: '', monthlySalaries: '', monthlyMarketing: '',
  monthlySupplies: '', monthlySubscriptions: '', monthlyUtilities: '', otherMonthlyCosts: '',
  estimatedMonthlySales: '', analysisPeriodMonths: '6',
}

const PRODUCT_FIELDS = [
  ['productName', 'Nom du produit/service', 'Ex: T-shirt personnalisé', 'text'],
  ['unitPrice', 'Prix de vente unitaire *', '0.00', 'number'],
  ['costPrice', 'Coût de fabrication/achat unitaire *', '0.00', 'number'],
  ['variableCosts', 'Coûts variables unitaires (livraison, emballage...)', '0.00', 'number'],
]

const MONTHLY_FIELDS = [
  ['monthlyRent', 'Loyer'],
  ['monthlySalaries', 'Salaires / Commissions'],
  ['monthlyMarketing', 'Publicité / Marketing'],
  ['monthlySupplies', 'Fournitures / Réassort'],
  ['monthlySubscriptions', 'Abonnements (internet, logiciels...)'],
  ['monthlyUtilities', 'Entretien / Énergie'],
  ['otherMonthlyCosts', 'Autres charges fixes'],
]

const formatNumber = (value, decimals = 2) => {
  const num = Number(value)
  return isNaN(num) ? '0.00' : num.toFixed(decimals)
}

function ResultRow({ label, value, positive }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-night-700/60 last:border-0">
      <span className="text-[13px] text-gray-400">{label}</span>
      <span className={`text-[14px] font-bold ${
        positive === undefined ? 'text-cream' : positive ? 'text-gold-400' : 'text-red-400'
      }`}>{value}</span>
    </div>
  )
}

export default function SimulationPage() {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)

  useEffect(() => {
    setHasSavedData(!!localStorage.getItem(STORAGE_KEY))
  }, [])

  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        setFormData(JSON.parse(savedData))
        toast.success('Business plan précédent chargé avec succès')
      }
    } catch {
      toast.error('Impossible de charger le business plan précédent')
    }
  }

  const updateField = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))

  const calculateSimulation = async (e) => {
    e.preventDefault()
    const { unitPrice, costPrice, estimatedMonthlySales } = formData
    if (!unitPrice || !costPrice || !estimatedMonthlySales) {
      toast.error('Veuillez remplir les champs obligatoires (*)')
      return
    }
    setLoading(true)
    try {
      const simulationData = {
        productName: formData.productName || 'Mon produit',
        unitPrice: parseFloat(formData.unitPrice) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        variableCosts: parseFloat(formData.variableCosts) || 0,
        initialInvestment: parseFloat(formData.initialInvestment) || 0,
        monthlyRent: parseFloat(formData.monthlyRent) || 0,
        monthlySalaries: parseFloat(formData.monthlySalaries) || 0,
        monthlyMarketing: parseFloat(formData.monthlyMarketing) || 0,
        monthlySupplies: parseFloat(formData.monthlySupplies) || 0,
        monthlySubscriptions: parseFloat(formData.monthlySubscriptions) || 0,
        monthlyUtilities: parseFloat(formData.monthlyUtilities) || 0,
        otherMonthlyCosts: parseFloat(formData.otherMonthlyCosts) || 0,
        estimatedMonthlySales: parseFloat(formData.estimatedMonthlySales) || 0,
        analysisPeriodMonths: parseInt(formData.analysisPeriodMonths) || 6,
      }
      const response = await simulationAPI.calculate(simulationData)
      setResults(response.data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      setHasSavedData(true)
      toast.success('Simulation calculée avec succès')
    } catch (error) {
      console.error('Error calculating simulation:', error)
      toast.error('Impossible de calculer la simulation')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFormData(EMPTY_FORM)
    setResults(null)
  }

  const chartData = (results?.projections || []).map(p => ({
    month: `M${p.month}`,
    Revenus: Number(p.revenue) || 0,
    Dépenses: Number(p.expenses) || 0,
    Cumul: Number(p.cumulativeProfit) || 0,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-[1300px] mx-auto">
      {/* En-tête */}
      <div className="card p-6 text-center mb-5 animate-in">
        <span className="w-14 h-14 rounded-2xl bg-gold-500/15 flex items-center justify-center mx-auto mb-3">
          <Calculator className="w-7 h-7 text-gold-500" />
        </span>
        <h1 className="text-xl font-bold text-cream">Simulation Business Plan</h1>
        <p className="text-[13px] text-gray-400 mt-1">Validez la rentabilité de votre projet</p>
      </div>

      {hasSavedData && (
        <div className="card p-4 mb-5 flex items-center gap-3 animate-in">
          <Save className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <p className="flex-1 text-[13px] text-gray-300">Un business plan précédent est disponible</p>
          <button onClick={loadSavedData} className="btn-secondary !py-2">Charger</button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr] items-start">
        {/* Formulaire */}
        <form onSubmit={calculateSimulation} className="card p-5 sm:p-6 space-y-5">
          <section>
            <h2 className="text-[15px] font-bold text-cream mb-3">📦 Informations produit</h2>
            <div className="space-y-3">
              {PRODUCT_FIELDS.map(([field, label, placeholder, type]) => (
                <div key={field}>
                  <label className="input-label">{label}</label>
                  <input type={type} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? '0' : undefined} value={formData[field]} onChange={updateField(field)} placeholder={placeholder} className="input-field" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-cream mb-3">💰 Investissement initial</h2>
            <label className="input-label">Budget de lancement (caution, matériel, frais admin...)</label>
            <input type="number" step="0.01" min="0" value={formData.initialInvestment} onChange={updateField('initialInvestment')} placeholder="0.00" className="input-field" />
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-cream mb-3">🔄 Charges mensuelles récurrentes</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {MONTHLY_FIELDS.map(([field, label]) => (
                <div key={field}>
                  <label className="input-label">{label}</label>
                  <input type="number" step="0.01" min="0" value={formData[field]} onChange={updateField(field)} placeholder="0.00" className="input-field" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-cream mb-3">📊 Prévisions de vente</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label">Quantité prévue à vendre par mois *</label>
                <input type="number" min="0" value={formData.estimatedMonthlySales} onChange={updateField('estimatedMonthlySales')} placeholder="Nombre d'unités" className="input-field" />
              </div>
              <div>
                <label className="input-label">Durée d'analyse (en mois)</label>
                <input type="number" min="1" max="60" value={formData.analysisPeriodMonths} onChange={updateField('analysisPeriodMonths')} placeholder="6" className="input-field" />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-[2] !py-3">
              {loading ? <Spinner className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
              {loading ? 'Calcul...' : 'Calculer'}
            </button>
            <button type="button" onClick={reset} disabled={loading} className="btn-secondary flex-1">Réinitialiser</button>
          </div>
        </form>

        {/* Résultats */}
        <div className="space-y-4">
          {!results ? (
            <div className="card p-10 text-center">
              <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Remplissez le formulaire et lancez le calcul pour voir les résultats de votre business plan.</p>
            </div>
          ) : (
            <>
              {results.summary && (
                <div className="card p-5 animate-in">
                  <h3 className="text-[15px] font-bold text-cream mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-gold-500" />Résumé
                  </h3>
                  <ResultRow label="Marge unitaire" value={`${formatNumber(results.summary.unitMargin)} €`} positive={Number(results.summary.unitMargin || 0) >= 0} />
                  <ResultRow label="Pourcentage de marge" value={`${formatNumber(results.summary.marginPercentage)}%`} positive={Number(results.summary.marginPercentage || 0) >= 0} />
                  <ResultRow label="Charges fixes totales" value={`${formatNumber(results.summary.totalFixedCosts)} €/mois`} />
                  <ResultRow label="Budget de lancement" value={`${formatNumber(results.summary.initialInvestment)} €`} />
                </div>
              )}

              {results.breakEven && (
                <div className="card p-5 animate-in stagger-1">
                  <h3 className="text-[15px] font-bold text-cream mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />Point mort
                  </h3>
                  <ResultRow label="Ventes nécessaires" value={`${results.breakEven.unitsNeeded || 0} unités/mois`} />
                  <ResultRow label="CA minimum mensuel" value={`${formatNumber(results.breakEven.revenueNeeded)} €`} />
                  <p className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 text-[12.5px] text-gray-300 leading-relaxed">
                    <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                    Vous devez vendre au moins {results.breakEven.unitsNeeded || 0} unités par mois pour couvrir vos charges fixes.
                  </p>
                </div>
              )}

              {results.monthlyForecasts && (
                <div className="card p-5 animate-in stagger-2">
                  <h3 className="text-[15px] font-bold text-cream mb-2 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-gold-500" />Prévisions mensuelles
                  </h3>
                  <ResultRow label="Revenus mensuels" value={`${formatNumber(results.monthlyForecasts.revenue)} €`} />
                  <ResultRow label="Coûts variables mensuels" value={`${formatNumber(results.monthlyForecasts.variableCosts)} €`} />
                  <ResultRow label="Charges fixes mensuelles" value={`${formatNumber(results.monthlyForecasts.fixedCosts)} €`} />
                  <ResultRow label="Bénéfice net mensuel" value={`${formatNumber(results.monthlyForecasts.netProfit)} €`} positive={Number(results.monthlyForecasts.netProfit || 0) >= 0} />
                </div>
              )}

              {results.periodAnalysis && (
                <div className="card p-5 animate-in stagger-3">
                  <h3 className="text-[15px] font-bold text-cream mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gold-500" />Analyse sur {formData.analysisPeriodMonths} mois
                  </h3>
                  <ResultRow label="CA total" value={`${formatNumber(results.periodAnalysis.totalRevenue)} €`} />
                  <ResultRow label="Profit total" value={`${formatNumber(results.periodAnalysis.totalProfit)} €`} positive={Number(results.periodAnalysis.totalProfit || 0) >= 0} />
                  <ResultRow label="ROI" value={`${formatNumber(results.periodAnalysis.roi)}%`} positive={Number(results.periodAnalysis.roi || 0) >= 0} />
                  {results.periodAnalysis.monthsToRecoverInvestment !== null && (
                    <ResultRow label="Récupération investissement" value={`${results.periodAnalysis.monthsToRecoverInvestment} mois`} />
                  )}
                  <div className={`flex items-center gap-2.5 mt-4 p-3.5 rounded-xl ${
                    results.periodAnalysis.isViable ? 'bg-gold-500/10 text-gold-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {results.periodAnalysis.isViable ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-bold">
                      {results.periodAnalysis.isViable ? '✓ Projet viable' : '✗ Projet non viable'}
                    </span>
                  </div>
                </div>
              )}

              {chartData.length > 0 && (
                <div className="card p-5 animate-in stagger-4">
                  <h3 className="text-[15px] font-bold text-cream mb-1 flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-gold-500" />Évolution mois par mois
                  </h3>
                  <div className="h-64 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={CHART_TEXT.grid} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: CHART_TEXT.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${formatNumber(v)} €`} />
                        <Legend wrapperStyle={{ fontSize: 12.5 }} />
                        <Line type="monotone" dataKey="Revenus" stroke={SERIES.gold} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Dépenses" stroke={SERIES.red} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Cumul" stroke={SERIES.blue} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Détail par mois */}
                  <div className="mt-4 overflow-x-auto scrollbar-thin">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="text-gray-500 border-b border-night-700">
                          <th className="text-left py-2 pr-3 font-medium">Mois</th>
                          <th className="text-right py-2 px-3 font-medium">Revenus</th>
                          <th className="text-right py-2 px-3 font-medium">Dépenses</th>
                          <th className="text-right py-2 px-3 font-medium">Profit net</th>
                          <th className="text-right py-2 pl-3 font-medium">Cumul</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.projections.map((p, i) => (
                          <tr key={i} className="border-b border-night-700/40 last:border-0">
                            <td className="py-2 pr-3 text-gray-300 font-medium">Mois {p.month}</td>
                            <td className="py-2 px-3 text-right text-gray-300">{formatNumber(p.revenue)} €</td>
                            <td className="py-2 px-3 text-right text-red-400/90">{formatNumber(p.expenses)} €</td>
                            <td className={`py-2 px-3 text-right font-semibold ${Number(p.netProfit || 0) >= 0 ? 'text-gold-400' : 'text-red-400'}`}>{formatNumber(p.netProfit)} €</td>
                            <td className={`py-2 pl-3 text-right font-bold ${Number(p.cumulativeProfit || 0) >= 0 ? 'text-gold-400' : 'text-red-400'}`}>{formatNumber(p.cumulativeProfit)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
