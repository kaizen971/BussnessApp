import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search, X, UserRound, Mail, Phone, Users, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { customersAPI } from '../services/api'
import { Modal, EmptyState, PageHeader, SkeletonTable, Spinner } from '../components/ui'
import CsvImportModal from '../components/CsvImportModal'

export default function CustomersPage() {
  const { user } = useAuth()
  const { format: formatPrice } = useCurrency()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
  const [importOpen, setImportOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const loadCustomers = useCallback(async () => {
    try {
      const response = await customersAPI.getAll(user?.projectId)
      setCustomers(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Impossible de charger les clients')
    } finally {
      setLoading(false)
    }
  }, [user?.projectId])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return customers
    return customers.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    )
  }, [customers, searchQuery])

  const openCustomerModal = (customer = null) => {
    if (customer) {
      setSelectedCustomer(customer)
      setFormData({ name: customer.name, email: customer.email || '', phone: customer.phone || '' })
    } else {
      setSelectedCustomer(null)
      setFormData({ name: '', email: '', phone: '' })
    }
    setModalVisible(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name?.trim()) {
      toast.error('Veuillez saisir un nom')
      return
    }
    setSaving(true)
    try {
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      }
      if (selectedCustomer) {
        await customersAPI.update(selectedCustomer._id, customerData)
        toast.success('Client modifié avec succès')
      } else {
        await customersAPI.create({ ...customerData, projectId: user?.projectId })
        toast.success('Client ajouté avec succès')
      }
      setFormData({ name: '', email: '', phone: '' })
      setSelectedCustomer(null)
      setModalVisible(false)
      await loadCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
      const errorMessage = error.response?.status === 403
        ? "Vous n'avez pas les permissions nécessaires pour créer un client"
        : (error.response?.data?.error || 'Impossible de sauvegarder le client')
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto">
      <PageHeader title="Clients CRM" description={`${customers.length} client(s) enregistré(s)`}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un client..."
            className="input-field pl-10 pr-9 sm:w-64"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => setImportOpen(true)} className="btn-secondary">
            <Upload className="w-4 h-4" />
            Importer CSV
          </button>
        )}
        <button onClick={() => openCustomerModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouveau client
        </button>
      </PageHeader>

      {searchQuery && (
        <p className="text-[13px] text-gray-500">
          {filteredCustomers.length} client{filteredCustomers.length !== 1 ? 's' : ''} trouvé{filteredCustomers.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="card"><SkeletonTable rows={5} cols={3} /></div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={searchQuery ? 'Aucun résultat' : 'Aucun client enregistré'}
            description={searchQuery ? `Aucun client ne correspond à "${searchQuery}"` : 'Ajoutez votre premier client'}
            action={!searchQuery ? () => openCustomerModal() : undefined}
            actionLabel="Nouveau client"
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCustomers.map((item) => (
            <button
              key={item._id}
              onClick={isAdmin ? () => openCustomerModal(item) : undefined}
              className={`card p-4 text-left flex items-start gap-3 animate-in ${isAdmin ? 'card-hover' : 'cursor-default'}`}
            >
              <span className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                <UserRound className="w-5 h-5 text-gold-500" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-cream truncate">{item.name}</span>
                {item.email && (
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-500 mt-1">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.email}</span>
                  </span>
                )}
                {item.phone && (
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {item.phone}
                  </span>
                )}
                <span className="inline-block mt-2.5 px-2.5 py-1 rounded-lg bg-night-900 border border-night-700">
                  <span className="block text-[13px] font-bold text-gold-400">{formatPrice(item.totalPurchases || 0)}</span>
                  <span className="block text-[10px] text-gray-500 uppercase tracking-wide">Total achats</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title={selectedCustomer ? 'Modifier client' : 'Nouveau client'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="input-label">Nom *</label>
            <div className="relative">
              <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nom du client" className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="input-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="input-label">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="input-field pl-10" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : selectedCustomer ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="customers"
        onImported={loadCustomers}
      />
    </div>
  )
}
