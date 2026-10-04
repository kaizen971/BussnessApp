import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Boxes, AlertTriangle, History, ArrowDownCircle, ArrowUpCircle,
  ShoppingCart, Undo2, MapPin, Tag, ChevronDown, X, Upload,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import api, { stockAPI } from '../services/api'
import { Modal, EmptyState, PageHeader, SkeletonTable, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'

const EMPTY_FORM = { name: '', quantity: '', unitPrice: '', minQuantity: '', sku: '', location: '', productId: '' }

const MOVEMENT_ICONS = {
  in: ArrowDownCircle,
  out: ArrowUpCircle,
  sale: ShoppingCart,
  return: Undo2,
}

export default function StockPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [stock, setStock] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [showMovements, setShowMovements] = useState(false)
  const [movements, setMovements] = useState([])
  const [movementModal, setMovementModal] = useState(null) // { item, type: 'in' | 'out' }
  const [movementQuantity, setMovementQuantity] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const loadStock = useCallback(async () => {
    try {
      const response = await stockAPI.getAll(user?.projectId)
      setStock(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error loading stock:', error)
      toast.error('Impossible de charger le stock')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.get('/products', { params: { projectId: user?.projectId } })
      setProducts(response.data?.data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }, [user?.projectId])

  useEffect(() => {
    loadStock()
    loadProducts()
  }, [loadStock, loadProducts])

  const openStockModal = (item = null) => {
    if (item) {
      setSelectedItem(item)
      setFormData({
        name: item.name,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        minQuantity: item.minQuantity?.toString() || '',
        sku: item.sku || '',
        location: item.location || '',
        productId: item.productId || '',
      })
    } else {
      setSelectedItem(null)
      setFormData(EMPTY_FORM)
    }
    setModalVisible(true)
  }

  const handleSaveStock = async (e) => {
    e.preventDefault()
    if (!formData.productId || !formData.quantity || formData.unitPrice === '') {
      toast.error('Veuillez sélectionner un produit et remplir tous les champs obligatoires')
      return
    }
    setSaving(true)
    try {
      const stockData = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        minQuantity: parseFloat(formData.minQuantity) || 0,
        productId: formData.productId,
      }
      if (selectedItem) {
        await stockAPI.update(selectedItem._id, stockData)
        toast.success('Article modifié avec succès')
      } else {
        await stockAPI.create({ ...stockData, projectId: user?.projectId })
        toast.success('Article ajouté avec succès')
      }
      setFormData(EMPTY_FORM)
      setSelectedItem(null)
      setModalVisible(false)
      await loadStock()
    } catch (error) {
      console.error('Error saving stock:', error)
      const errorMessage = error.response?.status === 403
        ? "Vous n'avez pas les permissions nécessaires pour créer un article"
        : (error.response?.data?.error || "Impossible de sauvegarder l'article")
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const loadStockMovements = async (item) => {
    setSelectedItem(item)
    try {
      const response = await stockAPI.getMovements(item._id)
      setMovements(response.data.data || [])
      setShowMovements(true)
    } catch (error) {
      console.error('Error loading movements:', error)
      toast.error("Impossible de charger l'historique")
    }
  }

  const handleAddMovement = async (e) => {
    e.preventDefault()
    if (!movementQuantity || parseFloat(movementQuantity) <= 0) {
      toast.error('Veuillez entrer une quantité valide')
      return
    }
    try {
      await stockAPI.addMovement({
        stockId: movementModal.item._id,
        type: movementModal.type,
        quantity: parseFloat(movementQuantity),
        reason: movementReason || (movementModal.type === 'in' ? 'Approvisionnement' : 'Sortie'),
      })
      toast.success('Mouvement enregistré')
      setMovementModal(null)
      setMovementQuantity('')
      setMovementReason('')
      await loadStock()
    } catch (error) {
      console.error('Error adding movement:', error)
      toast.error("Impossible d'enregistrer le mouvement")
    }
  }

  const totalStockValue = stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const lowStockItems = stock.filter(item => item.minQuantity > 0 && item.quantity <= item.minQuantity)

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
      <PageHeader title="Stock" description="Gérez vos articles, entrées et sorties">
        {isAdmin && (
          <button onClick={() => setImportOpen(true)} className="btn-secondary">
            <Upload className="w-4 h-4" />
            Importer CSV
          </button>
        )}
        <button onClick={() => openStockModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouvel article
        </button>
      </PageHeader>

      {/* Valeur du stock */}
      <div className="card p-5 border-l-4 !border-l-gold-500">
        <p className="text-[13px] text-gray-400 font-medium">Valeur du stock</p>
        <p className="text-3xl font-extrabold text-gold-400 mt-1">{formatPrice(totalStockValue)}</p>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-[12.5px] text-gray-500">{stock.length} article(s)</p>
          {lowStockItems.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-[11.5px] font-semibold text-red-400 ring-1 ring-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockItems.length} en alerte
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card"><SkeletonTable rows={5} /></div>
      ) : stock.length === 0 ? (
        <div className="card">
          <EmptyState icon={Boxes} title="Aucun article en stock" description="Ajoutez des articles pour suivre vos quantités" action={() => openStockModal()} actionLabel="Nouvel article" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {stock.map((item) => {
            const totalValue = item.quantity * item.unitPrice
            const isLowStock = item.minQuantity > 0 && item.quantity <= item.minQuantity
            return (
              <div key={item._id} className="card p-4 animate-in">
                <div className="flex items-start gap-3">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isLowStock ? 'bg-red-500/10' : 'bg-sky-500/10'}`}>
                    {isLowStock ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Boxes className="w-5 h-5 text-sky-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openStockModal(item)} className="text-[15px] font-bold text-cream hover:text-gold-400 transition-colors truncate">
                        {item.name}
                      </button>
                      {isLowStock && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-[11px] font-semibold text-red-400">
                          <AlertTriangle className="w-3 h-3" />Stock bas
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      <div>
                        <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Quantité</p>
                        <p className={`text-[14px] font-bold mt-0.5 ${isLowStock ? 'text-red-400' : 'text-cream'}`}>{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Prix unitaire</p>
                        <p className="text-[14px] font-bold text-cream mt-0.5">{formatPrice(item.unitPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Valeur totale</p>
                        <p className="text-[14px] font-bold text-gold-400 mt-0.5">{formatPrice(totalValue)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11.5px] text-gray-500">
                      {item.sku && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />SKU: {item.sku}</span>}
                      {item.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
                      {item.minQuantity > 0 && <span>Seuil min : {item.minQuantity}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-night-700/60">
                  <button onClick={() => loadStockMovements(item)} className="btn-ghost !py-1.5 text-sky-400 hover:!text-sky-300 flex-1">
                    <History className="w-4 h-4" />
                    Historique
                  </button>
                  <button onClick={() => { setMovementModal({ item, type: 'in' }); setMovementQuantity(''); setMovementReason('') }} className="btn-ghost !py-1.5 text-emerald-400 hover:!text-emerald-300 flex-1">
                    <ArrowDownCircle className="w-4 h-4" />
                    Entrée
                  </button>
                  <button onClick={() => { setMovementModal({ item, type: 'out' }); setMovementQuantity(''); setMovementReason('') }} className="btn-ghost !py-1.5 text-red-400 hover:!text-red-300 flex-1">
                    <ArrowUpCircle className="w-4 h-4" />
                    Sortie
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal article */}
      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title={selectedItem ? "Modifier l'article" : 'Nouvel article'} size="sm">
        <form onSubmit={handleSaveStock} className="p-6 space-y-4">
          <div>
            <label className="input-label">Produit *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => !selectedItem && setShowProductSelector(o => !o)}
                disabled={!!selectedItem}
                className="input-field flex items-center gap-2 text-left disabled:opacity-60"
              >
                <Tag className={`w-4 h-4 flex-shrink-0 ${formData.productId ? 'text-emerald-400' : 'text-gray-500'}`} />
                <span className={`flex-1 truncate ${formData.productId ? 'text-cream' : 'text-gray-500'}`}>
                  {formData.name || 'Sélectionner un produit'}
                </span>
                {!selectedItem && (
                  formData.productId ? (
                    <span onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, productId: '', name: '', unitPrice: '' })) }} className="p-0.5 rounded hover:bg-night-600 text-red-400">
                      <X className="w-4 h-4" />
                    </span>
                  ) : <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {showProductSelector && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProductSelector(false)} />
                  <div className="absolute left-0 right-0 mt-1.5 bg-night-800 border border-night-600 rounded-xl shadow-2xl z-40 max-h-52 overflow-y-auto scrollbar-thin py-1 animate-scale-in">
                    {products.length === 0 ? (
                      <p className="px-4 py-3 text-[13px] text-gray-500">Aucun produit — créez-en un d'abord</p>
                    ) : products.map(product => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, productId: product._id, name: product.name, unitPrice: product.unitPrice.toString() }))
                          setShowProductSelector(false)
                        }}
                        className="flex items-center justify-between w-full px-3.5 py-2.5 text-left text-[13px] text-gray-300 hover:bg-white/[0.04]"
                      >
                        <span className="truncate">{product.name}</span>
                        <span className="text-gold-400 font-semibold flex-shrink-0 ml-2">{formatPrice(product.unitPrice)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Quantité *</label>
              <input type="number" min="0" value={formData.quantity} onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="input-label">Prix unitaire *</label>
              <input type="number" step="0.01" min="0" value={formData.unitPrice} onChange={(e) => setFormData(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0.00" className="input-field" />
            </div>
          </div>
          <div>
            <label className="input-label">Quantité minimale (seuil d'alerte)</label>
            <input type="number" min="0" value={formData.minQuantity} onChange={(e) => setFormData(p => ({ ...p, minQuantity: e.target.value }))} placeholder="Seuil d'alerte" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Code SKU</label>
              <input type="text" value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} placeholder="Ex: PRD-001" className="input-field" />
            </div>
            <div>
              <label className="input-label">Emplacement</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Étagère A3" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : selectedItem ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal mouvement */}
      <Modal open={!!movementModal} onClose={() => setMovementModal(null)} title={movementModal?.type === 'in' ? 'Entrée de stock' : 'Sortie de stock'} size="sm">
        <form onSubmit={handleAddMovement} className="p-6 space-y-4">
          {movementModal && (
            <div className="rounded-xl bg-night-900 border border-night-700 p-3.5">
              <p className="text-sm font-bold text-cream">{movementModal.item.name}</p>
              <p className="text-[12.5px] text-gray-500 mt-0.5">Stock actuel : {movementModal.item.quantity}</p>
            </div>
          )}
          <div>
            <label className="input-label">Quantité *</label>
            <input
              type="number"
              min="1"
              value={movementQuantity}
              onChange={(e) => setMovementQuantity(e.target.value)}
              placeholder="Quantité à ajouter/retirer"
              autoFocus
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Raison (optionnel)</label>
            <input
              type="text"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder={movementModal?.type === 'in' ? 'Ex: Réception commande' : 'Ex: Retour client'}
              className="input-field"
            />
          </div>
          <button type="submit" className={movementModal?.type === 'in' ? 'btn-primary w-full !py-3' : 'btn-danger w-full !py-3'}>
            {movementModal?.type === 'in' ? 'Ajouter au stock' : 'Retirer du stock'}
          </button>
        </form>
      </Modal>

      {/* Modal historique */}
      <Modal open={showMovements} onClose={() => setShowMovements(false)} title="Historique des mouvements">
        <div className="p-5">
          {selectedItem && (
            <div className="rounded-xl bg-night-900 border border-night-700 p-3.5 mb-4">
              <p className="text-sm font-bold text-cream">{selectedItem.name}</p>
              <p className="text-[12.5px] text-gray-500 mt-0.5">Stock actuel : {selectedItem.quantity}</p>
            </div>
          )}
          {movements.length === 0 ? (
            <EmptyState icon={History} title="Aucun mouvement enregistré" description="Les entrées et sorties apparaîtront ici" />
          ) : (
            <div className="space-y-2.5">
              {movements.map((item) => {
                const isPositive = item.type === 'in' || item.type === 'return'
                const MoveIcon = MOVEMENT_ICONS[item.type] || History
                return (
                  <div key={item._id} className="flex items-start gap-3 p-3 rounded-xl bg-night-900 border border-night-700">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <MoveIcon className={`w-5 h-5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-cream">{item.reason || item.type}</p>
                      <p className="text-[11.5px] text-gray-600 mt-0.5">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                      {item.userId && (
                        <p className="text-[11.5px] text-gray-500">Par : {item.userId.fullName || item.userId.username}</p>
                      )}
                      {item.notes && <p className="text-[12px] text-gray-400 mt-1">{item.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[14px] font-bold ${item.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </p>
                      <p className="text-[11px] text-gray-600">{item.previousQuantity} → {item.newQuantity}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="stock"
        onImported={() => { loadStock(); loadProducts() }}
      />
    </div>
  )
}
