require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

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

const SaleSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  amount: { type: Number, required: true },
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
  history: [{
    date: Date,
    amount: Number,
    description: String
  }],
  createdAt: { type: Date, default: Date.now }
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

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
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
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/BussnessApp/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    res.status(500).json({ error: error.message });
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
app.get('/BussnessApp/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/projects', async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/BussnessApp/projects/:id', async (req, res) => {
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

app.put('/BussnessApp/projects/:id', async (req, res) => {
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

app.delete('/BussnessApp/projects/:id', async (req, res) => {
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

// Sales Routes
app.get('/BussnessApp/sales', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const sales = await Sale.find(filter).sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/sales', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Expenses Routes
app.get('/BussnessApp/expenses', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/expenses', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stock Routes
app.get('/BussnessApp/stock', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const stock = await Stock.find(filter).sort({ name: 1 });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/stock', async (req, res) => {
  try {
    const stock = new Stock(req.body);
    await stock.save();
    res.status(201).json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/stock/:id', async (req, res) => {
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
app.get('/BussnessApp/customers', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
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
app.get('/BussnessApp/users', async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Dashboard Stats Route
app.get('/BussnessApp/dashboard/:projectId', async (req, res) => {
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
