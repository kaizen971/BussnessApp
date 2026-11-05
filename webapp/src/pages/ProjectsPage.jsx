import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Briefcase, CheckCircle2, Pencil, Trash2, ArrowLeftRight, FolderOpen,
  Coins, ImagePlus, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { projectsAPI } from '../services/api'
import { CURRENCIES } from '../utils/currency'
import { Modal, ConfirmDialog, EmptyState, PageHeader, SkeletonCard } from '../components/ui'

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function ProjectsPage() {
  const { isAdmin, isManager, selectedProjectId, selectProject, loadAvailableProjects } = useAuth()
  const { setProjectCurrency } = useCurrency()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [currencyTarget, setCurrencyTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', category: '', logo: null })

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll()
      setProjects(response.data)
      loadAvailableProjects(response.data)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Impossible de charger les projets')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProject = (projectId) => {
    selectProject(projectId)
    const selectedProject = projects.find(p => p._id === projectId)
    if (selectedProject) {
      setProjectCurrency(selectedProject.currency || 'XOF')
    }
    navigate('/')
  }

  const openAddModal = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '', category: '', logo: null })
    setModalVisible(true)
  }

  const openEditModal = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      category: project.category || '',
      logo: project.logo || null,
    })
    setModalVisible(true)
  }

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const base64Image = await fileToBase64(file)
      setFormData(prev => ({ ...prev, logo: base64Image }))
    } catch {
      toast.error("Impossible de traiter l'image. Veuillez réessayer.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Le nom du projet est requis')
      return
    }
    setSaving(true)
    try {
      if (editingProject) {
        await projectsAPI.update(editingProject._id, formData)
        toast.success('Projet modifié avec succès')
      } else {
        await projectsAPI.create(formData)
        toast.success('Projet créé avec succès')
      }
      setModalVisible(false)
      loadProjects()
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la sauvegarde du projet')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await projectsAPI.delete(deleteTarget._id)
      toast.success('Projet supprimé avec succès')
      setDeleteTarget(null)
      loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Impossible de supprimer le projet')
    }
  }

  const handleChangeCurrency = async () => {
    const project = currencyTarget
    if (!project) return
    const newCurrency = (project.currency || 'XOF') === 'EUR' ? 'XOF' : 'EUR'
    try {
      await projectsAPI.updateCurrency(project._id, newCurrency)
      if (selectedProjectId === project._id) {
        setProjectCurrency(newCurrency)
      }
      toast.success(`Devise changée en ${CURRENCIES[newCurrency].name}`)
      setCurrencyTarget(null)
      loadProjects()
    } catch (error) {
      console.error('Error changing currency:', error)
      toast.error('Impossible de changer la devise')
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Mes business" description="Sélectionnez, créez et gérez vos projets">
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouveau business
          </button>
        )}
      </PageHeader>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderOpen}
            title="Aucun projet disponible"
            description={isAdmin ? 'Créez votre premier projet' : 'Contactez un administrateur'}
            action={isAdmin ? openAddModal : undefined}
            actionLabel="Créer un projet"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const isActive = selectedProjectId === project._id
            return (
              <div key={project._id} className={`card-hover p-5 flex flex-col animate-in ${isActive ? '!border-gold-500/60' : ''}`}>
                <button onClick={() => handleSelectProject(project._id)} className="flex items-start gap-3 text-left flex-1">
                  {project.logo ? (
                    <img src={project.logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-gradient-gold-deep' : 'bg-night-700'
                    }`}>
                      {isActive
                        ? <CheckCircle2 className="w-6 h-6 text-night-950" />
                        : <Briefcase className="w-6 h-6 text-gray-400" />}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold text-cream truncate">{project.name}</span>
                    {project.description && (
                      <span className="block text-[13px] text-gray-500 mt-0.5 line-clamp-2">{project.description}</span>
                    )}
                    <span className="flex items-center gap-2 mt-2 flex-wrap">
                      {project.category && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] font-medium text-gray-400 ring-1 ring-white/10">{project.category}</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-[11px] font-medium text-sky-400 ring-1 ring-sky-500/20">
                        <Coins className="w-3 h-3" />
                        {CURRENCIES[project.currency || 'XOF'].symbol}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-gold-500/15 text-[11px] font-semibold text-gold-400 ring-1 ring-gold-500/30">Projet actif</span>
                      )}
                    </span>
                  </span>
                </button>

                {(isAdmin || isManager) && (
                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-night-700/60">
                    <button onClick={() => setCurrencyTarget(project)} className="btn-ghost !px-2.5 !py-1.5 text-sky-400 hover:!text-sky-300">
                      <ArrowLeftRight className="w-4 h-4" />
                      {project.currency === 'XOF' || !project.currency ? 'EUR' : 'CFA'}
                    </button>
                    <span className="flex-1" />
                    <button onClick={() => openEditModal(project)} className="btn-ghost !p-2" title="Modifier">
                      <Pencil className="w-4 h-4 text-gold-500" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => setDeleteTarget(project)} className="btn-ghost !p-2" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création/édition */}
      <Modal open={modalVisible} onClose={() => setModalVisible(false)} title={editingProject ? 'Modifier le projet' : 'Nouveau projet'}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isAdmin && (
            <div>
              <label className="input-label">Logo du business</label>
              <div className="flex items-center gap-3">
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-night-500 hover:border-gold-500/60 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoPick} />
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-7 h-7 text-gray-500" />
                  )}
                </label>
                {formData.logo && (
                  <button type="button" onClick={() => setFormData(p => ({ ...p, logo: null }))} className="btn-ghost !p-2" title="Retirer le logo">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="input-label">Nom du projet *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nom du business" className="input-field" />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Description du business" rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="input-label">Catégorie</label>
            <input type="text" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="Ex : Restauration, Commerce..." className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalVisible(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : editingProject ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        confirmText="Supprimer"
      />

      <ConfirmDialog
        open={!!currencyTarget}
        onClose={() => setCurrencyTarget(null)}
        onConfirm={handleChangeCurrency}
        title="Changer la devise"
        message={`Changer la devise de "${currencyTarget?.name}" en ${
          (currencyTarget?.currency || 'XOF') === 'EUR' ? 'Franc CFA (CFA)' : 'Euro (€)'
        } ? Toute l'équipe verra les montants dans cette devise.`}
        confirmText="Changer"
        variant="info"
      />
    </div>
  )
}
