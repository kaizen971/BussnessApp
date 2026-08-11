import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, LayoutGrid, Pencil, Trash2 } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Modal, ConfirmDialog, EmptyState, PageHeader, SkeletonTable, Spinner } from '../components/ui'

const SUGGESTIONS = ['Boissons', 'Soins', 'Accessoires', 'Vêtements', 'Alimentation', 'Services']

export default function CategoriesPage() {
  const { user, selectedProjectId } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryName, setCategoryName] = useState('')

  const projectId = selectedProjectId || user?.projectId
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'responsable'

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/categories', { params: { projectId } })
      setCategories(response.data?.data || [])
    } catch (error) {
      console.error('Error loading categories', error)
      toast.error('Impossible de charger les catégories')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadCategories() }, [loadCategories])

  const openCreate = () => {
    setCategoryName('')
    setEditingCategory(null)
    setModalVisible(true)
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setModalVisible(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      toast.error('Veuillez entrer un nom de catégorie')
      return
    }
    try {
      setSaving(true)
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, { name: categoryName, projectId })
        toast.success('Catégorie modifiée')
      } else {
        await api.post('/categories', { name: categoryName, projectId })
        toast.success('Catégorie créée')
      }
      setModalVisible(false)
      setCategoryName('')
      setEditingCategory(null)
      loadCategories()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/categories/${deleteTarget._id}`)
      toast.success('Catégorie supprimée')
      setDeleteTarget(null)
      loadCategories()
    } catch {
      toast.error('Impossible de supprimer la catégorie')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1000px] mx-auto">
      <PageHeader title="Catégories" description={`${categories.length} catégorie(s)`}>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouvelle catégorie
          </button>
        )}
      </PageHeader>

      {loading ? (
        <div className="card"><SkeletonTable rows={4} cols={3} /></div>
      ) : categories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LayoutGrid}
            title="Aucune catégorie"
            description="Créez une catégorie pour organiser vos produits"
            action={isAdmin ? openCreate : undefined}
            actionLabel="Créer une catégorie"
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((item) => (
            <div key={item._id} className="card-hover p-4 flex items-center gap-3 animate-in">
              <span className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-5 h-5 text-gold-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream truncate">{item.name}</p>
                <p className="text-[11.5px] text-gray-500">
                  Créée le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(item)} className="btn-ghost !p-2" title="Modifier">
                    <Pencil className="w-4 h-4 text-gold-500" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="btn-ghost !p-2" title="Supprimer">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalVisible}
        onClose={() => { setModalVisible(false); setCategoryName(''); setEditingCategory(null) }}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        size="sm"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="input-label">Nom de la catégorie</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex: Boissons, Soins, Accessoires..."
              autoFocus
              className="input-field"
            />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCategoryName(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-night-700 hover:bg-gold-500/15 hover:text-gold-400 text-[12.5px] text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setModalVisible(false); setCategoryName(''); setEditingCategory(null) }}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="w-4 h-4" /> : editingCategory ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Voulez-vous vraiment supprimer la catégorie "${deleteTarget?.name}" ?`}
        confirmText="Supprimer"
      />
    </div>
  )
}
