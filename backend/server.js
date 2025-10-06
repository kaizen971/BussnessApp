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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  createdAt: { type: Date, default: Date.now }
});

const StockSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  minQuantity: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
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
  role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  fullName: String,
  isActive: { type: Boolean, default: true },
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

// Models
const Project = mongoose.model('Project', ProjectSchema);
const Product = mongoose.model('Product', ProductSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Stock = mongoose.model('Stock', StockSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const User = mongoose.model('User', UserSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

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
    if (!req.user || !roles.includes(req.user.role)) {
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

    // Create user
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      role: role || 'cashier',
      projectId
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
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

// Update feedback status (admin/manager only)
app.put('/BussnessApp/feedback/:id', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
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
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/projects', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
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
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/BussnessApp/projects/:id', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/BussnessApp/projects/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products Routes
app.get('/BussnessApp/products', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/products', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/products/:id', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
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

app.delete('/BussnessApp/products/:id', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
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

    // Mettre à jour le stock si produit présent
    if (productId && projectId) {
      const stock = await Stock.findOne({ projectId, name: productId });
      if (stock && stock.quantity >= quantity) {
        stock.quantity -= quantity;
        stock.updatedAt = Date.now();
        await stock.save();
      }
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

app.post('/BussnessApp/expenses', authenticateToken, async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stock Routes
app.get('/BussnessApp/stock', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const stock = await Stock.find(filter).sort({ name: 1 });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/stock', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const stock = new Stock(req.body);
    await stock.save();
    res.status(201).json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/stock/:id', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    res.json(stock);
  } catch (error) {
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
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json({ data: customer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Users Routes
app.get('/BussnessApp/users', authenticateToken, checkRole('admin', 'manager'), async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/users', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { username, email, password, fullName, role, projectId } = req.body;

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

    const sales = await Sale.find({ projectId });
    const expenses = await Expense.find({ projectId });
    const stock = await Stock.find({ projectId });

    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalStock = stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const netProfit = totalSales - totalExpenses;

    res.json({
      totalSales,
      totalExpenses,
      totalStock,
      netProfit,
      salesCount: sales.length,
      expensesCount: expenses.length,
      stockItems: stock.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API accessible at http://localhost:${PORT}/BussnessApp`);
  console.log(`Public URL: https://mabouya.servegame.com/BussnessApp/BussnessApp`);
});
