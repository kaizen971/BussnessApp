require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3003;

// IMPORTANT: Trust proxy configuration
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Augmenter la limite pour les images base64
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "BussnessApp"
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// Schemas
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  logo: String, // URL ou URI de l'image du logo
  currency: { type: String, enum: ['EUR', 'XOF'], default: 'XOF' }, // Devise du business (EUR ou XOF/CFA)
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Propriétaire du business
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: { type: String, required: true },
  description: String,
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true }, // Prix de revient
  category: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SaleSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employé qui a effectué la vente
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true }, // Montant total
  discount: { type: Number, default: 0 }, // Remise appliquée
  description: String,
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const ExpenseSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  amount: { type: Number, required: true },
  category: { type: String, enum: ['purchase', 'variable', 'fixed'], required: true },
  description: String,
  date: { type: Date, default: Date.now },
  isRecurring: { type: Boolean, default: false },
  recurringDay: { type: Number, min: 1, max: 28 }, // Jour du mois (1-28 pour éviter les problèmes de fin de mois)
  lastRecurringDate: { type: Date }, // Dernière date où la dépense récurrente a été générée
  parentExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }, // Référence à la dépense récurrente parente
  createdAt: { type: Date, default: Date.now }
});

const StockSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Lien avec un produit (optionnel)
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  minQuantity: { type: Number, default: 0 },
  sku: String, // Code SKU pour identifier le produit
  location: String, // Emplacement physique dans l'entrepôt
  updatedAt: { type: Date, default: Date.now }
});

// Schema pour tracer les mouvements de stock
const StockMovementSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  type: { type: String, enum: ['in', 'out', 'adjustment', 'sale', 'return'], required: true },
  quantity: { type: Number, required: true }, // Positif pour entrées, négatif pour sorties
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  unitPrice: { type: Number },
  reason: String, // Raison du mouvement (achat, vente, ajustement inventaire, etc.)
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }, // Lien avec vente si applicable
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Qui a effectué le mouvement
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const CustomerSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: { type: String, required: true },
  email: String,
  phone: String,
  totalPurchases: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyLevel: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  discount: { type: Number, default: 0 }, // Remise personnalisée en %
  notes: String, // Notes sur le client
  lastPurchaseDate: Date,
  history: [{
    date: Date,
    amount: Number,
    description: String,
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'responsable', 'manager', 'cashier'], default: 'cashier' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Projet actif (pour compatibilité)
  projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // Liste des projets pour un responsable
  fullName: String,
  photo: String, // URL ou URI de la photo de profil
  isActive: { type: Boolean, default: true },
  commissionRate: { type: Number, default: 0 }, // Taux de commission en % (ex: 5 pour 5%)
  totalCommissions: { type: Number, default: 0 }, // Total des commissions gagnées
  hourlyRate: { type: Number, default: 0 }, // Salaire horaire en € (ex: 15 pour 15€/h)
  createdAt: { type: Date, default: Date.now }
});

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  type: { type: String, enum: ['bug', 'feature', 'improvement', 'other'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in_review', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Schema pour le planning des employés
const ScheduleSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // L'employé concerné
  date: { type: Date, required: true }, // Date du shift
  startTime: { type: String, required: true }, // Heure de début (format: "09:00")
  endTime: { type: String, required: true }, // Heure de fin (format: "17:00")
  duration: { type: Number }, // Durée en heures (calculé automatiquement)
  dailySalary: { type: Number, default: null }, // Salaire journalier ponctuel (si null, utilise hourlyRate * duration)
  status: { type: String, enum: ['scheduled', 'completed', 'absent', 'cancelled'], default: 'scheduled' },
  notes: String, // Notes supplémentaires
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Qui a créé ce planning
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema pour suivre les commissions des employés
const CommissionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  amount: { type: Number, required: true }, // Montant de la commission
  rate: { type: Number, required: true }, // Taux appliqué (%)
  saleAmount: { type: Number, required: true }, // Montant de la vente
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const CategorySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#4CAF50' },
  createdAt: { type: Date, default: Date.now }
});

// Models
const Project = mongoose.model('Project', ProjectSchema);
const Product = mongoose.model('Product', ProductSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Stock = mongoose.model('Stock', StockSchema);
const StockMovement = mongoose.model('StockMovement', StockMovementSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const User = mongoose.model('User', UserSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);
const Commission = mongoose.model('Commission', CommissionSchema);
const Category = mongoose.model('Category', CategorySchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'bussnessapp_secret_key_2025';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role checking middleware
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Routes de base
app.get('/BussnessApp', (req, res) => {
  res.json({ message: 'BussnessApp API is running', version: '1.0.0' });
});

// ============= AUTH ROUTES =============

// Register
app.post('/BussnessApp/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName, role, projectId } = req.body;

    // Validation détaillée des champs requis
    if (!username || username.trim() === '') {
      return res.status(400).json({
        error: 'Nom d\'utilisateur requis',
        field: 'username',
        code: 'MISSING_USERNAME'
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        error: 'Email requis',
        field: 'email',
        code: 'MISSING_EMAIL'
      });
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Format d\'email invalide',
        field: 'email',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    if (!password || password.trim() === '') {
      return res.status(400).json({
        error: 'Mot de passe requis',
        field: 'password',
        code: 'MISSING_PASSWORD'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 6 caractères',
        field: 'password',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({
        error: 'Nom complet requis',
        field: 'fullName',
        code: 'MISSING_FULLNAME'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({
          error: 'Ce nom d\'utilisateur est déjà utilisé',
          field: 'username',
          code: 'USERNAME_EXISTS'
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({
          error: 'Cet email est déjà utilisé',
          field: 'email',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // IMPORTANT: Lors de l'inscription, l'utilisateur devient automatiquement "responsable"
    // et non "cashier". Chaque responsable peut gérer plusieurs projets de business.
    const userRole = role || 'admin';

    // Create user
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      role: userRole,
      projectId,
      projectIds: [] // Initialisé vide, sera rempli après création du projet
    });

    await user.save();

    // Créer automatiquement un projet par défaut pour le nouveau responsable
    const defaultProject = new Project({
      name: `Business de ${fullName.trim()}`,
      description: 'Mon premier projet sur BussnessApp',
      category: 'general',
      ownerId: user._id
    });
    await defaultProject.save();

    // Assigner ce projet au nouvel utilisateur (projectId = projet actif, projectIds = liste de tous ses projets)
    user.projectId = defaultProject._id;
    user.projectIds = [defaultProject._id];
    await user.save();

    console.log(`Nouveau responsable créé: ${user.username} avec projet: ${defaultProject.name}`);

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, projectId: user.projectId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    console.error('Registration error:', error);

    // Gestion des erreurs MongoDB spécifiques
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        error: `Erreur de validation: ${error.errors[field].message}`,
        field: field,
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `Ce ${field === 'username' ? 'nom d\'utilisateur' : 'email'} est déjà utilisé`,
        field: field,
        code: 'DUPLICATE_KEY'
      });
    }

    // Erreur générique avec détails
    res.status(500).json({
      error: 'Erreur lors de l\'inscription. Veuillez réessayer.',
      details: error.message,
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login
app.post('/BussnessApp/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation des champs
    if (!username || username.trim() === '') {
      return res.status(400).json({
        error: 'Nom d\'utilisateur ou email requis',
        field: 'username',
        code: 'MISSING_USERNAME'
      });
    }

    if (!password || password.trim() === '') {
      return res.status(400).json({
        error: 'Mot de passe requis',
        field: 'password',
        code: 'MISSING_PASSWORD'
      });
    }

    // Find user
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.status(401).json({
        error: 'Identifiants invalides - utilisateur introuvable',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Compte désactivé - contactez un administrateur',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Identifiants invalides - mot de passe incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, projectId: user.projectId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion. Veuillez réessayer.',
      details: error.message,
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user
app.get('/BussnessApp/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log pour déboguer le projectId
    console.log('Auth/me - User data:', {
      id: user._id,
      username: user.username,
      projectId: user.projectId,
      hasProjectId: !!user.projectId
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.post('/BussnessApp/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route utilitaire pour assigner un projectId par défaut aux utilisateurs (admin only)
app.post('/BussnessApp/auth/assign-default-project', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    // Trouver ou créer un projet par défaut
    let defaultProject = await Project.findOne({ name: 'Projet par défaut' });

    if (!defaultProject) {
      defaultProject = new Project({
        name: 'Projet par défaut',
        description: 'Projet créé automatiquement pour les utilisateurs sans projet',
        category: 'general',
        ownerId: req.user.id  // L'admin qui exécute cette route devient propriétaire
      });
      await defaultProject.save();
      console.log('Default project created:', defaultProject._id);
    }

    // Trouver tous les utilisateurs sans projectId
    const usersWithoutProject = await User.find({
      $or: [
        { projectId: null },
        { projectId: { $exists: false } }
      ]
    });

    console.log(`Found ${usersWithoutProject.length} users without projectId`);

    // Assigner le projet par défaut à ces utilisateurs
    const updatePromises = usersWithoutProject.map(user => {
      user.projectId = defaultProject._id;
      return user.save();
    });

    await Promise.all(updatePromises);

    res.json({
      message: 'Default project assigned successfully',
      projectId: defaultProject._id,
      usersUpdated: usersWithoutProject.length,
      users: usersWithoutProject.map(u => ({ id: u._id, username: u.username }))
    });
  } catch (error) {
    console.error('Error assigning default project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route de migration pour assigner un ownerId aux projets existants
app.post('/BussnessApp/projects/migrate-owner', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    // Trouver tous les projets sans ownerId
    const projectsWithoutOwner = await Project.find({
      $or: [
        { ownerId: null },
        { ownerId: { $exists: false } }
      ]
    });

    console.log(`Found ${projectsWithoutOwner.length} projects without ownerId`);

    if (projectsWithoutOwner.length === 0) {
      return res.json({
        message: 'All projects already have an owner',
        projectsUpdated: 0
      });
    }

    // Assigner l'admin actuel comme propriétaire de tous ces projets
    const updatePromises = projectsWithoutOwner.map(project => {
      project.ownerId = req.user.id;
      return project.save();
    });

    await Promise.all(updatePromises);

    res.json({
      message: 'Projects migrated successfully',
      projectsUpdated: projectsWithoutOwner.length,
      projects: projectsWithoutOwner.map(p => ({ id: p._id, name: p.name }))
    });
  } catch (error) {
    console.error('Error migrating projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= FEEDBACK ROUTES =============

// Get all feedback
app.get('/BussnessApp/feedback', authenticateToken, async (req, res) => {
  try {
    const { projectId, status, type } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const feedback = await Feedback.find(filter)
      .populate('userId', 'username email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create feedback
app.post('/BussnessApp/feedback', authenticateToken, async (req, res) => {
  try {
    const feedback = new Feedback({
      ...req.body,
      userId: req.user.id
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update feedback status (admin/manager/responsable only)
app.put('/BussnessApp/feedback/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Projects Routes
app.get('/BussnessApp/projects', authenticateToken, async (req, res) => {
  try {
    // Filtrer les projets par propriétaire : chaque responsable ne voit que ses propres business
    // Les caissiers ne voient que le projet auquel ils sont assignés
    const filter = (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'responsable')
      ? { ownerId: req.user.id }  // Responsables/Admins voient seulement leurs projets
      : { _id: req.user.projectId };  // Caissiers voient seulement leur projet assigné

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/projects', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    // Assigner automatiquement l'utilisateur comme propriétaire du projet
    const project = new Project({
      ...req.body,
      ownerId: req.user.id  // L'utilisateur connecté devient propriétaire
    });
    await project.save();

    // Ajouter ce projet à la liste des projets du responsable
    const user = await User.findById(req.user.id);

    // Si c'est le premier projet de l'utilisateur, l'assigner comme projet actif
    if (!user.projectId) {
      user.projectId = project._id;
    }

    // Ajouter à la liste des projets si pas déjà présent
    if (!user.projectIds) {
      user.projectIds = [];
    }
    if (!user.projectIds.includes(project._id)) {
      user.projectIds.push(project._id);
    }

    await user.save();

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/BussnessApp/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Vérifier que l'utilisateur a accès à ce projet
    // Responsables/Admins ne peuvent accéder qu'à leurs propres projets
    if ((req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'responsable') &&
      project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Les caissiers ne peuvent accéder qu'au projet qui leur est assigné
    if (req.user.role === 'cashier' &&
      (!req.user.projectId || project._id.toString() !== req.user.projectId.toString())) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/BussnessApp/projects/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if ((req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'responsable') &&
      existingProject.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own projects' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ownerId: existingProject.ownerId, updatedAt: Date.now() }, // Préserver le ownerId
      { new: true }
    );
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/BussnessApp/projects/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own projects' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project currency
app.put('/BussnessApp/projects/:id/currency', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { currency } = req.body;

    if (!currency || !['EUR', 'XOF'].includes(currency)) {
      return res.status(400).json({ error: 'Devise invalide. Utilisez EUR ou XOF' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres projets' });
    }

    project.currency = currency;
    project.updatedAt = Date.now();
    await project.save();

    res.json({ 
      message: 'Devise mise à jour avec succès',
      project 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories Routes
app.get('/BussnessApp/categories', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/categories', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { name, color, projectId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
    }

    // Vérifier si la catégorie existe déjà pour ce projet
    const existingCategory = await Category.findOne({ 
      projectId, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Cette catégorie existe déjà' });
    }

    const category = new Category({
      name,
      color: color || '#4CAF50',
      projectId
    });

    await category.save();
    res.status(201).json({ data: category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/BussnessApp/categories/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }
    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products Routes
app.get('/BussnessApp/products', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    console.log(filter)
    const products = await Product.find(filter).sort({ name: 1 });
    // NOUVEAU : Enrichir les produits avec les informations de stock
    const productsWithStock = await Promise.all(products.map(async (product) => {
      const stockItem = await Stock.findOne({
        $or: [
          { productId: product._id },
          { name: product.name }
        ]
      });

      return {
        ...product.toObject(),
        stock: stockItem ? {
          quantity: stockItem.quantity,
          minQuantity: stockItem.minQuantity,
          isLowStock: stockItem.minQuantity > 0 && stockItem.quantity <= stockItem.minQuantity,
          stockId: stockItem._id
        } : null
      };
    }));

    res.json({ data: productsWithStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/products', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/products/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/BussnessApp/products/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales Routes
app.get('/BussnessApp/sales', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const sales = await Sale.find(filter)
      .populate('productId', 'name unitPrice')
      .populate('customerId', 'name phone email')
      .populate('employeeId', 'username fullName')
      .sort({ date: -1 });
    res.json({ data: sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/sales', authenticateToken, async (req, res) => {
  try {
    const { customerId, productId, quantity, unitPrice, discount, projectId } = req.body;
    
    console.log(req.body)

    // Validation des champs requis
    if (!productId || !quantity || !unitPrice) {
      return res.status(400).json({
        error: 'Produit, quantité et prix unitaire sont requis'
      });
    }

    // Calculer le montant total
    const amount = (quantity * unitPrice) - (discount || 0);

    const sale = new Sale({
      projectId,
      productId,
      customerId: customerId || undefined,
      quantity,
      unitPrice,
      discount: discount || 0,
      description: req.body.description,
      amount,
      employeeId: req.user.id // L'employé connecté
    });

    await sale.save();

    // Mettre à jour le client si présent
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        customer.totalPurchases += amount;
        customer.loyaltyPoints += Math.floor(amount / 10); // 1 point par 10 unités monétaires
        customer.lastPurchaseDate = new Date();

        // Système de fidélité automatique
        if (customer.loyaltyPoints >= 1000) {
          customer.loyaltyLevel = 'platinum';
          customer.discount = 15;
        } else if (customer.loyaltyPoints >= 500) {
          customer.loyaltyLevel = 'gold';
          customer.discount = 10;
        } else if (customer.loyaltyPoints >= 200) {
          customer.loyaltyLevel = 'silver';
          customer.discount = 5;
        } else if (customer.loyaltyPoints >= 50) {
          customer.loyaltyLevel = 'bronze';
          customer.discount = 2;
        }

        customer.history.push({
          date: new Date(),
          amount,
          description: req.body.description || 'Vente',
          saleId: sale._id
        });

        await customer.save();
      }
    }

    // NOUVEAU : Gestion automatique du stock
    // Chercher un article de stock lié à ce produit
    // D'abord récupérer les infos du produit
    const product = await Product.findById(productId);

    const stockItem = await Stock.findOne({
      projectId,
      $or: [
        { productId: productId }, // Chercher par productId
        ...(product ? [{ name: product.name }] : []) // Fallback par nom du produit si le produit existe
      ]
    });
    
    console.log(stockItem);

    if (stockItem) {
      const previousQuantity = stockItem.quantity;
      const newQuantity = previousQuantity - quantity;

      // Vérifier si le stock est suffisant
      if (newQuantity < 0) {
        console.warn(`Stock insuffisant pour ${stockItem.name}. Stock actuel: ${previousQuantity}, demandé: ${quantity}`);
        // On continue quand même la vente mais on log un warning
      }

      // Mettre à jour le stock
      stockItem.quantity = Math.max(0, newQuantity); // Ne pas descendre en dessous de 0
      stockItem.updatedAt = Date.now();
      await stockItem.save();

      // Enregistrer le mouvement de stock
      const movement = new StockMovement({
        projectId,
        stockId: stockItem._id,
        productId,
        type: 'sale',
        quantity: -quantity, // Négatif pour une sortie
        previousQuantity,
        newQuantity: stockItem.quantity,
        unitPrice,
        reason: 'Vente',
        saleId: sale._id,
        userId: req.user.id,
        notes: req.body.description
      });
      await movement.save();

      console.log(`Stock mis à jour: ${stockItem.name} - ${previousQuantity} → ${stockItem.quantity}`);
    } else {
      console.log(`Aucun stock trouvé pour le produit ${product?.name || productId}. La vente est enregistrée mais le stock n'est pas mis à jour.`);
    }

    // NOUVEAU : Calcul automatique des commissions pour l'employé
    const employee = await User.findById(req.user.id);
    if (employee && employee.commissionRate > 0) {
      const commissionAmount = (amount * employee.commissionRate) / 100;

      // Créer l'enregistrement de commission
      const commission = new Commission({
        projectId,
        userId: req.user.id,
        saleId: sale._id,
        amount: commissionAmount,
        rate: employee.commissionRate,
        saleAmount: amount
      });
      await commission.save();

      // Mettre à jour le total des commissions de l'employé
      employee.totalCommissions += commissionAmount;
      await employee.save();

      console.log(`Commission créée: ${commissionAmount}€ pour ${employee.fullName}`);
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate('productId', 'name unitPrice')
      .populate('customerId', 'name phone')
      .populate('employeeId', 'username fullName');

    res.status(201).json({ data: populatedSale });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(400).json({ error: error.message });
  }
});

// Refund a sale
app.post('/BussnessApp/sales/:id/refund', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const saleId = req.params.id;

    // Récupérer la vente originale
    const originalSale = await Sale.findById(saleId)
      .populate('productId')
      .populate('customerId')
      .populate('employeeId');

    if (!originalSale) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }

    // Vérifier que la vente n'a pas déjà été remboursée
    const existingRefund = await Sale.findOne({
      description: { $regex: `Remboursement.*${saleId}` }
    });

    if (existingRefund) {
      return res.status(400).json({ error: 'Cette vente a déjà été remboursée' });
    }

    // Créer une vente négative (remboursement)
    const refundSale = new Sale({
      projectId: originalSale.projectId,
      productId: originalSale.productId._id,
      customerId: originalSale.customerId?._id,
      employeeId: req.user.id, // L'employé qui effectue le remboursement
      quantity: -originalSale.quantity, // Quantité négative
      unitPrice: originalSale.unitPrice,
      amount: -originalSale.amount, // Montant négatif
      discount: 0,
      description: `Remboursement de la vente #${saleId} - ${originalSale.description || 'Vente'}`,
      date: new Date()
    });

    await refundSale.save();

    // Remettre le stock
    const stockItem = await Stock.findOne({
      projectId: originalSale.projectId,
      $or: [
        { productId: originalSale.productId._id },
        { name: originalSale.productId.name }
      ]
    });

    if (stockItem) {
      const previousQuantity = stockItem.quantity;
      const newQuantity = previousQuantity + originalSale.quantity; // Ajouter la quantité remboursée

      stockItem.quantity = newQuantity;
      stockItem.updatedAt = Date.now();
      await stockItem.save();

      // Enregistrer le mouvement de stock
      const movement = new StockMovement({
        projectId: originalSale.projectId,
        stockId: stockItem._id,
        productId: originalSale.productId._id,
        type: 'return',
        quantity: originalSale.quantity, // Positif pour un retour
        previousQuantity,
        newQuantity,
        unitPrice: originalSale.unitPrice,
        reason: 'Remboursement',
        saleId: refundSale._id,
        userId: req.user.id,
        notes: `Remboursement de la vente #${saleId}`
      });
      await movement.save();

      console.log(`Stock restauré: ${stockItem.name} - ${previousQuantity} → ${newQuantity}`);
    }

    // Ajuster les points de fidélité du client
    if (originalSale.customerId) {
      const customer = await Customer.findById(originalSale.customerId._id);
      if (customer) {
        customer.totalPurchases -= originalSale.amount;
        const pointsToRemove = Math.floor(originalSale.amount / 10);
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - pointsToRemove);

        // Réajuster le niveau de fidélité
        if (customer.loyaltyPoints >= 1000) {
          customer.loyaltyLevel = 'platinum';
          customer.discount = 15;
        } else if (customer.loyaltyPoints >= 500) {
          customer.loyaltyLevel = 'gold';
          customer.discount = 10;
        } else if (customer.loyaltyPoints >= 200) {
          customer.loyaltyLevel = 'silver';
          customer.discount = 5;
        } else if (customer.loyaltyPoints >= 50) {
          customer.loyaltyLevel = 'bronze';
          customer.discount = 2;
        } else {
          customer.loyaltyLevel = 'bronze';
          customer.discount = 0;
        }

        customer.history.push({
          date: new Date(),
          amount: -originalSale.amount,
          description: `Remboursement - ${originalSale.description || 'Vente'}`,
          saleId: refundSale._id
        });

        await customer.save();
        console.log(`Points de fidélité ajustés pour ${customer.name}: -${pointsToRemove} points`);
      }
    }

    // Ajuster les commissions de l'employé original
    const originalCommission = await Commission.findOne({
      saleId: originalSale._id
    });

    if (originalCommission) {
      // Créer une commission négative
      const refundCommission = new Commission({
        projectId: originalSale.projectId,
        userId: originalSale.employeeId._id,
        saleId: refundSale._id,
        amount: -originalCommission.amount,
        rate: originalCommission.rate,
        saleAmount: -originalSale.amount,
        status: 'pending'
      });
      await refundCommission.save();

      // Mettre à jour le total des commissions de l'employé
      const employee = await User.findById(originalSale.employeeId._id);
      if (employee) {
        employee.totalCommissions = Math.max(0, employee.totalCommissions - originalCommission.amount);
        await employee.save();
        console.log(`Commission ajustée pour ${employee.fullName}: -${originalCommission.amount}€`);
      }
    }

    const populatedRefund = await Sale.findById(refundSale._id)
      .populate('productId', 'name unitPrice')
      .populate('customerId', 'name phone')
      .populate('employeeId', 'username fullName');

    res.status(201).json({
      message: 'Remboursement effectué avec succès',
      data: populatedRefund,
      originalSale: originalSale
    });
  } catch (error) {
    console.error('Error refunding sale:', error);
    res.status(400).json({ error: error.message });
  }
});

// Expenses Routes
app.get('/BussnessApp/expenses', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les dépenses récurrentes
app.get('/BussnessApp/recurring-expenses', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = { isRecurring: true, parentExpenseId: { $exists: false } };
    if (projectId) filter.projectId = projectId;
    const recurringExpenses = await Expense.find(filter).sort({ recurringDay: 1 });
    res.json({ data: recurringExpenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/expenses', authenticateToken, async (req, res) => {
  try {
    const expenseData = { ...req.body };

    // Si c'est une dépense récurrente, définir la date de dernière génération
    if (expenseData.isRecurring && expenseData.recurringDay) {
      expenseData.lastRecurringDate = new Date();
    }

    const expense = new Expense(expenseData);
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Supprimer une dépense récurrente
app.delete('/BussnessApp/recurring-expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }
    if (!expense.isRecurring) {
      return res.status(400).json({ error: 'Cette dépense n\'est pas récurrente' });
    }
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Dépense récurrente supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier une dépense récurrente
app.put('/BussnessApp/recurring-expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { amount, description, category, recurringDay } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { amount, description, category, recurringDay },
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }
    res.json({ data: expense });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stock Routes
app.get('/BussnessApp/stock', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    console.log(projectId)
    const stock = await Stock.find(filter).sort({ name: 1 });
    res.json({ data: stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/stock', authenticateToken, async (req, res) => {
  try {
    const { name, quantity, unitPrice, minQuantity, projectId, productId } = req.body;

    // Log pour débugger
    console.log('Creating stock with data:', { name, quantity, unitPrice, minQuantity, projectId, productId, userId: req.user?.id });

    // Validation des champs requis
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom de l\'article est requis' });
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({ error: 'La quantité est requise' });
    }

    if (unitPrice === undefined || unitPrice === null || unitPrice === '') {
      return res.status(400).json({ error: 'Le prix unitaire est requis' });
    }

    // Validation des types numériques
    const parsedQuantity = parseFloat(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);
    const parsedMinQuantity = minQuantity ? parseFloat(minQuantity) : 0;

    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ error: 'La quantité doit être un nombre positif' });
    }

    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return res.status(400).json({ error: 'Le prix unitaire doit être un nombre positif' });
    }

    if (isNaN(parsedMinQuantity) || parsedMinQuantity < 0) {
      return res.status(400).json({ error: 'La quantité minimale doit être un nombre positif' });
    }

    const stock = new Stock({
      name: name.trim(),
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      minQuantity: parsedMinQuantity,
      projectId,
      productId: productId || undefined // Ajouter le productId s'il existe
    });

    await stock.save();
    console.log('Stock created successfully:', stock._id);
    res.status(201).json({ data: stock });
  } catch (error) {
    console.error('Error creating stock:', error);

    // Gestion spécifique des erreurs MongoDB
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation',
        details: Object.values(error.errors).map(e => e.message)
      });
    }

    if (error.name === 'MongoServerError' || error.name === 'MongoError') {
      return res.status(500).json({
        error: 'Erreur de base de données',
        message: 'Impossible de créer le stock. Vérifiez la connexion à la base de données.'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création du stock',
      message: error.message
    });
  }
});

app.put('/BussnessApp/stock/:id', authenticateToken, async (req, res) => {
  try {
    const { name, quantity, unitPrice, minQuantity, productId } = req.body;

    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    const previousQuantity = stock.quantity;
    const updateData = {
      updatedAt: Date.now()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
    if (minQuantity !== undefined) updateData.minQuantity = parseFloat(minQuantity);
    if (productId !== undefined) updateData.productId = productId;

    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Enregistrer le mouvement si la quantité a changé
    if (quantity !== undefined && parseFloat(quantity) !== previousQuantity) {
      const newQuantity = parseFloat(quantity);
      const movement = new StockMovement({
        projectId: stock.projectId,
        stockId: stock._id,
        productId: stock.productId,
        type: 'adjustment',
        quantity: newQuantity - previousQuantity,
        previousQuantity,
        newQuantity,
        unitPrice: stock.unitPrice,
        reason: 'Ajustement manuel',
        userId: req.user.id,
        notes: 'Modification du stock'
      });
      await movement.save();
    }

    res.json({ data: updatedStock });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(400).json({ error: error.message });
  }
});

// NOUVEAUX ENDPOINTS POUR LA GESTION DU STOCK

// Obtenir l'historique des mouvements de stock
app.get('/BussnessApp/stock/:id/movements', authenticateToken, async (req, res) => {
  try {
    const movements = await StockMovement.find({ stockId: req.params.id })
      .populate('userId', 'username fullName')
      .populate('productId', 'name')
      .populate('saleId')
      .sort({ createdAt: -1 });

    res.json({ data: movements });
  } catch (error) {
    console.error('Error loading stock movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtenir tous les mouvements de stock d'un projet
app.get('/BussnessApp/stock-movements', authenticateToken, async (req, res) => {
  try {
    const { projectId, type, startDate, endDate } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const movements = await StockMovement.find(filter)
      .populate('stockId', 'name sku')
      .populate('productId', 'name')
      .populate('userId', 'username fullName')
      .populate('saleId')
      .sort({ createdAt: -1 });

    res.json({ data: movements });
  } catch (error) {
    console.error('Error loading stock movements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un mouvement de stock manuel (entrée/sortie)
app.post('/BussnessApp/stock-movements', authenticateToken, async (req, res) => {
  try {
    const { stockId, type, quantity, reason, notes } = req.body;

    if (!stockId || !type || !quantity) {
      return res.status(400).json({ error: 'stockId, type et quantity sont requis' });
    }

    const stock = await Stock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ error: 'Article de stock non trouvé' });
    }

    const previousQuantity = stock.quantity;
    const quantityChange = type === 'in' ? Math.abs(quantity) : -Math.abs(quantity);
    const newQuantity = Math.max(0, previousQuantity + quantityChange);

    // Mettre à jour le stock
    stock.quantity = newQuantity;
    stock.updatedAt = Date.now();
    await stock.save();

    // Créer le mouvement
    const movement = new StockMovement({
      projectId: stock.projectId,
      stockId: stock._id,
      productId: stock.productId,
      type,
      quantity: quantityChange,
      previousQuantity,
      newQuantity,
      unitPrice: stock.unitPrice,
      reason: reason || (type === 'in' ? 'Approvisionnement' : 'Sortie manuelle'),
      userId: req.user.id,
      notes
    });
    await movement.save();

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('stockId', 'name sku')
      .populate('userId', 'username fullName');

    res.status(201).json({ data: populatedMovement });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(400).json({ error: error.message });
  }
});

// Statistiques de stock
app.get('/BussnessApp/stock-stats/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const stock = await Stock.find({ projectId });
    const movements = await StockMovement.find({ projectId });

    // Valeur totale du stock
    const totalValue = stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Articles en stock bas
    const lowStockItems = stock.filter(item => item.minQuantity > 0 && item.quantity <= item.minQuantity);

    // Mouvements récents (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMovements = movements.filter(m => new Date(m.createdAt) >= sevenDaysAgo);

    // Produits les plus vendus (via mouvements de type 'sale')
    const salesMovements = movements.filter(m => m.type === 'sale');
    const productSales = {};

    for (const movement of salesMovements) {
      const productId = movement.productId?.toString();
      if (productId) {
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            totalQuantity: 0,
            movements: 0
          };
        }
        productSales[productId].totalQuantity += Math.abs(movement.quantity);
        productSales[productId].movements += 1;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Rotation du stock (mouvements par rapport au stock disponible)
    const stockTurnover = stock.map(item => {
      const itemMovements = movements.filter(m =>
        m.stockId?.toString() === item._id.toString() &&
        m.type === 'sale'
      );
      const totalSold = itemMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const turnoverRate = item.quantity > 0 ? (totalSold / item.quantity).toFixed(2) : 0;

      return {
        name: item.name,
        currentQuantity: item.quantity,
        totalSold,
        turnoverRate: parseFloat(turnoverRate)
      };
    }).sort((a, b) => b.turnoverRate - a.turnoverRate).slice(0, 10);

    res.json({
      totalStockValue: totalValue,
      totalItems: stock.length,
      lowStockItemsCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(item => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity
      })),
      recentMovementsCount: recentMovements.length,
      topProducts,
      stockTurnover
    });
  } catch (error) {
    console.error('Error loading stock stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lier un produit à un article de stock
app.post('/BussnessApp/stock/:stockId/link-product', authenticateToken, async (req, res) => {
  try {
    const { stockId } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId est requis' });
    }

    const stock = await Stock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ error: 'Article de stock non trouvé' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    stock.productId = productId;
    stock.updatedAt = Date.now();
    await stock.save();

    res.json({
      data: stock,
      message: `Stock "${stock.name}" lié au produit "${product.name}"`
    });
  } catch (error) {
    console.error('Error linking product to stock:', error);
    res.status(400).json({ error: error.message });
  }
});

// Customers Routes
app.get('/BussnessApp/customers', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json({ data: customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/customers', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, projectId } = req.body;

    // Log pour débugger
    console.log('Creating customer with data:', { name, email, phone, projectId, userId: req.user?.id });

    // Validation du nom (requis)
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom du client est requis' });
    }

    const customer = new Customer({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      projectId
    });

    await customer.save();
    console.log('Customer created successfully:', customer._id);
    res.status(201).json({ data: customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/customers/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const updateData = {
      updatedAt: Date.now()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ data: customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({ error: error.message });
  }
});

// Users Routes
app.get('/BussnessApp/users', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    console.log(filter)
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/users', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { username, email, password, fullName, role, projectId, photo } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        error: existingUser.username === username ?
          'Ce nom d\'utilisateur existe déjà' :
          'Cet email existe déjà'
      });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      photo,
      role: role || 'cashier',
      projectId
    });

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user role (admin only)
app.put('/BussnessApp/users/:id/role', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Deactivate/activate user (admin only)
app.put('/BussnessApp/users/:id/status', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============= SCHEDULE ROUTES =============

// Obtenir tous les plannings (avec filtres)
app.get('/BussnessApp/schedules', authenticateToken, async (req, res) => {
  try {
    const { projectId, userId, startDate, endDate, status } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;

    // Les salariés ne voient que leur propre planning
    if (req.user.role === 'cashier') {
      filter.userId = req.user.id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const schedules = await Schedule.find(filter)
      .populate('userId', 'username fullName role photo hourlyRate')
      .populate('createdBy', 'username fullName')
      .sort({ date: 1, startTime: 1 });

    res.json({ data: schedules });
  } catch (error) {
    console.error('Error loading schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le planning d'un utilisateur spécifique
app.get('/BussnessApp/schedules/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Vérifier que l'utilisateur a le droit de voir ce planning
    if (req.user.role === 'cashier' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const filter = { userId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const schedules = await Schedule.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ date: 1, startTime: 1 });

    // Calculer les statistiques
    const totalHours = schedules
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    const scheduledHours = schedules
      .filter(s => s.status === 'scheduled')
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    res.json({
      data: schedules,
      stats: {
        totalSchedules: schedules.length,
        totalHours,
        scheduledHours,
        completedShifts: schedules.filter(s => s.status === 'completed').length
      }
    });
  } catch (error) {
    console.error('Error loading user schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer un nouveau planning (simple ou récurrent)
app.post('/BussnessApp/schedules', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { userId, date, startTime, endTime, notes, projectId, isRecurring, recurringDays, endDate } = req.body;

    if (!userId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Tous les champs requis doivent être remplis' });
    }

    // Calculer la durée
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const duration = (end - start) / (1000 * 60 * 60); // Durée en heures

    if (duration <= 0) {
      return res.status(400).json({ error: 'L\'heure de fin doit être après l\'heure de début' });
    }

    // Si c'est un planning récurrent
    if (isRecurring && recurringDays && recurringDays.length > 0) {
      const startDate = new Date(date);
      const finalEndDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 jours par défaut
      const createdSchedules = [];

      // Créer les plannings pour chaque occurrence
      let currentDate = new Date(startDate);
      while (currentDate <= finalEndDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

        // Si ce jour est dans la liste des jours récurrents
        if (recurringDays.includes(dayOfWeek)) {
          const schedule = new Schedule({
            projectId: projectId || req.user.projectId,
            userId,
            date: new Date(currentDate),
            startTime,
            endTime,
            duration,
            notes,
            createdBy: req.user.id
          });
          await schedule.save();
          createdSchedules.push(schedule);
        }

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const populatedSchedules = await Schedule.find({
        _id: { $in: createdSchedules.map(s => s._id) }
      })
        .populate('userId', 'username fullName role photo hourlyRate')
        .populate('createdBy', 'username fullName');

      res.status(201).json({
        data: populatedSchedules,
        count: createdSchedules.length,
        message: `${createdSchedules.length} planning(s) créé(s) avec succès`
      });
    } else {
      // Planning simple (une seule date)
      const schedule = new Schedule({
        projectId: projectId || req.user.projectId,
        userId,
        date: new Date(date),
        startTime,
        endTime,
        duration,
        notes,
        createdBy: req.user.id
      });

      await schedule.save();

      const populatedSchedule = await Schedule.findById(schedule._id)
        .populate('userId', 'username fullName role photo hourlyRate')
        .populate('createdBy', 'username fullName');

      res.status(201).json({ data: populatedSchedule });
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mettre à jour un planning
app.put('/BussnessApp/schedules/:id', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime, status, notes, dailySalary } = req.body;
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ error: 'Planning non trouvé' });
    }

    // Vérifier les permissions : admin/manager peut tout modifier, salarié peut modifier son propre dailySalary
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'responsable';
    const isOwnSchedule = schedule.userId.toString() === req.user.id;

    if (!isAdmin && !isOwnSchedule) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Calculer la nouvelle durée si les heures changent
    if (startTime && endTime) {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const duration = (end - start) / (1000 * 60 * 60);

      if (duration <= 0) {
        return res.status(400).json({ error: 'L\'heure de fin doit être après l\'heure de début' });
      }

      schedule.duration = duration;
    }

    if (date) schedule.date = new Date(date);
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    if (status) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;
    // Permettre de définir dailySalary (null pour revenir au calcul par défaut)
    if (dailySalary !== undefined) schedule.dailySalary = dailySalary;
    schedule.updatedAt = Date.now();

    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('userId', 'username fullName role photo hourlyRate')
      .populate('createdBy', 'username fullName');

    res.json({ data: populatedSchedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Supprimer un planning
app.delete('/BussnessApp/schedules/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({ error: 'Planning non trouvé' });
    }

    res.json({ message: 'Planning supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= COMMISSION ROUTES =============

// Obtenir les commissions
app.get('/BussnessApp/commissions', authenticateToken, async (req, res) => {
  try {
    const { projectId, userId, status, startDate, endDate } = req.query;
    const filter = {};

    if (projectId) filter.projectId = projectId;

    // Les salariés ne voient que leurs propres commissions
    if (req.user.role === 'cashier') {
      filter.userId = req.user.id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const commissions = await Commission.find(filter)
      .populate('userId', 'username fullName commissionRate')
      .populate('saleId', 'amount quantity')
      .sort({ date: -1 });

    // Calculer le total
    const total = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const paid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

    res.json({
      data: commissions,
      stats: {
        total,
        pending,
        paid,
        count: commissions.length
      }
    });
  } catch (error) {
    console.error('Error loading commissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marquer une commission comme payée
app.put('/BussnessApp/commissions/:id/pay', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: 'paid' },
      { new: true }
    ).populate('userId', 'username fullName');

    if (!commission) {
      return res.status(404).json({ error: 'Commission non trouvée' });
    }

    res.json({ data: commission });
  } catch (error) {
    console.error('Error updating commission:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mettre à jour le taux de commission d'un utilisateur
app.put('/BussnessApp/users/:id/commission', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { commissionRate } = req.body;

    if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ error: 'Taux de commission invalide (0-100%)' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { commissionRate },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating commission rate:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mettre à jour le salaire horaire d'un utilisateur
app.put('/BussnessApp/users/:id/hourly-rate', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { hourlyRate } = req.body;

    if (hourlyRate === undefined || hourlyRate < 0) {
      return res.status(400).json({ error: 'Salaire horaire invalide (minimum 0€)' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { hourlyRate },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating hourly rate:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mettre à jour les informations d'un utilisateur (nom et email)
app.put('/BussnessApp/users/:id/info', authenticateToken, checkRole('admin', 'responsable'), async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Le nom complet et l\'email sont requis' });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre utilisateur' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating user info:', error);
    res.status(400).json({ error: error.message });
  }
});

// Modifier la photo d'un utilisateur (admin uniquement)
app.put('/BussnessApp/users/:id/photo', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { photo } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { photo },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error updating user photo:', error);
    res.status(400).json({ error: error.message });
  }
});

// Modifier le mot de passe d'un utilisateur (admin uniquement)
app.put('/BussnessApp/users/:id/password', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier que l'admin ne modifie pas son propre mot de passe via cette route
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Utilisez la fonctionnalité de changement de mot de passe personnel' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Error updating user password:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtenir les statistiques de salaire pour un utilisateur
app.get('/BussnessApp/users/:id/salary-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { startDate, endDate, month, year } = req.query;

    // Vérifier que l'utilisateur a le droit de voir ces stats
    if (req.user.role === 'cashier' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Définir la période
    let periodStart, periodEnd;

    if (month && year) {
      // Mois spécifique
      periodStart = new Date(year, month - 1, 1);
      periodEnd = new Date(year, month, 0, 23, 59, 59);
    } else if (startDate && endDate) {
      // Période personnalisée
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    } else {
      // Mois actuel par défaut
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Récupérer tous les plannings complétés dans la période
    const schedules = await Schedule.find({
      userId: userId,
      status: 'completed',
      date: {
        $gte: periodStart,
        $lte: periodEnd
      }
    }).sort({ date: 1 });

    // Calculer les heures totales et le salaire
    const totalHours = schedules.reduce((sum, s) => sum + (s.duration || 0), 0);
    // Calcul du salaire : utilise dailySalary si défini, sinon hourlyRate * duration
    const totalSalary = schedules.reduce((sum, s) => {
      if (s.dailySalary !== null && s.dailySalary !== undefined) {
        return sum + s.dailySalary;
      }
      return sum + ((s.duration || 0) * (user.hourlyRate || 0));
    }, 0);

    // Récupérer les commissions de la période
    const commissions = await Commission.find({
      userId: userId,
      date: {
        $gte: periodStart,
        $lte: periodEnd
      }
    });

    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const paidCommissions = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

    // Salaire total (salaire + commissions)
    const totalEarnings = totalSalary + totalCommissions;

    // Grouper par semaine
    const weeklyStats = {};
    schedules.forEach(schedule => {
      const weekNumber = getWeekNumber(new Date(schedule.date));
      if (!weeklyStats[weekNumber]) {
        weeklyStats[weekNumber] = {
          week: weekNumber,
          hours: 0,
          salary: 0,
          days: 0
        };
      }
      weeklyStats[weekNumber].hours += schedule.duration || 0;
      // Utilise dailySalary si défini, sinon hourlyRate * duration
      if (schedule.dailySalary !== null && schedule.dailySalary !== undefined) {
        weeklyStats[weekNumber].salary += schedule.dailySalary;
      } else {
        weeklyStats[weekNumber].salary += (schedule.duration || 0) * (user.hourlyRate || 0);
      }
      weeklyStats[weekNumber].days += 1;
    });

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        hourlyRate: user.hourlyRate || 0,
        commissionRate: user.commissionRate || 0
      },
      period: {
        start: periodStart,
        end: periodEnd,
        label: periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      },
      hours: {
        total: totalHours,
        completed: schedules.length,
        average: schedules.length > 0 ? (totalHours / schedules.length).toFixed(2) : 0
      },
      salary: {
        hourly: totalSalary,
        commissions: totalCommissions,
        total: totalEarnings
      },
      commissions: {
        total: totalCommissions,
        pending: pendingCommissions,
        paid: paidCommissions,
        count: commissions.length
      },
      weeklyStats: Object.values(weeklyStats),
      schedules: schedules.map(s => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        dailySalary: s.dailySalary,
        salary: s.dailySalary !== null && s.dailySalary !== undefined
          ? s.dailySalary
          : (s.duration || 0) * (user.hourlyRate || 0)
      }))
    });
  } catch (error) {
    console.error('Error loading salary stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fonction helper pour obtenir le numéro de semaine
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-S${weekNo}`;
}

// Simulation Business Plan Route
app.post('/BussnessApp/simulation', authenticateToken, async (req, res) => {
  try {
    const {
      productName,
      unitPrice,
      costPrice,
      variableCosts = 0, // Coûts variables unitaires
      initialInvestment = 0, // Investissements de départ
      monthlyRent = 0,
      monthlySalaries = 0,
      monthlyMarketing = 0,
      monthlySupplies = 0,
      monthlySubscriptions = 0,
      monthlyUtilities = 0,
      otherMonthlyExpenses = 0,
      estimatedMonthlySales = 0,
      analysisPeriodMonths = 6
    } = req.body;

    // Calculs
    const unitMargin = unitPrice - (costPrice + variableCosts);
    const marginPercentage = ((unitMargin / unitPrice) * 100).toFixed(2);

    const totalMonthlyFixed = monthlyRent + monthlySalaries + monthlyMarketing +
      monthlySupplies + monthlySubscriptions +
      monthlyUtilities + otherMonthlyExpenses;

    // Point mort (Break-even point) = nombre de ventes pour couvrir les charges fixes
    const breakEvenUnits = unitMargin > 0 ? Math.ceil(totalMonthlyFixed / unitMargin) : 0;
    const breakEvenRevenue = breakEvenUnits * unitPrice;

    // Prévisions
    const monthlyRevenue = estimatedMonthlySales * unitPrice;
    const monthlyCostOfGoods = estimatedMonthlySales * (costPrice + variableCosts);
    const monthlyGrossProfit = monthlyRevenue - monthlyCostOfGoods;
    const monthlyNetProfit = monthlyGrossProfit - totalMonthlyFixed;

    // Prévisions sur la période d'analyse
    const totalRevenue = monthlyRevenue * analysisPeriodMonths;
    const totalProfit = monthlyNetProfit * analysisPeriodMonths;
    const totalInvestmentRecovery = totalProfit - initialInvestment;
    const monthsToRecoverInvestment = monthlyNetProfit > 0 ?
      Math.ceil(initialInvestment / monthlyNetProfit) : -1;

    // Projection mensuelle
    const monthlyProjections = [];
    let cumulativeProfit = -initialInvestment;

    for (let month = 1; month <= analysisPeriodMonths; month++) {
      cumulativeProfit += monthlyNetProfit;
      monthlyProjections.push({
        month,
        revenue: monthlyRevenue,
        expenses: monthlyCostOfGoods + totalMonthlyFixed,
        netProfit: monthlyNetProfit,
        cumulativeProfit: cumulativeProfit
      });
    }

    res.json({
      summary: {
        productName,
        unitPrice,
        costPrice,
        unitMargin,
        marginPercentage: `${marginPercentage}%`,
        initialInvestment,
        totalMonthlyFixed
      },
      breakEven: {
        unitsNeeded: breakEvenUnits,
        revenueNeeded: breakEvenRevenue
      },
      monthlyForecasts: {
        revenue: monthlyRevenue,
        costOfGoods: monthlyCostOfGoods,
        grossProfit: monthlyGrossProfit,
        fixedExpenses: totalMonthlyFixed,
        netProfit: monthlyNetProfit
      },
      periodAnalysis: {
        analysisMonths: analysisPeriodMonths,
        totalRevenue,
        totalProfit,
        totalInvestmentRecovery,
        monthsToRecoverInvestment: monthsToRecoverInvestment > 0 ?
          monthsToRecoverInvestment : 'Non rentable avec ces paramètres',
        isViable: totalInvestmentRecovery > 0
      },
      projections: monthlyProjections
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dashboard Stats Route
app.get('/BussnessApp/dashboard/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const sales = await Sale.find({ projectId }).populate('productId', 'name');
    const expenses = await Expense.find({ projectId });
    const stock = await Stock.find({ projectId });

    const totalSales = (sales && Array.isArray(sales)) ? sales.reduce((sum, sale) => sum + sale.amount, 0) : 0;
    const totalExpenses = (expenses && Array.isArray(expenses)) ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const totalStock = (stock && Array.isArray(stock)) ? stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) : 0;
    const netProfit = totalSales - totalExpenses;

    // Calculer les données mensuelles pour les 6 derniers mois
    const now = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= monthDate && saleDate < nextMonthDate;
      });

      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthDate && expenseDate < nextMonthDate;
      });

      const monthlySalesTotal = monthSales.reduce((sum, sale) => sum + sale.amount, 0);
      const monthlyExpensesTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      monthlyData.push({
        month: monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        sales: monthlySalesTotal,
        expenses: monthlyExpensesTotal,
        profit: monthlySalesTotal - monthlyExpensesTotal
      });
    }

    // Données par catégorie de dépenses
    const expensesByCategory = {
      purchase: expenses.filter(e => e.category === 'purchase').reduce((sum, e) => sum + e.amount, 0),
      variable: expenses.filter(e => e.category === 'variable').reduce((sum, e) => sum + e.amount, 0),
      fixed: expenses.filter(e => e.category === 'fixed').reduce((sum, e) => sum + e.amount, 0)
    };

    // Top produits vendus
    const productSales = {};
    for (const sale of sales) {
      const productId = sale.productId?.toString();
      if (productId) {
        if (!productSales[productId]) {
          productSales[productId] = {
            quantity: 0,
            revenue: 0,
            productName: sale.productId?.name || 'Produit inconnu'
          };
        }
        productSales[productId].quantity += sale.quantity;
        productSales[productId].revenue += sale.amount;
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      totalSales,
      totalExpenses,
      totalStock,
      netProfit,
      salesCount: sales.length,
      expensesCount: expenses.length,
      stockItems: stock.length,
      monthlyData,
      expensesByCategory,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Excel Route
app.post('/BussnessApp/export-excel/:projectId',  async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.body;
    console.log("test",projectId,startDate,endDate)

    // Validation des dates
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    // Import du module xlsx
    const XLSX = require('xlsx');

    // Récupérer le projet pour avoir la devise
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    const currencySymbol = project.currency === 'XOF' ? 'CFA' : '€';

    // Récupération de toutes les données avec filtrage par date
    const [sales, expenses, stocks, customers, employees, commissions, schedules] = await Promise.all([
      Sale.find({
        projectId,
        date: { $gte: start, $lte: end }
      }).populate('productId').populate('customerId').populate('employeeId'),
      Expense.find({
        projectId,
        date: { $gte: start, $lte: end }
      }),
      Stock.find({ projectId }).populate('productId'),
      Customer.find({ projectId }),
      User.find({ projectId }),
      Commission.find({
        projectId,
        date: { $gte: start, $lte: end }
      }).populate('userId').populate('saleId'),
      Schedule.find({
        projectId,
        date: { $gte: start, $lte: end }
      }).populate('userId')
    ]);

    // Création du workbook
    const workbook = XLSX.utils.book_new();

    // ===== FEUILLE VENTES =====
    const salesData = sales.map(sale => ({
      'Date': new Date(sale.date).toLocaleDateString('fr-FR'),
      'Produit': sale.productId?.name || 'N/A',
      'Client': sale.customerId?.name || 'N/A',
      'Employé': sale.employeeId?.fullName || sale.employeeId?.username || 'N/A',
      'Quantité': sale.quantity,
      'Prix Unitaire': sale.unitPrice.toFixed(2) + ' ' + currencySymbol,
      'Remise': sale.discount + ' %',
      'Montant Total': sale.amount.toFixed(2) + ' ' + currencySymbol,
      'Description': sale.description || ''
    }));
    const salesSheet = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventes');

    // ===== FEUILLE DÉPENSES =====
    const expensesData = expenses.map(expense => ({
      'Date': new Date(expense.date).toLocaleDateString('fr-FR'),
      'Catégorie': expense.category === 'purchase' ? 'Achat' :
        expense.category === 'variable' ? 'Variable' : 'Fixe',
      'Montant': expense.amount.toFixed(2) + ' ' + currencySymbol,
      'Description': expense.description || '',
      'Récurrent': expense.isRecurring ? 'Oui' : 'Non'
    }));
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Dépenses');

    // ===== FEUILLE STOCKS =====
    const stocksData = stocks.map(stock => ({
      'Nom': stock.name,
      'Produit lié': stock.productId?.name || 'N/A',
      'SKU': stock.sku || 'N/A',
      'Quantité': stock.quantity,
      'Prix Unitaire': stock.unitPrice.toFixed(2) + ' ' + currencySymbol,
      'Valeur Totale': (stock.quantity * stock.unitPrice).toFixed(2) + ' ' + currencySymbol,
      'Quantité Minimale': stock.minQuantity,
      'Emplacement': stock.location || 'N/A',
      'Dernière MAJ': new Date(stock.updatedAt).toLocaleDateString('fr-FR')
    }));
    const stocksSheet = XLSX.utils.json_to_sheet(stocksData);
    XLSX.utils.book_append_sheet(workbook, stocksSheet, 'Stocks');

    // ===== FEUILLE EMPLOYÉS =====
    const employeesData = employees.map(employee => ({
      'Nom complet': employee.fullName || 'N/A',
      'Username': employee.username,
      'Email': employee.email,
      'Rôle': employee.role === 'admin' ? 'Administrateur' :
        employee.role === 'manager' ? 'Responsable' :
          employee.role === 'responsable' ? 'Responsable' : 'Caissier',
      'Taux commission': employee.commissionRate + ' %',
      'Commissions totales': employee.totalCommissions.toFixed(2) + ' ' + currencySymbol,
      'Taux horaire': employee.hourlyRate.toFixed(2) + ' ' + currencySymbol + '/h',
      'Actif': employee.isActive ? 'Oui' : 'Non',
      'Date création': new Date(employee.createdAt).toLocaleDateString('fr-FR')
    }));
    const employeesSheet = XLSX.utils.json_to_sheet(employeesData);
    XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Employés');

    // ===== FEUILLE COMMISSIONS =====
    const commissionsData = commissions.map(commission => ({
      'Date': new Date(commission.date).toLocaleDateString('fr-FR'),
      'Employé': commission.userId?.fullName || commission.userId?.username || 'N/A',
      'Montant vente': commission.saleAmount.toFixed(2) + ' ' + currencySymbol,
      'Taux': commission.rate + ' %',
      'Montant commission': commission.amount.toFixed(2) + ' ' + currencySymbol,
      'Statut': commission.status === 'paid' ? 'Payée' : 'En attente'
    }));
    const commissionsSheet = XLSX.utils.json_to_sheet(commissionsData);
    XLSX.utils.book_append_sheet(workbook, commissionsSheet, 'Commissions');

    // ===== FEUILLE SALAIRES (basé sur le planning) =====
    const salariesData = schedules.map(schedule => {
      const employee = schedule.userId;
      const duration = schedule.duration || 0;
      const hourlyRate = employee?.hourlyRate || 0;
      const salary = duration * hourlyRate;

      return {
        'Date': new Date(schedule.date).toLocaleDateString('fr-FR'),
        'Employé': employee?.fullName || employee?.username || 'N/A',
        'Heure début': schedule.startTime,
        'Heure fin': schedule.endTime,
        'Durée (heures)': duration,
        'Taux horaire': hourlyRate.toFixed(2) + ' ' + currencySymbol + '/h',
        'Salaire': salary.toFixed(2) + ' ' + currencySymbol,
        'Statut': schedule.status === 'completed' ? 'Complété' :
          schedule.status === 'absent' ? 'Absent' :
            schedule.status === 'cancelled' ? 'Annulé' : 'Planifié',
        'Notes': schedule.notes || ''
      };
    });
    const salariesSheet = XLSX.utils.json_to_sheet(salariesData);
    XLSX.utils.book_append_sheet(workbook, salariesSheet, 'Salaires');

    // ===== FEUILLE CLIENTS =====
    const customersData = customers.map(customer => ({
      'Nom': customer.name,
      'Email': customer.email || 'N/A',
      'Téléphone': customer.phone || 'N/A',
      'Achats totaux': customer.totalPurchases.toFixed(2) + ' ' + currencySymbol,
      'Points fidélité': customer.loyaltyPoints,
      'Niveau': customer.loyaltyLevel === 'bronze' ? 'Bronze' :
        customer.loyaltyLevel === 'silver' ? 'Argent' :
          customer.loyaltyLevel === 'gold' ? 'Or' : 'Platine',
      'Remise': customer.discount + ' %',
      'Dernier achat': customer.lastPurchaseDate ?
        new Date(customer.lastPurchaseDate).toLocaleDateString('fr-FR') : 'N/A',
      'Date création': new Date(customer.createdAt).toLocaleDateString('fr-FR'),
      'Notes': customer.notes || ''
    }));
    const customersSheet = XLSX.utils.json_to_sheet(customersData);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Clients');

    // ===== FEUILLE BILAN =====
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalStock = stocks.reduce((sum, stock) => sum + (stock.quantity * stock.unitPrice), 0);
    const totalCommissions = commissions.reduce((sum, commission) => sum + commission.amount, 0);
    const totalSalaries = schedules.reduce((sum, schedule) => {
      const duration = schedule.duration || 0;
      const hourlyRate = schedule.userId?.hourlyRate || 0;
      return sum + (duration * hourlyRate);
    }, 0);
    const netProfit = totalSales - totalExpenses - totalCommissions - totalSalaries;

    const bilanData = [
      { 'Indicateur': 'Ventes totales', 'Montant': totalSales.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': 'Dépenses totales', 'Montant': totalExpenses.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': 'Commissions totales', 'Montant': totalCommissions.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': 'Salaires totaux', 'Montant': totalSalaries.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': 'Valeur du stock', 'Montant': totalStock.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': 'Bénéfice net (Ventes - Dépenses - Commissions - Salaires)', 'Montant': netProfit.toFixed(2) + ' ' + currencySymbol },
      { 'Indicateur': '', 'Montant': '' },
      { 'Indicateur': 'Nombre de ventes', 'Montant': sales.length },
      { 'Indicateur': 'Nombre de dépenses', 'Montant': expenses.length },
      { 'Indicateur': 'Articles en stock', 'Montant': stocks.length },
      { 'Indicateur': 'Nombre de clients', 'Montant': customers.length },
      { 'Indicateur': 'Nombre d\'employés', 'Montant': employees.length },
      { 'Indicateur': '', 'Montant': '' },
      { 'Indicateur': 'Période', 'Montant': `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}` },
      { 'Indicateur': 'Date d\'export', 'Montant': new Date().toLocaleDateString('fr-FR') }
    ];
    const bilanSheet = XLSX.utils.json_to_sheet(bilanData);
    XLSX.utils.book_append_sheet(workbook, bilanSheet, 'Bilan');

    // Génération du buffer Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Envoi du fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=export_${projectId}_${Date.now()}.xlsx`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global error handler - MUST be after all routes
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Une erreur serveur est survenue',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Fonction pour générer les dépenses récurrentes
async function generateRecurringExpenses() {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Trouver toutes les dépenses récurrentes qui doivent être générées aujourd'hui
    const recurringExpenses = await Expense.find({
      isRecurring: true,
      recurringDay: currentDay,
      parentExpenseId: { $exists: false }
    });

    for (const recurring of recurringExpenses) {
      // Vérifier si on a déjà généré cette dépense ce mois-ci
      const lastDate = recurring.lastRecurringDate;
      if (lastDate) {
        const lastMonth = lastDate.getMonth();
        const lastYear = lastDate.getFullYear();
        if (lastMonth === currentMonth && lastYear === currentYear) {
          continue; // Déjà généré ce mois-ci
        }
      }

      // Créer la nouvelle dépense
      const newExpense = new Expense({
        projectId: recurring.projectId,
        amount: recurring.amount,
        category: recurring.category,
        description: `${recurring.description} (Récurrent - ${today.toLocaleDateString('fr-FR')})`,
        date: today,
        isRecurring: false,
        parentExpenseId: recurring._id
      });
      await newExpense.save();

      // Mettre à jour la date de dernière génération
      recurring.lastRecurringDate = today;
      await recurring.save();

      console.log(`Dépense récurrente générée: ${recurring.description} - ${recurring.amount}`);
    }
  } catch (error) {
    console.error('Erreur lors de la génération des dépenses récurrentes:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log("Version 1.0.0");
  console.log(`Server is running on port ${PORT}`);
  console.log(`API accessible at http://localhost:${PORT}/BussnessApp`);
  console.log(`Public URL: http://localhost:3003/BussnessApp/BussnessApp`);

  // Générer les dépenses récurrentes au démarrage
  await generateRecurringExpenses();

  // Vérifier les dépenses récurrentes toutes les heures
  setInterval(generateRecurringExpenses, 60 * 60 * 1000);
});
