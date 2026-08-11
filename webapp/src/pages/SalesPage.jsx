import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Undo2, Pencil, Share2, Wallet,
  Package, User, Store, X, CheckCircle2, MessageCircle, Copy, Upload,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { salesAPI, productsAPI, customersAPI, usersAPI } from '../services/api'
import { Modal, ConfirmDialog, EmptyState, PageHeader, TabBar, SkeletonTable, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'

const formatDate = (date) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

// ============= Partage de reçu (WhatsApp web / presse-papiers) =============

function ReceiptShareModal({ open, onClose, message, title }) {
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
  }
  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text: message }) } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(message)
      toast.success('Reçu copié dans le presse-papiers !')
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Partager le reçu" size="sm">
      <div className="p-5 space-y-3">
        <pre className="text-[12px] text-gray-300 bg-night-900 border border-night-700 rounded-xl p-4 whitespace-pre-wrap max-h-64 overflow-y-auto scrollbar-thin font-sans">{message}</pre>
        <button onClick={shareWhatsApp} className="btn-primary w-full">
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button onClick={shareNative} className="btn-secondary w-full">
          <Copy className="w-4 h-4" />
          {navigator.share ? 'Autres applications' : 'Copier le reçu'}
        </button>
      </div>
    </Modal>
  )
}

// ============= Sélecteur avec recherche (client / vendeur) =============

function SearchSelect({ label, icon: Icon, items, value, onChange, getLabel, getSub, placeholder }) {
  const [search, setSearch] = useState('')
  const [openList, setOpenList] = useState(false)
  const selected = items.find(i => i._id === value)

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(i => getLabel(i)?.toLowerCase().includes(q) || getSub?.(i)?.toLowerCase().includes(q))
  }, [items, search, getLabel, getSub])

  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenList(o => !o)}
          className="input-field flex items-center gap-2 text-left"
        >
          <Icon className="w-4 h-4 text-gold-500 flex-shrink-0" />
          <span className={`flex-1 truncate ${selected ? 'text-cream' : 'text-gray-500'}`}>
            {selected ? getLabel(selected) : placeholder}
          </span>
          {selected && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded hover:bg-night-600 text-gray-500"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
        {openList && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpenList(false)} />
            <div className="absolute left-0 right-0 mt-1.5 bg-night-800 border border-night-600 rounded-xl shadow-2xl z-40 overflow-hidden animate-scale-in">
              <div className="p-2 border-b border-night-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 text-[13px] bg-night-900 border border-night-600 rounded-lg text-cream placeholder-gray-600 focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin py-1">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-gray-500">Aucun résultat</p>
                ) : filtered.map(item => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => { onChange(item._id); setOpenList(false); setSearch('') }}
                    className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                      item._id === value ? 'text-gold-400 bg-gold-500/[0.08]' : 'text-gray-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{getLabel(item)}</span>
                      {getSub?.(item) && <span className="block text-[11px] text-gray-500 truncate">{getSub(item)}</span>}
                    </span>
                    {item._id === value && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============= Point de vente (produits + panier) =============

function PointOfSale({ products, customers, sellers, isAdmin, user, formatPrice, onValidated }) {
  const [cart, setCart] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products
    const q = productSearch.toLowerCase()
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }, [products, productSearch])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - (item.discount || 0)), 0),
    [cart]
  )

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product._id)
      if (existing) {
        return prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.unitPrice,
        discount: 0,
      }]
    })
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId))
      return
    }
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: parseInt(quantity) || 1 } : i))
  }

  const buildReceipt = (items, customer, seller) => {
    let total = 0
    let totalDiscount = 0
    let lines = ''
    items.forEach((item) => {
      const sub = item.quantity * item.unitPrice
      const disc = item.discount || 0
      total += sub - disc
      totalDiscount += disc
      lines += `📦 *${item.productName}*\n   ${item.quantity} x ${formatPrice(item.unitPrice)} = ${formatPrice(sub)}\n`
      if (disc > 0) lines += `   🏷️ Remise : -${formatPrice(disc)}\n`
    })
    return (
      `🧾 *REÇU DE VENTE*\n━━━━━━━━━━━━━━━━━━\n\n` +
      lines + `\n` +
      (totalDiscount > 0 ? `🏷️ *Remise totale :* -${formatPrice(totalDiscount)}\n` : '') +
      `💰 *Total :* ${formatPrice(total)}\n\n` +
      `👤 *Client :* ${customer?.name || 'Client inconnu'}\n` +
      `🏪 *Vendeur :* ${seller?.fullName || seller?.username || 'Vendeur'}\n` +
      `📅 *Date :* ${formatDate(new Date())}\n\n` +
      `━━━━━━━━━━━━━━━━━━\nMerci pour votre achat ! 🙏`
    )
  }

  const handleValidate = async () => {
    if (cart.length === 0) {
      toast.error('Ajoutez des produits avant de valider')
      return
    }
    if (isAdmin) {
      if (!customerId) {
        toast.error('En tant que manager, vous devez sélectionner un client pour la vente.')
        return
      }
      if (!sellerId) {
        toast.error('En tant que manager, vous devez sélectionner le vendeur ayant réalisé la vente.')
        return
      }
    }
    setSubmitting(true)
    try {
      const cartSnapshot = [...cart]
      const customer = customers.find(c => c._id === customerId) || null
      const seller = isAdmin ? sellers.find(s => s._id === sellerId) : user

      await Promise.all(
        cart.map(item =>
          salesAPI.create({
            projectId: user?.projectId,
            productId: item.productId,
            customerId: customerId || undefined,
            sellerId: isAdmin ? sellerId : user?._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            description: '',
          })
        )
      )

      setCart([])
      setCustomerId('')
      setSellerId('')
      toast.success(`${cartSnapshot.length} vente(s) enregistrée(s) avec succès`)
      setReceipt(buildReceipt(cartSnapshot, customer, seller))
      onValidated?.()
    } catch (error) {
      console.error('Error adding sales:', error)
      toast.error(error.response?.data?.error || "Impossible d'ajouter les ventes")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] items-start">
      {/* Catalogue produits */}
      <div className="card p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="input-field pl-10"
          />
        </div>
        {filteredProducts.length === 0 ? (
          <EmptyState icon={Package} title="Aucun produit" description="Ajoutez des produits depuis la page Produits" />
        ) : (
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
            {filteredProducts.map(product => {
              const inCart = cart.find(i => i.productId === product._id)
              return (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className={`relative rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                    inCart ? 'border-gold-500/60 bg-gold-500/[0.06]' : 'border-night-600 hover:border-night-500 bg-night-900'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 rounded-full bg-gold-500 text-night-950 text-[11px] font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />
                  ) : (
                    <span className="w-full h-20 rounded-lg bg-night-700 flex items-center justify-center mb-2">
                      <Package className="w-7 h-7 text-gray-600" />
                    </span>
                  )}
                  <p className="text-[13px] font-semibold text-cream truncate">{product.name}</p>
                  <p className="text-[12.5px] text-gold-400 font-bold mt-0.5">{formatPrice(product.unitPrice)}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Panier */}
      <div className="card p-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-cream flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gold-500" />
            Panier ({cart.length})
          </h3>
          {cart.length > 0 && (
            <button onClick={() => setClearConfirm(true)} className="btn-ghost !p-1.5 text-red-400" title="Vider le panier">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-[13px] text-gray-500 text-center py-8">Cliquez sur un produit pour l'ajouter</p>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center gap-2 p-2.5 rounded-xl bg-night-900 border border-night-700">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-cream truncate">{item.productName}</p>
                  <p className="text-[11.5px] text-gray-500">{formatPrice(item.unitPrice)} / unité</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-night-700 hover:bg-night-600 flex items-center justify-center text-gray-300">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-[13px] font-bold text-cream">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 flex items-center justify-center text-gold-400">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-night-700 space-y-4">
          {isAdmin && (
            <>
              <SearchSelect
                label="Client *"
                icon={User}
                items={customers}
                value={customerId}
                onChange={setCustomerId}
                getLabel={(c) => c.name}
                getSub={(c) => c.phone || c.email}
                placeholder="Sélectionner un client"
              />
              <SearchSelect
                label="Vendeur *"
                icon={Store}
                items={sellers}
                value={sellerId}
                onChange={setSellerId}
                getLabel={(s) => s.fullName || s.username}
                getSub={(s) => s.username}
                placeholder="Sélectionner le vendeur"
              />
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Total</span>
            <span className="text-xl font-extrabold text-gold-400">{formatPrice(cartTotal)}</span>
          </div>

          <button onClick={handleValidate} disabled={submitting || cart.length === 0} className="btn-primary w-full !py-3">
            {submitting ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-5 h-5" />}
            Valider la vente
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={() => { setCart([]); setClearConfirm(false) }}
        title="Vider le panier"
        message={`Êtes-vous sûr de vouloir supprimer les ${cart.length} produit(s) du panier ?`}
        confirmText="Vider"
      />

      <ReceiptShareModal open={!!receipt} onClose={() => setReceipt(null)} message={receipt || ''} title="Reçu de vente" />
    </div>
  )
}

// ============= Page principale =============

export default function SalesPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [salesPage, setSalesPage] = useState(1)
  const [salesHasMore, setSalesHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tab, setTab] = useState('pos')
  const [refundTarget, setRefundTarget] = useState(null)
  const [refunding, setRefunding] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editSellerId, setEditSellerId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [shareMessage, setShareMessage] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const loadData = useCallback(async () => {
    try {
      const [salesRes, productsRes, customersRes, usersRes] = await Promise.all([
        salesAPI.getAll(user?.projectId, 1, 50),
        productsAPI.getAll(user?.projectId),
        customersAPI.getAll(user?.projectId),
        usersAPI.getAll(user?.projectId),
      ])
      setSales(salesRes.data?.data || [])
      setSalesPage(1)
      setSalesHasMore(salesRes.data?.pagination?.hasMore ?? false)
      setProducts(productsRes?.data?.data || [])
      setCustomers(customersRes?.data?.data || [])
      setSellers(usersRes?.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  useEffect(() => { loadData() }, [loadData])

  const loadMoreSales = async () => {
    if (loadingMore || !salesHasMore) return
    setLoadingMore(true)
    try {
      const nextPage = salesPage + 1
      const res = await salesAPI.getAll(user?.projectId, nextPage, 50)
      setSales(prev => [...prev, ...(res.data?.data || [])])
      setSalesPage(nextPage)
      setSalesHasMore(res.data?.pagination?.hasMore ?? false)
    } catch (error) {
      console.error('Error loading more sales:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const totalSales = useMemo(
    () => sales.reduce((sum, sale) => sum + (sale.amount || 0), 0),
    [sales]
  )

  const buildSaleReceipt = (sale) => {
    const qty = sale.quantity || 1
    return (
      `🧾 *REÇU DE VENTE*\n━━━━━━━━━━━━━━━━━━\n\n` +
      `📦 *Produit :* ${sale.productId?.name || 'Produit'}\n` +
      `📊 *Quantité :* ${qty}\n` +
      `💵 *Prix unitaire :* ${formatPrice(sale.unitPrice || 0)}\n` +
      (sale.discount > 0 ? `🏷️ *Remise :* -${formatPrice(sale.discount)}\n` : '') +
      `💰 *Total :* ${formatPrice(sale.amount || 0)}\n\n` +
      `👤 *Client :* ${sale.customerId?.name || 'Client inconnu'}\n` +
      `🏪 *Vendeur :* ${sale.employeeId?.fullName || sale.employeeId?.username || 'Vendeur'}\n` +
      `📅 *Date :* ${formatDate(sale.date)}\n\n` +
      `━━━━━━━━━━━━━━━━━━\nMerci pour votre achat ! 🙏`
    )
  }

  const handleRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    try {
      await salesAPI.refund(refundTarget._id)
      toast.success('Remboursement effectué avec succès')
      setRefundTarget(null)
      await loadData()
    } catch (error) {
      console.error('Error refunding sale:', error)
      toast.error(error.response?.data?.error || 'Impossible de rembourser cette vente')
    } finally {
      setRefunding(false)
    }
  }

  const openEditSale = (sale) => {
    setEditingSale(sale)
    setEditCustomerId(sale.customerId?._id || '')
    setEditSellerId(sale.employeeId?._id || '')
  }

  const handleUpdateSale = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    try {
      await salesAPI.update(editingSale._id, {
        customerId: editCustomerId,
        employeeId: editSellerId,
      })
      setEditingSale(null)
      toast.success('Vente modifiée avec succès')
      await loadData()
    } catch (error) {
      console.error('Error updating sale:', error)
      toast.error(error.response?.data?.error || 'Impossible de modifier la vente')
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return <div className="p-4 sm:p-6"><div className="card"><SkeletonTable rows={6} /></div></div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader
        title={isAdmin ? 'Ventes' : 'Point de Vente'}
        description={isAdmin ? `${sales.length} vente(s) chargée(s)` : 'Effectuez vos ventes rapidement'}
      >
        {isAdmin && (
          <>
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              <Upload className="w-4 h-4" />
              Importer CSV
            </button>
            <div className="card !rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Wallet className="w-5 h-5 text-gold-500" />
              <div>
                <p className="text-[11px] text-gray-500">Total des ventes</p>
                <p className="text-[15px] font-extrabold text-gold-400 leading-tight">{formatPrice(totalSales)}</p>
              </div>
            </div>
          </>
        )}
      </PageHeader>

      {isAdmin && (
        <TabBar
          tabs={[{ key: 'pos', label: '🛒 Point de vente' }, { key: 'history', label: '📋 Historique' }]}
          active={tab}
          onChange={setTab}
          className="max-w-md"
        />
      )}

      {(!isAdmin || tab === 'pos') && (
        <PointOfSale
          products={products}
          customers={customers}
          sellers={sellers}
          isAdmin={isAdmin}
          user={user}
          formatPrice={formatPrice}
          onValidated={loadData}
        />
      )}

      {isAdmin && tab === 'history' && (
        <div className="card overflow-hidden">
          {sales.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Aucune vente enregistrée" description="Les ventes validées apparaîtront ici" />
          ) : (
            <>
              <div className="divide-y divide-night-700/60">
                {sales.map((item) => {
                  if (!item) return null
                  const isRefund = item.amount < 0
                  const isRefunded = item.description?.includes('Remboursement')
                  return (
                    <div key={item._id} className={`flex items-start gap-3 p-4 ${isRefund ? 'bg-red-500/[0.04]' : ''}`}>
                      {item.productId?.image ? (
                        <img src={item.productId.image} alt="" className={`w-11 h-11 rounded-xl object-cover flex-shrink-0 ${isRefund ? 'opacity-60' : ''}`} />
                      ) : (
                        <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isRefund ? 'bg-red-500/10' : 'bg-gold-500/10'}`}>
                          {isRefund ? <Undo2 className="w-5 h-5 text-red-400" /> : <Package className="w-5 h-5 text-gold-500" />}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-bold ${isRefund ? 'text-red-400' : 'text-gold-400'}`}>
                          {isRefund ? '' : '+'}{formatPrice(item.amount || 0)}
                        </p>
                        <p className="text-[13px] text-gray-300 truncate">
                          {item.productId?.name || 'Produit'} x{item.quantity || 1}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.customerId?.name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/10 text-[11px] font-medium text-gold-400">
                              <User className="w-3 h-3" />{item.customerId.name}
                            </span>
                          )}
                          {(item.employeeId?.fullName || item.employeeId?.username) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[11px] font-medium text-emerald-400">
                              <Store className="w-3 h-3" />{item.employeeId?.fullName || item.employeeId?.username}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className={`text-[12px] mt-1 ${isRefund ? 'text-red-400/70' : 'text-gray-500'}`}>{item.description}</p>
                        )}
                        <p className="text-[11.5px] text-gray-600 mt-1">{formatDate(item.date)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setShareMessage(buildSaleReceipt(item))} className="btn-ghost !p-2" title="Partager le reçu">
                          <Share2 className="w-4 h-4 text-gold-500" />
                        </button>
                        {!isRefund && !isRefunded && (
                          <>
                            <button onClick={() => openEditSale(item)} className="btn-ghost !p-2" title="Modifier">
                              <Pencil className="w-4 h-4 text-gold-500" />
                            </button>
                            <button onClick={() => setRefundTarget(item)} className="btn-ghost !p-2" title="Rembourser">
                              <Undo2 className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {salesHasMore && (
                <div className="p-4 flex justify-center border-t border-night-700/60">
                  <button onClick={loadMoreSales} disabled={loadingMore} className="btn-secondary">
                    {loadingMore ? <Spinner className="w-4 h-4" /> : 'Charger plus de ventes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation remboursement */}
      <ConfirmDialog
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        loading={refunding}
        title="Confirmer le remboursement"
        message={refundTarget
          ? `Produit : ${refundTarget.productId?.name || 'Produit'} x${refundTarget.quantity || 1} · Montant : ${formatPrice(refundTarget.amount || 0)} · Client : ${refundTarget.customerId?.name || 'Client inconnu'}. Cette action créera une vente négative et remettra le stock.`
          : ''}
        confirmText="Rembourser"
      />

      {/* Modal édition vente */}
      <Modal open={!!editingSale} onClose={() => setEditingSale(null)} title="Modifier la vente" size="sm">
        <form onSubmit={handleUpdateSale} className="p-5 space-y-4">
          <SearchSelect
            label="Client"
            icon={User}
            items={customers}
            value={editCustomerId}
            onChange={setEditCustomerId}
            getLabel={(c) => c.name}
            getSub={(c) => c.phone || c.email}
            placeholder="Sélectionner un client"
          />
          <SearchSelect
            label="Vendeur"
            icon={Store}
            items={sellers}
            value={editSellerId}
            onChange={setEditSellerId}
            getLabel={(s) => s.fullName || s.username}
            getSub={(s) => s.username}
            placeholder="Sélectionner le vendeur"
          />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setEditingSale(null)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={savingEdit} className="btn-primary flex-1">
              {savingEdit ? <Spinner className="w-4 h-4" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <ReceiptShareModal open={!!shareMessage} onClose={() => setShareMessage(null)} message={shareMessage || ''} title="Reçu de vente" />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="sales"
        onImported={loadData}
      />
    </div>
  )
}
