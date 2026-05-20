require('dotenv').config();
process.env.BACKOFFICE_ACCESS_KEY = 'BussApp@Secure2026!Portal';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

const app = express();
const PORT = 3003;

// IMPORTANT: Trust proxy configuration
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(bodyParser.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/stripe/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "BussnessApp",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// ============= AWS S3 CONFIGURATION =============

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const folder = file.fieldname === 'profilePhoto' ? 'profiles' : 'products';
      const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname || '.jpg')}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.'));
    }
  },
});

// Helper pour supprimer une image S3
const deleteS3Image = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(process.env.S3_BUCKET_NAME)) return;
  try {
    const oldKey = imageUrl.split('.com/')[1];
    if (oldKey) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: decodeURIComponent(oldKey),
      }));
    }
  } catch (e) {
    console.warn('Impossible de supprimer l\'ancienne image S3:', e.message);
  }
};

// ============= EMAIL SERVICE =============

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BussnessApp" <noreply@bussnessapp.com>',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error.message);
    return false;
  }
};

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
  costPrice: { type: Number, required: true },
  category: String,
  image: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
ProductSchema.index({ projectId: 1, name: 1 });

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
SaleSchema.index({ projectId: 1, date: -1 });
SaleSchema.index({ projectId: 1, employeeId: 1 });

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
ExpenseSchema.index({ projectId: 1, date: -1 });
ExpenseSchema.index({ projectId: 1, isRecurring: 1 });

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
StockSchema.index({ projectId: 1 });
StockSchema.index({ productId: 1 });
StockSchema.index({ projectId: 1, name: 1 });

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
StockMovementSchema.index({ projectId: 1, createdAt: -1 });
StockMovementSchema.index({ stockId: 1, createdAt: -1 });

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
CustomerSchema.index({ projectId: 1, name: 1 });

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
UserSchema.index({ projectId: 1 });

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
ScheduleSchema.index({ projectId: 1, date: -1 });
ScheduleSchema.index({ userId: 1, date: -1 });
ScheduleSchema.index({ projectId: 1, userId: 1, status: 1 });

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
CommissionSchema.index({ projectId: 1, userId: 1, date: -1 });
CommissionSchema.index({ saleId: 1 });

const CategorySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#4CAF50' },
  createdAt: { type: Date, default: Date.now }
});
CategorySchema.index({ projectId: 1 });

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

// Backoffice routes
const backofficeRoutes = require('./backoffice');
app.use('/BussnessApp/backoffice', backofficeRoutes);

// Routes de base
app.get('/BussnessApp', (req, res) => {
  res.json({ message: 'BussnessApp API is running', version: '1.0.0' });
});

app.get('/paiement-confirme', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement confirmé - BussnessApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1a2e; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .icon { width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; }
    h1 { font-size: 1.8rem; margin-bottom: 12px; color: #fff; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 8px; }
    .badge { display: inline-block; background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); padding: 6px 16px; border-radius: 50px; font-size: 0.85rem; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Paiement confirmé !</h1>
    <p>Votre paiement a bien été reçu.</p>
    <p>Vous allez recevoir un email avec vos identifiants de connexion pour accéder à <strong>BussnessApp</strong>.</p>
    <div class="badge">Merci pour votre confiance</div>
  </div>
</body>
</html>`);
});

app.get('/paiement-annule', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement annulé - BussnessApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1a2e; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .icon { width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; }
    h1 { font-size: 1.8rem; margin-bottom: 12px; color: #fff; }
    p { color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 6px 16px; border-radius: 50px; font-size: 0.85rem; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Paiement annulé</h1>
    <p>Votre paiement n'a pas été finalisé. Aucun montant n'a été débité.</p>
    <p style="margin-top:12px;">Si vous avez des questions, contactez-nous.</p>
    <div class="badge">Paiement non effectué</div>
  </div>
</body>
</html>`);
});

// ============= AUTH ROUTES =============

// Register
app.post('/BussnessApp/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName, role, projectId, selectedPlanId } = req.body;

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

    if (!selectedPlanId) {
      return res.status(400).json({
        error: 'Veuillez choisir un plan d\'accompagnement',
        field: 'selectedPlanId',
        code: 'MISSING_PLAN'
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

    // Récupérer le plan choisi
    const SubscriptionPlan = mongoose.model('SubscriptionPlan');
    const selectedPlan = await SubscriptionPlan.findById(selectedPlanId);
    if (!selectedPlan) {
      return res.status(400).json({
        error: 'Plan d\'accompagnement invalide',
        field: 'selectedPlanId',
        code: 'INVALID_PLAN'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'admin';

    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      role: userRole,
      isActive: false,
      projectId,
      projectIds: []
    });

    await user.save();

    const defaultProject = new Project({
      name: `Business de ${fullName.trim()}`,
      description: 'Mon premier projet sur BussnessApp',
      category: 'general',
      ownerId: user._id
    });
    await defaultProject.save();

    user.projectId = defaultProject._id;
    user.projectIds = [defaultProject._id];
    await user.save();

    console.log(`Nouvelle inscription: ${user.username} - Plan choisi: ${selectedPlan.name}`);

    const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' };
    const durationLabel = selectedPlan.durationType === 'lifetime'
      ? 'À vie'
      : `${selectedPlan.duration} ${DURATION_LABELS[selectedPlan.durationType] || selectedPlan.durationType}`;

    // Plan gratuit : activation automatique sans intervention admin
    if (selectedPlan.price === 0) {
      user.isActive = true;
      await user.save();

      // Créer l'abonnement actif immédiatement
      const Subscription = mongoose.model('Subscription');
      const startDate = new Date();
      const endDate = new Date();
      if (selectedPlan.durationType === 'lifetime') {
        endDate.setFullYear(endDate.getFullYear() + 100);
      } else if (selectedPlan.durationType === 'days') {
        endDate.setDate(endDate.getDate() + selectedPlan.duration);
      } else if (selectedPlan.durationType === 'months') {
        endDate.setMonth(endDate.getMonth() + selectedPlan.duration);
      } else if (selectedPlan.durationType === 'years') {
        endDate.setFullYear(endDate.getFullYear() + selectedPlan.duration);
      }

      const subscription = new Subscription({
        adminId: user._id,
        planId: selectedPlan._id,
        planName: selectedPlan.name,
        plan: 'custom',
        status: 'active',
        startDate,
        endDate,
        amount: 0,
        duration: selectedPlan.duration,
        durationType: selectedPlan.durationType,
        maxProjects: selectedPlan.maxProjects,
        paymentMethod: 'donation',
      });
      await subscription.save();

      // Générer le JWT
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, projectId: user.projectId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Envoyer email de bienvenue avec identifiants
      try {
        const welcomeHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #1A1A1A, #2D2D2D); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">Bienvenue sur BussnessApp !</h1>
              <p style="color: #999; margin: 8px 0 0;">Votre essai gratuit est activé</p>
            </div>
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <p style="color: #333; font-size: 15px;">Bonjour <strong>${fullName.trim()}</strong>,</p>
              <p style="color: #555;">Votre compte essai <strong>${selectedPlan.name}</strong> (${durationLabel}) est maintenant actif. Voici vos identifiants de connexion :</p>
              <div style="background: #f0f0ff; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #888; width: 160px;">Nom d'utilisateur</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${username.trim()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Email</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">${email.trim()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888;">Mot de passe</td>
                    <td style="padding: 8px 0; color: #333; font-weight: 600;">Celui choisi lors de l'inscription</td>
                  </tr>
                </table>
              </div>
              <div style="background: #e8f5e9; border-radius: 8px; padding: 16px; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                  <strong>${selectedPlan.name}</strong> — ${durationLabel} offert(s) à partir d'aujourd'hui
                </p>
              </div>
              <p style="color: #555; margin-top: 20px; font-size: 14px;">Vous êtes déjà connecté automatiquement dans l'application. Bonne découverte !</p>
            </div>
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
              BussnessApp — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        `;
        await sendEmail(user.email, `Bienvenue sur BussnessApp - Essai ${selectedPlan.name} activé`, welcomeHtml);
        console.log(`Email de bienvenue envoyé à ${user.email}`);
      } catch (emailError) {
        console.error('Erreur envoi email bienvenue:', emailError.message);
      }

      // Notifier les super-admins (info seulement)
      try {
        const SuperAdmin = mongoose.model('SuperAdmin');
        const superAdmins = await SuperAdmin.find({ isActive: true });
        const notifHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #1A1A1A, #2D2D2D); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h1 style="color: #4CAF50; margin: 0; font-size: 22px;">Nouvel essai gratuit</h1>
              <p style="color: #999; margin: 8px 0 0;">Inscription automatique — aucune action requise</p>
            </div>
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #888; width: 140px;">Nom</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${fullName.trim()}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0; color: #333;">${email.trim()}</td></tr>
                <tr><td style="padding: 8px 0; color: #888;">Plan</td><td style="padding: 8px 0; color: #333;">${selectedPlan.name} (${durationLabel})</td></tr>
              </table>
              <div style="margin-top: 16px; padding: 12px; background: #e8f5e9; border-radius: 8px;">
                <p style="margin: 0; color: #2e7d32; font-size: 13px;">Compte activé automatiquement — aucune action requise de votre part.</p>
              </div>
            </div>
          </div>
        `;
        for (const admin of superAdmins) {
          await sendEmail(admin.email, `Nouvel essai gratuit - ${fullName.trim()} (${selectedPlan.name})`, notifHtml);
        }
      } catch (emailError) {
        console.error('Erreur notification super admins:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        autoActivated: true,
        message: `Compte essai activé ! Vos identifiants ont été envoyés à ${email.trim()}. Vous êtes connecté automatiquement.`,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          projectId: user.projectId,
          projectIds: user.projectIds
        }
      });
    }

    // Envoyer un email de notification à tous les super admins (plans payants)
    try {
      const SuperAdmin = mongoose.model('SuperAdmin');
      const superAdmins = await SuperAdmin.find({ isActive: true });

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1A1A1A, #2D2D2D); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">Nouvelle inscription</h1>
            <p style="color: #999; margin: 8px 0 0;">Un nouvel utilisateur s'est inscrit sur BussnessApp</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a2e; margin-top: 0; font-size: 18px;">Informations de l'utilisateur</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #888; width: 140px;">Nom complet</td>
                <td style="padding: 10px 0; color: #333; font-weight: 600;">${fullName.trim()}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #888;">Nom d'utilisateur</td>
                <td style="padding: 10px 0; color: #333; font-weight: 600;">${username.trim()}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #888;">Email</td>
                <td style="padding: 10px 0; color: #333; font-weight: 600;">
                  <a href="mailto:${email.trim()}" style="color: #6C63FF; text-decoration: none;">${email.trim()}</a>
                </td>
              </tr>
            </table>

            <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #f0f0ff, #e8e6ff); border-radius: 10px; border-left: 4px solid #6C63FF;">
              <h3 style="margin: 0 0 12px; color: #1a1a2e; font-size: 16px;">Plan choisi : ${selectedPlan.name}</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #666;">Prix</td>
                  <td style="padding: 6px 0; color: #333; font-weight: 600;">${selectedPlan.price}€ ${selectedPlan.isRecurring ? '(récurrent)' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #666;">Durée</td>
                  <td style="padding: 6px 0; color: #333; font-weight: 600;">${durationLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #666;">Business max</td>
                  <td style="padding: 6px 0; color: #333; font-weight: 600;">${selectedPlan.maxProjects}</td>
                </tr>
              </table>
              ${selectedPlan.features && selectedPlan.features.length > 0 ? `
                <div style="margin-top: 12px;">
                  <p style="color: #666; margin: 0 0 8px; font-size: 13px;">Fonctionnalités :</p>
                  ${selectedPlan.features.map(f => `<span style="display: inline-block; background: white; color: #6C63FF; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin: 2px 4px 2px 0;">✓ ${f}</span>`).join('')}
                </div>
              ` : ''}
            </div>

            <div style="margin-top: 24px; padding: 16px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #D4AF37;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Action requise :</strong> Veuillez contacter cet utilisateur pour finaliser son inscription et activer son compte.
              </p>
            </div>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            BussnessApp - ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      `;

      for (const admin of superAdmins) {
        await sendEmail(admin.email, `Nouvelle inscription - ${fullName.trim()} (${selectedPlan.name})`, emailHtml);
      }

      console.log(`Email de notification envoyé à ${superAdmins.length} super admin(s)`);
    } catch (emailError) {
      console.error('Erreur envoi email aux super admins:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Un administrateur vous contactera prochainement pour finaliser votre accompagnement.',
      pendingActivation: true
    });
  } catch (error) {
    console.error('Registration error:', error);

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

// Update profile photo
app.put('/BussnessApp/auth/profile-photo', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image envoyée' });
    }

    const photoUrl = req.file.location; // URL publique S3

    // Supprimer l'ancienne photo si elle existe sur S3
    const currentUser = await User.findById(req.user.id);
    await deleteS3Image(currentUser?.photo);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: photoUrl },
      { new: true }
    ).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
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
    // Vérifier la limite de projets selon l'abonnement actif
    const Subscription = mongoose.model('Subscription');
    const activeSub = await Subscription.findOne({
      adminId: req.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (activeSub && activeSub.maxProjects) {
      const currentProjectCount = await Project.countDocuments({ ownerId: req.user.id });
      if (currentProjectCount >= activeSub.maxProjects) {
        return res.status(403).json({
          error: `Limite atteinte : votre abonnement "${activeSub.planName || 'actuel'}" autorise ${activeSub.maxProjects} business maximum. Contactez l'administrateur pour upgrader votre plan.`,
          code: 'PROJECT_LIMIT_REACHED',
          maxProjects: activeSub.maxProjects,
          currentProjects: currentProjectCount
        });
      }
    }

    const project = new Project({
      ...req.body,
      ownerId: req.user.id
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

    // Vérifier que l'utilisateur est le propriétaire ou assigné au projet
    const isOwner = project.ownerId.toString() === req.user.id;
    const isAssigned = req.user.projectId && req.user.projectId.toString() === project._id.toString();
    if (!isOwner && !isAssigned) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que les projets auxquels vous êtes assigné' });
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
    const products = await Product.find(filter).sort({ name: 1 }).lean();

    // Batch query: une seule requête pour tous les stocks liés
    const productIds = products.map(p => p._id);
    const productNames = products.map(p => p.name);
    const stockItems = await Stock.find({
      $or: [
        { productId: { $in: productIds } },
        { name: { $in: productNames } }
      ]
    }).lean();

    // Indexer les stocks par productId et par name pour lookup O(1)
    const stockByProductId = {};
    const stockByName = {};
    for (const s of stockItems) {
      if (s.productId) stockByProductId[s.productId.toString()] = s;
      if (s.name) stockByName[s.name] = s;
    }

    const productsWithStock = products.map(product => {
      const stockItem = stockByProductId[product._id.toString()] || stockByName[product.name] || null;
      return {
        ...product,
        stock: stockItem ? {
          quantity: stockItem.quantity,
          minQuantity: stockItem.minQuantity,
          isLowStock: stockItem.minQuantity > 0 && stockItem.quantity <= stockItem.minQuantity,
          stockId: stockItem._id
        } : null
      };
    });

    res.json({ data: productsWithStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/BussnessApp/products', authenticateToken, checkRole('admin', 'manager', 'responsable'), upload.single('productImage'), async (req, res) => {
  try {
    const productData = { ...req.body };
    if (req.file) {
      productData.image = req.file.location;
    }
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/BussnessApp/products/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), upload.single('productImage'), async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    if (req.file) {
      // Supprimer l'ancienne image S3
      const oldProduct = await Product.findById(req.params.id);
      await deleteS3Image(oldProduct?.image);
      updateData.image = req.file.location;
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    // Supprimer l'image S3 du produit
    await deleteS3Image(product.image);
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
      .populate('productId', 'name unitPrice image')
      .populate('customerId', 'name phone email')
      .populate('employeeId', 'username fullName')
      .sort({ date: -1 })
      .lean();
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
    if (!productId || !quantity || unitPrice === undefined || unitPrice === null || unitPrice === '') {
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

    // Récupérer product + employee en parallèle
    const [product, employee] = await Promise.all([
      Product.findById(productId).lean(),
      User.findById(req.user.id)
    ]);

    const stockItem = await Stock.findOne({
      projectId,
      $or: [
        { productId: productId },
        ...(product ? [{ name: product.name }] : [])
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

    // Calcul automatique des commissions pour l'employé
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
      .populate('productId', 'name unitPrice image')
      .populate('customerId', 'name phone')
      .populate('employeeId', 'username fullName');

    res.status(201).json({ data: populatedSale });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(400).json({ error: error.message });
  }
});

// Modifier une vente (client et/ou vendeur)
app.put('/BussnessApp/sales/:id', authenticateToken, checkRole('admin', 'manager', 'responsable'), async (req, res) => {
  try {
    const { customerId, employeeId } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }

    if (customerId !== undefined) sale.customerId = customerId || null;
    if (employeeId !== undefined) sale.employeeId = employeeId;

    await sale.save();

    const updatedSale = await Sale.findById(sale._id)
      .populate('productId', 'name unitPrice image')
      .populate('customerId', 'name phone email')
      .populate('employeeId', 'username fullName');

    res.json({ data: updatedSale });
  } catch (error) {
    console.error('Error updating sale:', error);
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
      .populate('productId', 'name unitPrice image')
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

// Modifier une dépense
app.put('/BussnessApp/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Supprimer une dépense
app.delete('/BussnessApp/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    if (role === 'admin') {
      return res.status(403).json({ error: 'Impossible de créer un compte administrateur. Il ne peut y avoir qu\'un seul administrateur par projet.' });
    }

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

// Update user role (admin only, cannot assign admin role)
app.put('/BussnessApp/users/:id/role', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ error: 'Impossible d\'attribuer le rôle administrateur. Il ne peut y avoir qu\'un seul administrateur par projet.' });
    }

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
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Vous ne pouvez pas désactiver un autre administrateur' });
    }

    const { isActive } = req.body;
    targetUser.isActive = isActive;
    await targetUser.save();

    res.json(targetUser.toObject ? { ...targetUser.toObject(), password: undefined } : targetUser);
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

      // Construire tous les documents en mémoire, puis insertMany en une seule requête
      const scheduleDocs = [];
      let currentDate = new Date(startDate);
      while (currentDate <= finalEndDate) {
        const dayOfWeek = currentDate.getDay();
        if (recurringDays.includes(dayOfWeek)) {
          scheduleDocs.push({
            projectId: projectId || req.user.projectId,
            userId,
            date: new Date(currentDate),
            startTime,
            endTime,
            duration,
            notes,
            createdBy: req.user.id
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const inserted = await Schedule.insertMany(scheduleDocs);

      const populatedSchedules = await Schedule.find({
        _id: { $in: inserted.map(s => s._id) }
      })
        .populate('userId', 'username fullName role photo hourlyRate')
        .populate('createdBy', 'username fullName')
        .lean();

      res.status(201).json({
        data: populatedSchedules,
        count: inserted.length,
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

// Masse salariale de l'équipe (Admin/Manager)
app.get('/BussnessApp/projects/:projectId/team-payroll', authenticateToken, async (req, res) => {
  try {
    // Vérifier les droits
    if (!['admin', 'responsable', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { projectId } = req.params;
    const { month, year } = req.query;

    // Période : mois demandé ou mois en cours
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();
    const periodStart = new Date(y, m - 1, 1);
    const periodEnd = new Date(y, m, 0, 23, 59, 59);

    // Tous les utilisateurs actifs du projet
    const employees = await User.find({
      $or: [{ projectId }, { projectIds: projectId }],
      isActive: true
    }).select('-password').lean();

    const employeeIds = employees.map(e => e._id);

    // Batch : une seule requête pour tous les schedules + commissions du mois
    const [allSchedules, allCommissions] = await Promise.all([
      Schedule.find({
        userId: { $in: employeeIds },
        projectId,
        status: 'completed',
        date: { $gte: periodStart, $lte: periodEnd }
      }).lean(),
      Commission.find({
        userId: { $in: employeeIds },
        projectId,
        date: { $gte: periodStart, $lte: periodEnd }
      }).lean()
    ]);

    // Indexer par userId pour lookup O(1)
    const schedulesByUser = {};
    for (const s of allSchedules) {
      const uid = s.userId.toString();
      if (!schedulesByUser[uid]) schedulesByUser[uid] = [];
      schedulesByUser[uid].push(s);
    }
    const commissionsByUser = {};
    for (const c of allCommissions) {
      const uid = c.userId.toString();
      if (!commissionsByUser[uid]) commissionsByUser[uid] = [];
      commissionsByUser[uid].push(c);
    }

    const results = employees.map(emp => {
      const schedules = schedulesByUser[emp._id.toString()] || [];
      const commissions = commissionsByUser[emp._id.toString()] || [];

      const totalHours = schedules.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalSalary = schedules.reduce((sum, s) => {
        if (s.dailySalary !== null && s.dailySalary !== undefined) {
          return sum + s.dailySalary;
        }
        return sum + ((s.duration || 0) * (emp.hourlyRate || 0));
      }, 0);
      const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);

      return {
        user: {
          _id: emp._id,
          fullName: emp.fullName,
          username: emp.username,
          role: emp.role,
          photo: emp.photo,
          hourlyRate: emp.hourlyRate || 0
        },
        hours: totalHours,
        daysWorked: schedules.length,
        salary: totalSalary,
        commissions: totalCommissions,
        totalDue: totalSalary + totalCommissions
      };
    });

    // Trier par totalDue décroissant
    results.sort((a, b) => b.totalDue - a.totalDue);

    const totals = {
      totalSalary: results.reduce((sum, r) => sum + r.salary, 0),
      totalCommissions: results.reduce((sum, r) => sum + r.commissions, 0),
      totalPayroll: results.reduce((sum, r) => sum + r.totalDue, 0),
      totalHours: results.reduce((sum, r) => sum + r.hours, 0)
    };

    res.json({
      period: {
        month: m,
        year: y,
        label: periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      },
      employees: results,
      totals
    });
  } catch (error) {
    console.error('Error loading team payroll:', error);
    res.status(500).json({ error: error.message });
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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [sales, expenses, stock, schedules, commissions, employees] = await Promise.all([
      Sale.find({ projectId, date: { $gte: sixMonthsAgo } }).populate('productId', 'name').lean(),
      Expense.find({ projectId, date: { $gte: sixMonthsAgo } }).lean(),
      Stock.find({ projectId }).lean(),
      Schedule.find({ projectId, status: 'completed', date: { $gte: sixMonthsAgo } }).lean(),
      Commission.find({ projectId, date: { $gte: sixMonthsAgo } }).lean(),
      User.find({
        $or: [{ projectId }, { projectIds: projectId }],
        isActive: true
      }).select('hourlyRate').lean()
    ]);

    const employeeMap = {};
    for (const emp of employees) {
      employeeMap[emp._id.toString()] = emp;
    }

    const totalSales = (sales && Array.isArray(sales)) ? sales.reduce((sum, sale) => sum + sale.amount, 0) : 0;
    const totalExpenses = (expenses && Array.isArray(expenses)) ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    const totalStock = (stock && Array.isArray(stock)) ? stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) : 0;

    const totalSalaries = schedules.reduce((sum, s) => {
      if (s.dailySalary !== null && s.dailySalary !== undefined) {
        return sum + s.dailySalary;
      }
      const emp = employeeMap[s.userId?.toString()];
      return sum + ((s.duration || 0) * (emp?.hourlyRate || 0));
    }, 0);

    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);

    const netProfit = totalSales - totalExpenses - totalSalaries - totalCommissions;

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

      const monthSchedules = schedules.filter(s => {
        const d = new Date(s.date);
        return d >= monthDate && d < nextMonthDate;
      });

      const monthCommissions = commissions.filter(c => {
        const d = new Date(c.date);
        return d >= monthDate && d < nextMonthDate;
      });

      const monthlySalesTotal = monthSales.reduce((sum, sale) => sum + sale.amount, 0);
      const monthlyExpensesTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      const monthlySalariesTotal = monthSchedules.reduce((sum, s) => {
        if (s.dailySalary !== null && s.dailySalary !== undefined) {
          return sum + s.dailySalary;
        }
        const emp = employeeMap[s.userId?.toString()];
        return sum + ((s.duration || 0) * (emp?.hourlyRate || 0));
      }, 0);

      const monthlyCommissionsTotal = monthCommissions.reduce((sum, c) => sum + c.amount, 0);

      monthlyData.push({
        month: monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        sales: monthlySalesTotal,
        expenses: monthlyExpensesTotal,
        salaries: monthlySalariesTotal,
        commissions: monthlyCommissionsTotal,
        profit: monthlySalesTotal - monthlyExpensesTotal - monthlySalariesTotal - monthlyCommissionsTotal
      });
    }

    // Données par catégorie de dépenses
    const expensesByCategory = {
      purchase: expenses.filter(e => e.category === 'purchase').reduce((sum, e) => sum + e.amount, 0),
      variable: expenses.filter(e => e.category === 'variable').reduce((sum, e) => sum + e.amount, 0),
      fixed: expenses.filter(e => e.category === 'fixed').reduce((sum, e) => sum + e.amount, 0),
      salaries: totalSalaries
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
      totalSalaries,
      totalCommissions,
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

// Export PDF Route
app.post('/BussnessApp/export-pdf/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const PDFDocument = require('pdfkit');

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    const currencySymbol = project.currency === 'XOF' ? 'CFA' : '€';

    const [sales, expenses, stocks, customers, employees, commissions, schedules] = await Promise.all([
      Sale.find({ projectId, date: { $gte: start, $lte: end } })
        .populate('productId').populate('customerId').populate('employeeId'),
      Expense.find({ projectId, date: { $gte: start, $lte: end } }),
      Stock.find({ projectId }).populate('productId'),
      Customer.find({ projectId }),
      User.find({ projectId }),
      Commission.find({ projectId, date: { $gte: start, $lte: end } })
        .populate('userId').populate('saleId'),
      Schedule.find({ projectId, date: { $gte: start, $lte: end } })
        .populate('userId')
    ]);

    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalStock = stocks.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const totalSalaries = schedules.reduce((sum, s) => {
      return sum + ((s.duration || 0) * (s.userId?.hourlyRate || 0));
    }, 0);
    const netProfit = totalSales - totalExpenses - totalCommissions - totalSalaries;

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=export_${projectId}_${Date.now()}.pdf`);
    doc.pipe(res);

    const primaryColor = '#2D5F8A';
    const accentColor = '#4A90D9';
    const successColor = '#27AE60';
    const dangerColor = '#E74C3C';
    const lightGray = '#F5F6FA';
    const darkText = '#2C3E50';

    // ===== HELPER FUNCTIONS =====
    const drawSectionTitle = (title, icon) => {
      if (doc.y > 700) doc.addPage();
      doc.moveDown(0.5);
      doc.rect(40, doc.y, 515, 30).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
        .text(`${icon}  ${title}`, 55, doc.y + 8, { width: 480 });
      doc.fillColor(darkText);
      doc.moveDown(1.5);
    };

    const drawTableHeader = (headers, colWidths, startX) => {
      const y = doc.y;
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 22).fill(accentColor);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(h, x + 4, y + 6, { width: colWidths[i] - 8, align: 'left' });
        x += colWidths[i];
      });
      doc.fillColor(darkText).font('Helvetica');
      doc.y = y + 22;
    };

    const drawTableRow = (values, colWidths, startX, isAlternate) => {
      if (doc.y > 740) {
        doc.addPage();
        return false;
      }
      const y = doc.y;
      if (isAlternate) {
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 18).fill(lightGray);
      }
      doc.fillColor(darkText).fontSize(7).font('Helvetica');
      let x = startX;
      values.forEach((v, i) => {
        doc.text(String(v), x + 4, y + 5, { width: colWidths[i] - 8, align: 'left' });
        x += colWidths[i];
      });
      doc.y = y + 18;
      return true;
    };

    // ===== PAGE DE COUVERTURE =====
    doc.rect(0, 0, 595, 842).fill('#1A1A2E');
    doc.rect(0, 0, 595, 8).fill(accentColor);
    doc.rect(0, 834, 595, 8).fill(accentColor);

    doc.fillColor('#FFFFFF').fontSize(32).font('Helvetica-Bold')
      .text('RAPPORT FINANCIER', 0, 250, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica')
      .text(project.name || 'Entreprendre Avec Succès', { align: 'center' });
    doc.moveDown(2);

    doc.rect(197, doc.y, 200, 2).fill(accentColor);
    doc.moveDown(1.5);

    doc.fillColor('#B0B0B0').fontSize(12)
      .text(`Période : ${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'center' });

    doc.moveDown(4);
    const summaryY = doc.y;
    const boxWidth = 150;
    const boxGap = 20;
    const totalBoxWidth = 3 * boxWidth + 2 * boxGap;
    const boxStartX = (595 - totalBoxWidth) / 2;

    const summaryBoxes = [
      { label: 'Chiffre d\'affaires', value: totalSales.toFixed(2) + ' ' + currencySymbol, color: successColor },
      { label: 'Dépenses totales', value: totalExpenses.toFixed(2) + ' ' + currencySymbol, color: dangerColor },
      { label: 'Bénéfice net', value: netProfit.toFixed(2) + ' ' + currencySymbol, color: netProfit >= 0 ? successColor : dangerColor },
    ];

    summaryBoxes.forEach((box, i) => {
      const bx = boxStartX + i * (boxWidth + boxGap);
      doc.rect(bx, summaryY, boxWidth, 70).lineWidth(1).fillAndStroke('#2A2A3E', box.color);
      doc.fillColor(box.color).fontSize(14).font('Helvetica-Bold')
        .text(box.value, bx, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fillColor('#B0B0B0').fontSize(9).font('Helvetica')
        .text(box.label, bx, summaryY + 42, { width: boxWidth, align: 'center' });
    });

    // ===== PAGE BILAN =====
    doc.addPage();
    drawSectionTitle('BILAN GÉNÉRAL', '📊');

    const bilanItems = [
      { label: 'Ventes totales', value: totalSales.toFixed(2) + ' ' + currencySymbol, color: successColor },
      { label: 'Dépenses totales', value: totalExpenses.toFixed(2) + ' ' + currencySymbol, color: dangerColor },
      { label: 'Commissions totales', value: totalCommissions.toFixed(2) + ' ' + currencySymbol, color: '#E67E22' },
      { label: 'Salaires totaux', value: totalSalaries.toFixed(2) + ' ' + currencySymbol, color: '#E67E22' },
      { label: 'Valeur du stock', value: totalStock.toFixed(2) + ' ' + currencySymbol, color: accentColor },
      { label: 'Bénéfice net', value: netProfit.toFixed(2) + ' ' + currencySymbol, color: netProfit >= 0 ? successColor : dangerColor },
    ];

    bilanItems.forEach((item, i) => {
      const y = doc.y;
      const bgColor = i % 2 === 0 ? lightGray : '#FFFFFF';
      doc.rect(40, y, 515, 28).fill(bgColor);
      doc.fillColor(darkText).fontSize(11).font('Helvetica')
        .text(item.label, 55, y + 8, { width: 300 });
      doc.fillColor(item.color).fontSize(11).font('Helvetica-Bold')
        .text(item.value, 360, y + 8, { width: 180, align: 'right' });
      doc.y = y + 28;
    });

    doc.moveDown(1);
    doc.rect(40, doc.y, 515, 1).fill(accentColor);
    doc.moveDown(1);

    const statsItems = [
      { label: 'Nombre de ventes', value: sales.length },
      { label: 'Nombre de dépenses', value: expenses.length },
      { label: 'Articles en stock', value: stocks.length },
      { label: 'Nombre de clients', value: customers.length },
      { label: 'Nombre d\'employés', value: employees.length },
    ];

    statsItems.forEach((item, i) => {
      const y = doc.y;
      const bgColor = i % 2 === 0 ? lightGray : '#FFFFFF';
      doc.rect(40, y, 515, 24).fill(bgColor);
      doc.fillColor(darkText).fontSize(10).font('Helvetica')
        .text(item.label, 55, y + 7, { width: 300 });
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
        .text(String(item.value), 360, y + 7, { width: 180, align: 'right' });
      doc.y = y + 24;
    });

    // ===== VENTES =====
    doc.addPage();
    drawSectionTitle('VENTES', '💰');

    if (sales.length > 0) {
      const sColW = [60, 80, 70, 70, 40, 60, 40, 65];
      drawTableHeader(['Date', 'Produit', 'Client', 'Employé', 'Qté', 'Prix Unit.', 'Remise', 'Total'], sColW, 40);
      sales.forEach((sale, i) => {
        drawTableRow([
          new Date(sale.date).toLocaleDateString('fr-FR'),
          (sale.productId?.name || 'N/A').substring(0, 15),
          (sale.customerId?.name || 'N/A').substring(0, 12),
          (sale.employeeId?.fullName || sale.employeeId?.username || 'N/A').substring(0, 12),
          sale.quantity,
          sale.unitPrice.toFixed(2) + ' ' + currencySymbol,
          sale.discount + '%',
          sale.amount.toFixed(2) + ' ' + currencySymbol
        ], sColW, 40, i % 2 === 1);
      });
      doc.moveDown(0.5);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
        .text(`Total des ventes : ${totalSales.toFixed(2)} ${currencySymbol}`, 40, doc.y, { align: 'right', width: 515 });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Aucune vente sur cette période.');
    }

    // ===== DÉPENSES =====
    doc.addPage();
    drawSectionTitle('DÉPENSES', '📉');

    if (expenses.length > 0) {
      const eColW = [80, 100, 120, 120, 80];
      drawTableHeader(['Date', 'Catégorie', 'Montant', 'Description', 'Récurrent'], eColW, 40);
      expenses.forEach((expense, i) => {
        const cat = expense.category === 'purchase' ? 'Achat' :
          expense.category === 'variable' ? 'Variable' : 'Fixe';
        drawTableRow([
          new Date(expense.date).toLocaleDateString('fr-FR'),
          cat,
          expense.amount.toFixed(2) + ' ' + currencySymbol,
          (expense.description || '').substring(0, 25),
          expense.isRecurring ? 'Oui' : 'Non'
        ], eColW, 40, i % 2 === 1);
      });
      doc.moveDown(0.5);
      doc.fillColor(dangerColor).fontSize(10).font('Helvetica-Bold')
        .text(`Total des dépenses : ${totalExpenses.toFixed(2)} ${currencySymbol}`, 40, doc.y, { align: 'right', width: 515 });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Aucune dépense sur cette période.');
    }

    // ===== STOCKS =====
    doc.addPage();
    drawSectionTitle('STOCKS', '📦');

    if (stocks.length > 0) {
      const stColW = [90, 80, 60, 55, 70, 80, 80];
      drawTableHeader(['Nom', 'Produit lié', 'SKU', 'Qté', 'Prix Unit.', 'Valeur', 'Emplacement'], stColW, 40);
      stocks.forEach((stock, i) => {
        drawTableRow([
          stock.name.substring(0, 18),
          (stock.productId?.name || 'N/A').substring(0, 15),
          (stock.sku || 'N/A').substring(0, 10),
          stock.quantity,
          stock.unitPrice.toFixed(2) + ' ' + currencySymbol,
          (stock.quantity * stock.unitPrice).toFixed(2) + ' ' + currencySymbol,
          (stock.location || 'N/A').substring(0, 15)
        ], stColW, 40, i % 2 === 1);
      });
      doc.moveDown(0.5);
      doc.fillColor(accentColor).fontSize(10).font('Helvetica-Bold')
        .text(`Valeur totale du stock : ${totalStock.toFixed(2)} ${currencySymbol}`, 40, doc.y, { align: 'right', width: 515 });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Aucun article en stock.');
    }

    // ===== EMPLOYÉS =====
    doc.addPage();
    drawSectionTitle('EMPLOYÉS', '👥');

    if (employees.length > 0) {
      const empColW = [90, 80, 90, 75, 60, 60, 60];
      drawTableHeader(['Nom', 'Username', 'Email', 'Rôle', 'Comm.%', 'Taux/h', 'Actif'], empColW, 40);
      employees.forEach((emp, i) => {
        const role = emp.role === 'admin' ? 'Admin' :
          emp.role === 'manager' ? 'Manager' :
            emp.role === 'responsable' ? 'Resp.' : 'Caissier';
        drawTableRow([
          (emp.fullName || 'N/A').substring(0, 18),
          emp.username.substring(0, 15),
          (emp.email || '').substring(0, 18),
          role,
          emp.commissionRate + '%',
          emp.hourlyRate.toFixed(0) + currencySymbol,
          emp.isActive ? 'Oui' : 'Non'
        ], empColW, 40, i % 2 === 1);
      });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Aucun employé enregistré.');
    }

    // ===== COMMISSIONS =====
    if (commissions.length > 0) {
      doc.addPage();
      drawSectionTitle('COMMISSIONS', '💼');

      const cColW = [80, 110, 100, 60, 100, 80];
      drawTableHeader(['Date', 'Employé', 'Montant vente', 'Taux', 'Commission', 'Statut'], cColW, 40);
      commissions.forEach((com, i) => {
        drawTableRow([
          new Date(com.date).toLocaleDateString('fr-FR'),
          (com.userId?.fullName || com.userId?.username || 'N/A').substring(0, 20),
          com.saleAmount.toFixed(2) + ' ' + currencySymbol,
          com.rate + '%',
          com.amount.toFixed(2) + ' ' + currencySymbol,
          com.status === 'paid' ? 'Payée' : 'En attente'
        ], cColW, 40, i % 2 === 1);
      });
      doc.moveDown(0.5);
      doc.fillColor('#E67E22').fontSize(10).font('Helvetica-Bold')
        .text(`Total commissions : ${totalCommissions.toFixed(2)} ${currencySymbol}`, 40, doc.y, { align: 'right', width: 515 });
    }

    // ===== SALAIRES =====
    if (schedules.length > 0) {
      doc.addPage();
      drawSectionTitle('SALAIRES', '💵');

      const salColW = [65, 90, 55, 55, 55, 65, 70, 60];
      drawTableHeader(['Date', 'Employé', 'Début', 'Fin', 'Durée(h)', 'Taux/h', 'Salaire', 'Statut'], salColW, 40);
      schedules.forEach((sched, i) => {
        const emp = sched.userId;
        const dur = sched.duration || 0;
        const rate = emp?.hourlyRate || 0;
        const statut = sched.status === 'completed' ? 'Complété' :
          sched.status === 'absent' ? 'Absent' :
            sched.status === 'cancelled' ? 'Annulé' : 'Planifié';
        drawTableRow([
          new Date(sched.date).toLocaleDateString('fr-FR'),
          (emp?.fullName || emp?.username || 'N/A').substring(0, 16),
          sched.startTime || '',
          sched.endTime || '',
          dur,
          rate.toFixed(0) + currencySymbol,
          (dur * rate).toFixed(2) + ' ' + currencySymbol,
          statut
        ], salColW, 40, i % 2 === 1);
      });
      doc.moveDown(0.5);
      doc.fillColor('#E67E22').fontSize(10).font('Helvetica-Bold')
        .text(`Total salaires : ${totalSalaries.toFixed(2)} ${currencySymbol}`, 40, doc.y, { align: 'right', width: 515 });
    }

    // ===== CLIENTS =====
    if (customers.length > 0) {
      doc.addPage();
      drawSectionTitle('CLIENTS', '🤝');

      const cuColW = [90, 85, 75, 80, 55, 55, 75];
      drawTableHeader(['Nom', 'Email', 'Téléphone', 'Achats', 'Points', 'Niveau', 'Dernier achat'], cuColW, 40);
      customers.forEach((cust, i) => {
        const level = cust.loyaltyLevel === 'bronze' ? 'Bronze' :
          cust.loyaltyLevel === 'silver' ? 'Argent' :
            cust.loyaltyLevel === 'gold' ? 'Or' : 'Platine';
        drawTableRow([
          cust.name.substring(0, 18),
          (cust.email || 'N/A').substring(0, 16),
          (cust.phone || 'N/A').substring(0, 14),
          cust.totalPurchases.toFixed(2) + ' ' + currencySymbol,
          cust.loyaltyPoints,
          level,
          cust.lastPurchaseDate ? new Date(cust.lastPurchaseDate).toLocaleDateString('fr-FR') : 'N/A'
        ], cuColW, 40, i % 2 === 1);
      });
    }

    // ===== FOOTER SUR TOUTES LES PAGES =====
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#999999').fontSize(8).font('Helvetica')
        .text(
          `${project.name || 'Entreprendre Avec Succès'} — Page ${i + 1}/${pages.count}`,
          40, 810, { width: 515, align: 'center' }
        );
    }

    doc.end();

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
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

// ============= SUBSCRIPTION ROUTES (Mobile App) =============

app.get('/BussnessApp/subscription/my', authenticateToken, async (req, res) => {
  try {
    const Subscription = mongoose.model('Subscription');
    const SubscriptionPlan = mongoose.model('SubscriptionPlan');

    const subscription = await Subscription.findOne({
      adminId: req.user.id,
      status: { $in: ['active', 'pending_payment'] }
    }).sort({ createdAt: -1 }).populate('planId');

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        plan: 'free',
        planLabel: 'Gratuit',
        features: [],
        maxProjects: 0,
        status: 'none'
      });
    }

    const isExpired = subscription.endDate && new Date(subscription.endDate) < new Date();
    if (isExpired && subscription.status === 'active') {
      // Annuler côté Stripe si applicable
      if (stripeForExpiry && subscription.stripeSubscriptionId) {
        try {
          await stripeForExpiry.subscriptions.cancel(subscription.stripeSubscriptionId);
        } catch (e) {
          console.warn(`[subscription check] Stripe cancel ignoré: ${e.message}`);
        }
      }
      subscription.status = 'expired';
      subscription.updatedAt = new Date();
      await subscription.save();
      await User.findByIdAndUpdate(subscription.adminId, { isActive: false });
    }

    const planData = subscription.planId || {};
    const daysLeft = subscription.endDate
      ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      hasSubscription: subscription.status === 'active',
      subscriptionId: subscription._id,
      plan: subscription.planName || subscription.plan || 'basic',
      planLabel: planData.name || subscription.planName || 'Basic',
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysLeft,
      maxProjects: subscription.maxProjects || planData.maxProjects || 1,
      features: planData.features || [],
      isRecurring: planData.isRecurring || false,
      paymentMethod: subscription.paymentMethod,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/BussnessApp/subscription/plans', async (req, res) => {
  try {
    const SubscriptionPlan = mongoose.model('SubscriptionPlan');
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });

    const plansWithTier = plans.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      duration: p.duration,
      durationType: p.durationType,
      maxProjects: p.maxProjects,
      features: p.features,
      isRecurring: p.isRecurring,
      tier: p.price === 0 ? 'free' : p.sortOrder <= 1 ? 'basic' : 'premium',
    }));

    res.json(plansWithTier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CGU =============
const CGU_DATA = {
  version: '1.0',
  updatedAt: '2025-01-01',
  title: "Conditions Générales d'Utilisation (CGU)",
  appName: "EAS – Entreprendre avec Succès",
  sections: [
    {
      id: 1,
      title: "Objet",
      content: "Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités d'accès et d'utilisation de l'application mobile EAS – Entreprendre avec Succès (ci-après « l'Application »).\nL'Application permet aux utilisateurs de gérer, suivre et analyser leur activité commerciale (ventes, dépenses, stock, équipes, rentabilité, etc.).",
    },
    {
      id: 2,
      title: "Éditeur de l'application",
      content: "L'Application est éditée par : SASU COD&COV",
    },
    {
      id: 3,
      title: "Accès au service",
      content: "L'accès à l'Application est possible via téléchargement sur les stores (Google Play / App Store).\nL'utilisateur doit créer un compte pour accéder aux fonctionnalités.\nL'éditeur se réserve le droit de modifier, suspendre ou interrompre l'accès au service à tout moment.",
    },
    {
      id: 4,
      title: "Description des services",
      content: "L'Application propose notamment les fonctionnalités suivantes :\n• Gestion des ventes\n• Suivi des dépenses\n• Gestion du stock\n• Gestion des employés et commissions\n• Calcul de la rentabilité\n• Module de simulation de business (business plan)\n• Export de données (selon abonnement)\n• Gestion multi-business\n\nLes fonctionnalités disponibles dépendent du plan d'abonnement souscrit.",
    },
    {
      id: 5,
      title: "Compte utilisateur",
      content: "L'utilisateur est responsable des informations fournies lors de la création de son compte.\nIl est seul responsable de la confidentialité de ses identifiants.\nToute utilisation du compte est réputée faite par l'utilisateur.",
    },
    {
      id: 6,
      title: "Abonnements et paiements",
      content: "L'Application propose plusieurs formules d'abonnement (Basic, Standard, Premium).\nLes tarifs peuvent être modifiés à tout moment.\nLes abonnements sont généralement annuels et renouvelables.\nAucun remboursement ne pourra être exigé sauf disposition légale contraire.",
    },
    {
      id: 7,
      title: "Responsabilité",
      content: "L'Application est un outil d'aide à la gestion.\nL'éditeur ne garantit pas l'exactitude des résultats financiers générés, ceux-ci dépendant des données saisies par l'utilisateur.\nL'utilisateur reste seul responsable de :\n• La gestion de son activité\n• Ses décisions commerciales\n• La conformité de ses obligations légales et fiscales\n\nL'éditeur ne saurait être tenu responsable de pertes financières, erreurs de gestion ou décisions prises sur la base des données de l'Application.",
    },
    {
      id: 8,
      title: "Données",
      content: "Les données saisies dans l'Application appartiennent à l'utilisateur.\nL'éditeur s'engage à mettre en œuvre des moyens raisonnables pour assurer la sécurité des données.\nToutefois, l'utilisateur est responsable de la sauvegarde de ses informations.",
    },
    {
      id: 9,
      title: "Disponibilité",
      content: "L'éditeur s'efforce d'assurer un accès continu à l'Application.\nCependant, des interruptions peuvent survenir (maintenance, incident technique, réseau…).\nAucune garantie de disponibilité permanente n'est fournie.",
    },
    {
      id: 10,
      title: "Utilisation conforme",
      content: "L'utilisateur s'engage à utiliser l'Application conformément à sa destination.\nIl est interdit de :\n• Utiliser l'Application à des fins frauduleuses\n• Tenter d'accéder aux systèmes de manière non autorisée\n• Porter atteinte au bon fonctionnement du service",
    },
    {
      id: 11,
      title: "Propriété intellectuelle",
      content: "L'ensemble des éléments de l'Application (code, design, contenu) est protégé.\nToute reproduction, modification ou exploitation sans autorisation est interdite.",
    },
    {
      id: 12,
      title: "Résiliation",
      content: "L'utilisateur peut cesser d'utiliser l'Application à tout moment.\nL'éditeur peut suspendre ou supprimer un compte en cas de non-respect des CGU.",
    },
    {
      id: 13,
      title: "Évolution des CGU",
      content: "Les présentes CGU peuvent être modifiées à tout moment.\nL'utilisateur sera informé en cas de modification importante.",
    },
    {
      id: 14,
      title: "Droit applicable",
      content: "Les présentes CGU sont régies par le droit applicable du pays de l'éditeur.",
    },
  ],
};

app.get('/BussnessApp/legal/cgu', (req, res) => {
  res.json(CGU_DATA);
});

// ============= STRIPE (pour expiration) =============

let stripeForExpiry = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripeForExpiry = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.log('[expireSubscriptions] Stripe non disponible');
  }
}

// ============= JOB : EXPIRATION DES ABONNEMENTS =============

const expireSubscriptions = async () => {
  try {
    const Subscription = mongoose.model('Subscription');
    const now = new Date();

    // Récupérer les abonnements actifs expirés (un par un pour traitement individuel)
    const expiredSubs = await Subscription.find({ status: 'active', endDate: { $lt: now } });

    if (expiredSubs.length === 0) return;

    for (const subscription of expiredSubs) {
      // 1. Annuler côté Stripe si un stripeSubscriptionId existe
      if (stripeForExpiry && subscription.stripeSubscriptionId) {
        try {
          await stripeForExpiry.subscriptions.cancel(subscription.stripeSubscriptionId);
          console.log(`[expireSubscriptions] Stripe subscription ${subscription.stripeSubscriptionId} annulée`);
        } catch (stripeErr) {
          // Si déjà annulée côté Stripe, on continue sans bloquer
          console.warn(`[expireSubscriptions] Stripe cancel ignoré (${subscription.stripeSubscriptionId}): ${stripeErr.message}`);
        }
      }

      // 2. Passer le statut à 'expired' et bloquer le compte
      subscription.status = 'expired';
      subscription.updatedAt = new Date();
      await subscription.save();
      await User.findByIdAndUpdate(subscription.adminId, { isActive: false });

      // 3. Envoyer un email de notification à l'utilisateur
      try {
        const User = mongoose.model('User');
        const user = await User.findById(subscription.adminId);
        if (user && user.email) {
          const planLabel = subscription.planName || subscription.plan || 'votre abonnement';
          const expirationDate = subscription.endDate
            ? new Date(subscription.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'la date prévue';

          await sendEmail(
            user.email,
            'Votre abonnement BussnessApp a expiré',
            `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
              <div style="background: linear-gradient(135deg, #1A1A1A, #2D2D2D); border-radius: 12px; padding: 30px; margin-bottom: 20px; text-align: center;">
                <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">BussnessApp</h1>
              </div>
              <div style="background: #FFFFFF; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h2 style="color: #E53E3E; margin-top: 0;">Abonnement expiré</h2>
                <p style="color: #4A5568;">Bonjour <strong>${user.fullName || user.username}</strong>,</p>
                <p style="color: #4A5568;">
                  Votre abonnement <strong>${planLabel}</strong> a expiré le <strong>${expirationDate}</strong>.
                  Votre accès à BussnessApp est maintenant limité.
                </p>
                <div style="background: #FFF5F5; border-left: 4px solid #E53E3E; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; color: #C53030; font-size: 14px;">
                    Pour continuer à utiliser toutes les fonctionnalités, veuillez renouveler votre abonnement.
                  </p>
                </div>
                <p style="color: #718096; font-size: 13px; margin-top: 30px;">
                  Si vous avez des questions, contactez-nous à <a href="mailto:support@bussnessapp.com" style="color: #1A1A1A;">support@bussnessapp.com</a>.
                </p>
              </div>
            </div>
            `
          );
        }
      } catch (mailErr) {
        console.warn(`[expireSubscriptions] Email non envoyé pour adminId ${subscription.adminId}: ${mailErr.message}`);
      }
    }

    console.log(`[expireSubscriptions] ${expiredSubs.length} abonnement(s) expiré(s) traité(s)`);
  } catch (error) {
    console.error('[expireSubscriptions] Erreur:', error.message);
  }
};

// Start server
app.listen(PORT, async () => {
  const publicApiUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${PORT}/BussnessApp`;
  console.log("Version 1.0.1");
  console.log(`Server is running on port ${PORT}`);
  console.log(`API accessible at http://localhost:${PORT}/BussnessApp`);
  console.log(`Public URL: ${publicApiUrl}`);

  // Générer les dépenses récurrentes au démarrage
  await generateRecurringExpenses();

  // Vérifier les dépenses récurrentes toutes les heures
  setInterval(generateRecurringExpenses, 60 * 60 * 1000);

  // Expirer les abonnements dépassés au démarrage puis toutes les heures
  await expireSubscriptions();
  setInterval(expireSubscriptions, 60 * 60 * 1000);
});
