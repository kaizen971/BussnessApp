import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, X, Package, ShoppingCart, CheckCircle2, XCircle } from 'lucide-react'
import { productsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { Modal, EmptyState, PageHeader, SkeletonCard } from '../components/ui'

// Le serveur ne renvoie aux salariés que la disponibilité (jamais les quantités) ;
// un produit sans stock suivi (service…) est disponible
const isOutOfStock = (product) => !!product.isOutOfStock

function Availability({ product, large = false }) {
  const outOfStock = isOutOfStock(product)
  const Icon = outOfStock ? XCircle : CheckCircle2
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold border ${
      large ? 'px-3 py-1 text-[13px]' : 'px-2 py-0.5 text-[11px]'
    } ${outOfStock ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
      <Icon className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      {outOfStock ? 'Rupture' : 'Disponible'}
    </span>
  )
}

// Catalogue à montrer au client : prix de vente et disponibilité uniquement
export default function CataloguePage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await productsAPI.getAll(user?.projectId)
      setProducts((response.data?.data || []).filter(p => p.isActive !== false))
    } catch {
      toast.error('Impossible de charger les produits')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  useEffect(() => { loadProducts() }, [loadProducts])

  const categories = useMemo(
    () => [...new Set(products.map(p => p.category).filter(Boolean))].sort(),
    [products]
  )

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products.filter(p =>
      (!category || p.category === category) &&
      (!q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q))
    )
  }, [products, searchQuery, category])

  const sell = (product) => navigate(`/ventes?produit=${product._id}`)
  const closeDetail = useCallback(() => setSelectedProduct(null), [])

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader title="Catalogue" description={`${filteredProducts.length} produit(s)`}>
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
      </PageHeader>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {[null, ...categories].map(cat => (
            <button
              key={cat || '__all'}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
                category === cat
                  ? 'bg-gold-500 border-gold-500 text-night-950'
                  : 'border-night-600 text-gray-300 hover:border-gold-500/60'
              }`}
            >
              {cat || 'Tout'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={searchQuery ? Search : Package}
            title={searchQuery ? 'Aucun résultat trouvé' : 'Catalogue vide'}
            description={searchQuery ? `Aucun produit ne correspond à "${searchQuery}"` : 'Aucun produit à présenter pour le moment.'}
          />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map(item => (
            <div key={item._id} className="card-hover overflow-hidden flex flex-col animate-in">
              <button type="button" onClick={() => setSelectedProduct(item)} className="text-left flex-1 flex flex-col">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <span className="w-full aspect-square bg-gold-500/10 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gold-500" />
                  </span>
                )}
                <span className="p-3 flex flex-col gap-1.5 flex-1">
                  <span className="text-[14px] font-semibold text-cream line-clamp-2">{item.name}</span>
                  <span className="text-[17px] font-extrabold text-gold-400">{formatPrice(item.unitPrice)}</span>
                  <Availability product={item} />
                </span>
              </button>
              <button onClick={() => sell(item)} className="btn-primary m-3 mt-0 justify-center">
                <ShoppingCart className="w-4 h-4" />
                Vendre
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fiche à montrer au client */}
      <Modal open={!!selectedProduct} onClose={closeDetail} title={selectedProduct?.name || ''} size="lg">
        {selectedProduct && (
          <div className="p-6 grid gap-6 sm:grid-cols-2">
            {selectedProduct.image ? (
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-2xl" />
            ) : (
              <span className="w-full aspect-square rounded-2xl bg-gold-500/10 flex items-center justify-center">
                <Package className="w-16 h-16 text-gold-500" />
              </span>
            )}
            <div className="flex flex-col gap-3">
              {selectedProduct.category && (
                <p className="text-[12px] font-bold uppercase tracking-widest text-gray-500">{selectedProduct.category}</p>
              )}
              <p className="text-3xl font-extrabold text-gold-400">{formatPrice(selectedProduct.unitPrice)}</p>
              <div><Availability product={selectedProduct} large /></div>
              {selectedProduct.description && (
                <p className="text-[15px] leading-relaxed text-gray-300 whitespace-pre-line">{selectedProduct.description}</p>
              )}
              <button onClick={() => sell(selectedProduct)} className="btn-primary mt-auto justify-center py-3">
                <ShoppingCart className="w-5 h-5" />
                Vendre ce produit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
