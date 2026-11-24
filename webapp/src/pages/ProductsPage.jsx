import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Search, X, Package, Pencil, Trash2, Camera, AlertTriangle, Boxes, Upload,
} from 'lucide-react'
import api, { productsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { Modal, ConfirmDialog, EmptyState, PageHeader, SkeletonCard, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'

const EMPTY_FORM = { name: '', description: '', unitPrice: '', costPrice: '', category: '', image: '' }

export default function ProductsPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [importOpen, setImportOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/products', { params: { projectId: user?.projectId } })
      setProducts(response.data?.data || [])
    } catch {
      toast.error('Impossible de charger les produits')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories', { params: { projectId: user?.projectId } })
      setCategories(response.data?.data || [])
    } catch (error) {
      console.error('Error loading categories', error)
    }
  }, [user?.projectId])

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      await api.post('/categories', { name: newCategoryName, projectId: user?.projectId })
      setNewCategoryName('')
      setShowCategoryModal(false)
      loadCategories()
      toast.success('Catégorie créée')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Impossible de créer la catégorie')
    }
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setSelectedImageFile(null)
    setEditingProduct(null)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setSelectedImageFile(null)
    setFormData({
      name: product.name,
      description: product.description || '',
      unitPrice: product.unitPrice.toString(),
      costPrice: product.costPrice.toString(),
      category: product.category || '',
      image: product.image || '',
    })
    setModalVisible(true)
  }

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSelectedImageFile(file)
    setFormData(prev => ({ ...prev, image: URL.createObjectURL(file) }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name || formData.unitPrice === '' || formData.costPrice === '') {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      setSaving(true)
      const productData = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice),
        costPrice: parseFloat(formData.costPrice),
        projectId: user?.projectId,
      }
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, productData, selectedImageFile)
      } else {
        await productsAPI.create(productData, selectedImageFile)
      }
      setModalVisible(false)
      resetForm()
      loadProducts()
      toast.success(`Produit ${editingProduct ? 'modifié' : 'créé'} avec succès`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/products/${deleteTarget._id}`)
      toast.success('Produit supprimé')
      setDeleteTarget(null)
      loadProducts()
    } catch {
      toast.error('Impossible de supprimer le produit')
    }
  }

  const calculateMargin = (unitPrice, costPrice) => {
    if (!unitPrice || !costPrice) return 0
    return (((unitPrice - costPrice) / unitPrice) * 100).toFixed(2)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        title="Produits & Services"
        description={`${filteredProducts.length}${searchQuery ? `/${products.length}` : ''} produit(s)`}
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="input-field pl-10 pr-9 sm:w-64"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isAdmin && (
          <>
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Importer CSV
            </button>
            <button onClick={() => { resetForm(); setModalVisible(true) }} className="btn-primary">
              <Plus className="w-4 h-4" />
              Nouveau produit
            </button>
          </>
        )}
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={searchQuery ? Search : Package}
            title={searchQuery ? 'Aucun résultat trouvé' : 'Aucun produit enregistré'}
            description={searchQuery ? `Aucun produit ne correspond à "${searchQuery}"` : 'Ajoutez votre premier produit'}
            action={!searchQuery && isAdmin ? () => { resetForm(); setModalVisible(true) } : undefined}
            actionLabel="Ajouter un produit"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((item) => {
            const margin = calculateMargin(item.unitPrice, item.costPrice)
            const marginClass = margin > 30 ? 'text-gold-400' : margin > 15 ? 'text-amber-400' : 'text-red-400'
            const hasStock = item.stock !== null && item.stock !== undefined
            const stockQuantity = hasStock ? item.stock.quantity : 0
            const isLowStock = hasStock && item.stock.isLowStock
            const stockClass = isLowStock ? 'text-red-400' : stockQuantity > 0 ? 'text-emerald-400' : 'text-gray-500'

            return (
              <div key={item._id} className="card-hover p-4 animate-in flex flex-col">
                <div className="flex items-start gap-3">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-14 h-14 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-gold-500" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-cream truncate flex-1">{item.name}</p>
                      {hasStock && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          isLowStock ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {isLowStock ? <AlertTriangle className="w-3 h-3" /> : <Boxes className="w-3 h-3" />}
                          {stockQuantity}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-[12.5px] text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-gray-400 ring-1 ring-white/10">{item.category}</span>
                      )}
                      {isLowStock && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-[11px] font-semibold text-red-400">
                          <AlertTriangle className="w-3 h-3" />Stock bas
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(item)} className="btn-ghost !p-1.5" title="Modifier">
                        <Pencil className="w-4 h-4 text-gold-500" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="btn-ghost !p-1.5" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-night-700/60 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Vente</p>
                    <p className="text-[13px] font-bold text-cream mt-0.5">{formatPrice(item.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Revient</p>
                    <p className="text-[13px] font-bold text-cream mt-0.5">{formatPrice(item.costPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-500 uppercase tracking-wide">Marge</p>
                    <p className={`text-[13px] font-bold mt-0.5 ${marginClass}`}>{margin}%</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal produit */}
      <Modal open={modalVisible} onClose={() => { setModalVisible(false); resetForm() }} title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Photo */}
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            {formData.image ? (
              <span className="relative block w-28 h-28 mx-auto rounded-2xl overflow-hidden group">
                <img src={formData.image} alt="Produit" className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[11px] text-white font-medium">Changer</span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center justify-center gap-1.5 w-28 h-28 mx-auto rounded-2xl border-2 border-dashed border-night-500 hover:border-gold-500/60 transition-colors">
                <Camera className="w-6 h-6 text-gold-500" />
                <span className="text-[11px] text-gray-400">Ajouter une photo</span>
              </span>
            )}
          </label>

          <div>
            <label className="input-label">Nom du produit *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nom du produit" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Prix de vente *</label>
              <input type="number" step="0.01" min="0" value={formData.unitPrice} onChange={(e) => setFormData(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="input-label">Prix de revient *</label>
              <input type="number" step="0.01" min="0" value={formData.costPrice} onChange={(e) => setFormData(p => ({ ...p, costPrice: e.target.value }))} placeholder="0.00" className="input-field" />
            </div>
          </div>
          {formData.unitPrice && formData.costPrice && (
            <p className="text-[12.5px] text-gray-500">
              Marge estimée : <span className="font-bold text-gold-400">{calculateMargin(parseFloat(formData.unitPrice), parseFloat(formData.costPrice))}%</span>
            </p>
          )}
          <div>
            <label className="input-label">Catégorie</label>
            <div className="flex gap-2">
              <select
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                className="input-field flex-1"
              >
                <option value="">Aucune catégorie</option>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowCategoryModal(true)} className="btn-secondary !px-3" title="Nouvelle catégorie">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Description du produit" rows={2} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setModalVisible(false); resetForm() }} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : editingProduct ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal nouvelle catégorie */}
      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="p-5 space-y-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie"
            autoFocus
            className="input-field"
          />
          <div className="flex gap-3">
            <button onClick={() => setShowCategoryModal(false)} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleAddCategory} className="btn-primary flex-1">Créer</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Voulez-vous vraiment supprimer ${deleteTarget?.name} ?`}
        confirmText="Supprimer"
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="products"
        onImported={() => { loadProducts(); loadCategories() }}
      />
    </div>
  )
}
