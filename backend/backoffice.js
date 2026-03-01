const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'bussnessapp_secret_key_2025';
const SUPERADMIN_JWT_SECRET = JWT_SECRET + '_superadmin';
const ACCESS_KEY = process.env.BACKOFFICE_ACCESS_KEY;
const INIT_SECRET = process.env.BACKOFFICE_INIT_SECRET;

// ============= RATE LIMITING =============

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return true;
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.delete(ip);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

function recordAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) loginAttempts.delete(ip);
  }
}, 5 * 60 * 1000);

// ============= ACCESS KEY MIDDLEWARE =============

const verifyAccessKey = (req, res, next) => {
  if (!ACCESS_KEY) return next();

  if (req.path === '/auth/verify-access') return next();

  const clientKey = req.headers['x-access-key'];
  if (!clientKey || clientKey !== ACCESS_KEY) {
    return res.status(403).json({ error: 'Accès refusé. Clé d\'accès invalide.' });
  }
  next();
};

router.use(verifyAccessKey);

// ============= VERIFY ACCESS ROUTE =============

router.post('/auth/verify-access', (req, res) => {
  if (!ACCESS_KEY) {
    return res.json({ valid: true });
  }
  const { accessKey } = req.body;
  if (accessKey === ACCESS_KEY) {
    return res.json({ valid: true });
  }
  return res.status(403).json({ valid: false, error: 'Code d\'accès incorrect' });
});

// ============= SCHEMAS =============

const SuperAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  duration: { type: Number, required: true },
  durationType: { type: String, enum: ['days', 'months', 'years', 'lifetime'], default: 'months' },
  maxProjects: { type: Number, default: 1 },
  features: [String],
  isRecurring: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  planName: String,
  plan: { type: String, default: 'custom' },
  status: { type: String, enum: ['pending_payment', 'active', 'expired', 'cancelled', 'suspended'], default: 'pending_payment' },
  startDate: { type: Date },
  endDate: { type: Date },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  duration: { type: Number },
  durationType: { type: String, enum: ['days', 'months', 'years', 'lifetime'] },
  maxProjects: { type: Number, default: 1 },
  paymentMethod: { type: String, enum: ['card', 'cash', 'donation'], required: true },
  stripePaymentLinkUrl: String,
  stripeSessionId: String,
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  paymentMethod: { type: String, enum: ['card', 'cash', 'donation'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  stripePaymentIntentId: String,
  reference: String,
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId },
  userType: { type: String, enum: ['superadmin', 'admin', 'system'] },
  action: { type: String, required: true },
  details: String,
  entityType: String,
  entityId: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now }
});

// ============= MODELS =============

const SuperAdmin = mongoose.model('SuperAdmin', SuperAdminSchema);
const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const User = mongoose.model('User');
const Project = mongoose.model('Project');

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

// ============= STRIPE (OPTIONAL) =============

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized');
  } catch (e) {
    console.log('Stripe module not found - install with: npm install stripe');
  }
}

// ============= AUTH MIDDLEWARE =============

const authenticateSuperAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, SUPERADMIN_JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.superAdmin = decoded;
    next();
  });
};

// ============= HELPERS =============

const logActivity = async (userId, userType, action, details, entityType, entityId) => {
  try {
    await new ActivityLog({ userId, userType, action, details, entityType, entityId }).save();
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
};

function getEndDate(duration, durationType) {
  const now = new Date();
  switch (durationType) {
    case 'days':
      return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    case 'months':
      return new Date(now.getFullYear(), now.getMonth() + duration, now.getDate());
    case 'years':
      return new Date(now.getFullYear() + duration, now.getMonth(), now.getDate());
    case 'lifetime':
      return new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear(), now.getMonth() + (duration || 1), now.getDate());
  }
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass + '!1';
}

const DURATION_LABELS = { days: 'jour(s)', months: 'mois', years: 'an(s)', lifetime: 'À vie' };

// ============= AUTH ROUTES =============

router.get('/auth/check-init', async (req, res) => {
  try {
    const count = await SuperAdmin.countDocuments();
    res.json({ needsInit: count === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/init', async (req, res) => {
  try {
    const count = await SuperAdmin.countDocuments();
    if (count > 0) {
      return res.status(403).json({ error: 'Un super-admin existe déjà. Utilisez la connexion.' });
    }

    if (INIT_SECRET) {
      const { initSecret } = req.body;
      if (initSecret !== INIT_SECRET) {
        return res.status(403).json({ error: 'Secret d\'initialisation invalide' });
      }
    }

    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const superAdmin = new SuperAdmin({ username, email, password: hashedPassword, fullName });
    await superAdmin.save();

    const token = jwt.sign({ id: superAdmin._id, role: 'superadmin' }, SUPERADMIN_JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Super-admin créé avec succès',
      token,
      superAdmin: { id: superAdmin._id, username, email, fullName }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) {
      recordAttempt(clientIp);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (!superAdmin.isActive) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
      recordAttempt(clientIp);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    clearAttempts(clientIp);

    superAdmin.lastLogin = new Date();
    await superAdmin.save();

    const token = jwt.sign({ id: superAdmin._id, role: 'superadmin' }, SUPERADMIN_JWT_SECRET, { expiresIn: '24h' });

    await logActivity(superAdmin._id, 'superadmin', 'login', 'Connexion au backoffice', 'SuperAdmin', superAdmin._id);

    res.json({
      token,
      superAdmin: { id: superAdmin._id, username: superAdmin.username, email: superAdmin.email, fullName: superAdmin.fullName }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/me', authenticateSuperAdmin, async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.superAdmin.id).select('-password');
    if (!superAdmin) return res.status(404).json({ error: 'Super-admin non trouvé' });
    res.json(superAdmin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPER-ADMIN MANAGEMENT =============

router.get('/super-admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const superAdmins = await SuperAdmin.find().select('-password').sort({ createdAt: -1 });
    res.json(superAdmins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/super-admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const existing = await SuperAdmin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sa = new SuperAdmin({ username, email, password: hashedPassword, fullName });
    await sa.save();

    await logActivity(req.superAdmin.id, 'superadmin', 'create_superadmin', `Super-admin créé: ${fullName}`, 'SuperAdmin', sa._id);

    res.status(201).json({
      message: 'Super-admin créé',
      superAdmin: { id: sa._id, username, email, fullName, isActive: true, createdAt: sa.createdAt }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/super-admins/:id/status', authenticateSuperAdmin, async (req, res) => {
  try {
    if (req.superAdmin.id === req.params.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });
    }
    const sa = await SuperAdmin.findById(req.params.id);
    if (!sa) return res.status(404).json({ error: 'Super-admin non trouvé' });

    sa.isActive = !sa.isActive;
    await sa.save();

    await logActivity(req.superAdmin.id, 'superadmin', sa.isActive ? 'activate_superadmin' : 'deactivate_superadmin',
      `Super-admin ${sa.isActive ? 'activé' : 'désactivé'}: ${sa.fullName}`, 'SuperAdmin', sa._id);

    res.json({ message: `Super-admin ${sa.isActive ? 'activé' : 'désactivé'}`, isActive: sa.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ADMIN (BUSINESS) MANAGEMENT =============

router.get('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = { role: 'admin' };

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const admins = await User.find(query).select('-password').sort({ createdAt: -1 });

    const adminsWithSubs = await Promise.all(admins.map(async (admin) => {
      const subscription = await Subscription.findOne({ adminId: admin._id }).sort({ createdAt: -1 });
      const projectCount = await Project.countDocuments({ ownerId: admin._id });
      return { ...admin.toObject(), subscription: subscription?.toObject() || null, projectCount };
    }));

    res.json(adminsWithSubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    const subscriptions = await Subscription.find({ adminId: admin._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ adminId: admin._id }).sort({ createdAt: -1 });
    const projects = await Project.find({ ownerId: admin._id });
    const activities = await ActivityLog.find({ userId: admin._id }).sort({ createdAt: -1 }).limit(50);

    res.json({ admin: admin.toObject(), subscriptions, payments, projects, activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName, paymentMethod, planId, notes } = req.body;

    if (!username || !email || !password || !fullName || !paymentMethod || !planId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (username, email, password, fullName, paymentMethod, planId)' });
    }

    const subPlan = await SubscriptionPlan.findById(planId);
    if (!subPlan || !subPlan.isActive) {
      return res.status(400).json({ error: 'Plan d\'abonnement invalide ou inactif' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isCardPayment = paymentMethod === 'card';

    const admin = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: 'admin',
      isActive: !isCardPayment
    });
    await admin.save();

    const subscription = new Subscription({
      adminId: admin._id,
      planId: subPlan._id,
      planName: subPlan.name,
      plan: subPlan.durationType === 'lifetime' ? 'lifetime' : (subPlan.duration >= 12 && subPlan.durationType === 'months') ? 'yearly' : 'custom',
      status: isCardPayment ? 'pending_payment' : 'active',
      startDate: isCardPayment ? null : new Date(),
      endDate: isCardPayment ? null : getEndDate(subPlan.duration, subPlan.durationType),
      amount: subPlan.price,
      currency: subPlan.currency,
      duration: subPlan.duration,
      durationType: subPlan.durationType,
      maxProjects: subPlan.maxProjects,
      paymentMethod,
      notes,
      createdBy: req.superAdmin.id
    });

    if (isCardPayment && stripe) {
      try {
        const isRecurring = subPlan.isRecurring && subPlan.durationType !== 'lifetime';
        let recurringInterval = 'month';
        if (subPlan.durationType === 'years') recurringInterval = 'year';
        else if (subPlan.durationType === 'months' && subPlan.duration >= 12) recurringInterval = 'year';

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: (subPlan.currency || 'EUR').toLowerCase(),
              product_data: {
                name: `BussnessApp - ${subPlan.name}`,
                description: `${subPlan.name} pour ${fullName} (max ${subPlan.maxProjects} business)`
              },
              unit_amount: Math.round(subPlan.price * 100),
              ...(isRecurring ? { recurring: { interval: recurringInterval } } : {})
            },
            quantity: 1
          }],
          mode: isRecurring ? 'subscription' : 'payment',
          success_url: `${process.env.BACKOFFICE_URL || 'http://localhost:5173'}/admins?payment=success`,
          cancel_url: `${process.env.BACKOFFICE_URL || 'http://localhost:5173'}/admins?payment=cancelled`,
          customer_email: email,
          metadata: { adminId: admin._id.toString(), subscriptionId: 'pending' }
        });

        subscription.stripeSessionId = session.id;
        subscription.stripePaymentLinkUrl = session.url;
      } catch (stripeError) {
        console.error('Stripe session creation error:', stripeError.message);
      }
    }

    await subscription.save();

    if (subscription.stripeSessionId && stripe) {
      try {
        await stripe.checkout.sessions.update(subscription.stripeSessionId, {
          metadata: { adminId: admin._id.toString(), subscriptionId: subscription._id.toString() }
        });
      } catch (e) { /* non-critical */ }
    }

    const durationLabel = subPlan.durationType === 'lifetime' ? 'À vie' : `${subPlan.duration} ${DURATION_LABELS[subPlan.durationType] || subPlan.durationType}`;

    if (isCardPayment && subscription.stripePaymentLinkUrl) {
      await sendEmail(email, 'Lien de paiement - BussnessApp', `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a2e; margin-top: 0;">Bienvenue sur BussnessApp !</h2>
            <p style="color: #555;">Bonjour <strong>${fullName}</strong>,</p>
            <p style="color: #555;">Votre compte administrateur a été créé. Pour l'activer, veuillez procéder au paiement :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${subscription.stripePaymentLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #6C63FF, #5a50e6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Procéder au paiement (${subPlan.price}\u20AC)
              </a>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #555;">Plan : <strong>${subPlan.name}</strong></p>
              <p style="margin: 5px 0; color: #555;">Durée : <strong>${durationLabel}</strong></p>
              <p style="margin: 5px 0; color: #555;">Business max : <strong>${subPlan.maxProjects}</strong></p>
            </div>
            <p style="color: #999; font-size: 13px;">Vos identifiants de connexion vous seront envoyés une fois le paiement confirmé.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="color: #bbb; font-size: 12px; text-align: center;">BussnessApp - Gestion d'entreprise simplifiée</p>
          </div>
        </div>
      `);
    } else if (!isCardPayment) {
      const payment = new Payment({
        subscriptionId: subscription._id,
        adminId: admin._id,
        amount: subPlan.price,
        paymentMethod,
        status: 'completed',
        reference: paymentMethod === 'cash' ? 'Paiement en liquide' : 'Donation',
        paidAt: new Date()
      });
      await payment.save();

      await sendEmail(email, 'Vos identifiants BussnessApp', `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a2e; margin-top: 0;">Bienvenue sur BussnessApp !</h2>
            <p style="color: #555;">Bonjour <strong>${fullName}</strong>,</p>
            <p style="color: #555;">Votre compte administrateur est maintenant actif. Voici vos identifiants :</p>
            <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6C63FF;">
              <p style="margin: 5px 0;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Mot de passe :</strong> ${password}</p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #555;">Plan : <strong>${subPlan.name}</strong></p>
              <p style="margin: 5px 0; color: #555;">Durée : <strong>${durationLabel}</strong></p>
              <p style="margin: 5px 0; color: #555;">Business max : <strong>${subPlan.maxProjects}</strong></p>
            </div>
            <p style="color: #555;">Connectez-vous à l'application BussnessApp pour commencer.</p>
            <p style="color: #e74c3c; font-size: 13px;">Changez votre mot de passe dès votre première connexion.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="color: #bbb; font-size: 12px; text-align: center;">BussnessApp - Gestion d'entreprise simplifiée</p>
          </div>
        </div>
      `);
    }

    await logActivity(req.superAdmin.id, 'superadmin', 'create_admin',
      `Admin créé: ${fullName} (plan: ${subPlan.name}, ${paymentMethod})`, 'User', admin._id);

    res.status(201).json({
      message: isCardPayment
        ? 'Admin créé. Lien de paiement envoyé par email.'
        : 'Admin créé et identifiants envoyés par email.',
      admin: { id: admin._id, username, email, fullName, isActive: admin.isActive },
      subscription: subscription.toObject(),
      paymentLink: subscription.stripePaymentLinkUrl || null
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/admins/:id/status', authenticateSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    admin.isActive = !admin.isActive;
    await admin.save();

    if (!admin.isActive) {
      await Subscription.updateMany(
        { adminId: admin._id, status: 'active' },
        { status: 'suspended', updatedAt: new Date() }
      );
    } else {
      const latestSub = await Subscription.findOne({ adminId: admin._id }).sort({ createdAt: -1 });
      if (latestSub && latestSub.status === 'suspended') {
        latestSub.status = 'active';
        latestSub.updatedAt = new Date();
        await latestSub.save();
      }
    }

    await logActivity(req.superAdmin.id, 'superadmin',
      admin.isActive ? 'activate_admin' : 'deactivate_admin',
      `Admin ${admin.isActive ? 'activé' : 'désactivé'}: ${admin.fullName || admin.username}`,
      'User', admin._id);

    res.json({ message: `Admin ${admin.isActive ? 'activé' : 'désactivé'}`, isActive: admin.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    await Subscription.deleteMany({ adminId: admin._id });
    await Payment.deleteMany({ adminId: admin._id });
    await ActivityLog.deleteMany({ userId: admin._id });

    const projects = await Project.find({ ownerId: admin._id });
    for (const project of projects) {
      await mongoose.model('Product').deleteMany({ projectId: project._id });
      await mongoose.model('Sale').deleteMany({ projectId: project._id });
      await mongoose.model('Customer').deleteMany({ projectId: project._id });
    }
    await Project.deleteMany({ ownerId: admin._id });

    await User.findByIdAndDelete(admin._id);

    await logActivity(req.superAdmin.id, 'superadmin', 'delete_admin',
      `Admin supprimé: ${admin.fullName || admin.username} (${admin.email})`, 'User', admin._id);

    res.json({ message: `Admin "${admin.fullName || admin.username}" supprimé définitivement` });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admins/:id/send-credentials', authenticateSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    const tempPassword = generatePassword();
    admin.password = await bcrypt.hash(tempPassword, 10);
    await admin.save();

    const emailSent = await sendEmail(admin.email, 'Vos identifiants BussnessApp', `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1a1a2e; margin-top: 0;">BussnessApp - Identifiants</h2>
          <p style="color: #555;">Bonjour <strong>${admin.fullName || admin.username}</strong>,</p>
          <p style="color: #555;">Voici vos identifiants de connexion :</p>
          <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6C63FF;">
            <p style="margin: 5px 0;"><strong>Email :</strong> ${admin.email}</p>
            <p style="margin: 5px 0;"><strong>Mot de passe :</strong> ${tempPassword}</p>
          </div>
          <p style="color: #e74c3c; font-size: 13px;">Changez votre mot de passe dès votre première connexion.</p>
        </div>
      </div>
    `);

    await logActivity(req.superAdmin.id, 'superadmin', 'send_credentials',
      `Identifiants envoyés à: ${admin.fullName || admin.username}`, 'User', admin._id);

    res.json({ message: emailSent ? 'Identifiants envoyés par email' : 'Identifiants générés (erreur envoi email)', password: tempPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admins/:id/resend-payment-link', authenticateSuperAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      adminId: req.params.id,
      status: 'pending_payment'
    }).sort({ createdAt: -1 });

    if (!subscription || !subscription.stripePaymentLinkUrl) {
      return res.status(404).json({ error: 'Aucun lien de paiement en attente' });
    }

    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    await sendEmail(admin.email, 'Rappel - Lien de paiement BussnessApp', `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1a1a2e; margin-top: 0;">Rappel de paiement</h2>
          <p style="color: #555;">Bonjour <strong>${admin.fullName || admin.username}</strong>,</p>
          <p style="color: #555;">Votre paiement est toujours en attente.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${subscription.stripePaymentLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #6C63FF, #5a50e6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Procéder au paiement (${subscription.amount}\u20AC)
            </a>
          </div>
        </div>
      </div>
    `);

    await logActivity(req.superAdmin.id, 'superadmin', 'resend_payment_link',
      `Lien de paiement renvoyé à: ${admin.fullName}`, 'User', admin._id);

    res.json({ message: 'Lien de paiement renvoyé par email' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ASSIGN SUBSCRIPTION TO EXISTING ADMIN =============

router.post('/admins/:id/subscription', authenticateSuperAdmin, async (req, res) => {
  try {
    const { planId, paymentMethod, notes } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({ error: 'planId et paymentMethod sont obligatoires' });
    }

    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

    const subPlan = await SubscriptionPlan.findById(planId);
    if (!subPlan || !subPlan.isActive) {
      return res.status(400).json({ error: 'Plan invalide ou inactif' });
    }

    await Subscription.updateMany(
      { adminId: admin._id, status: { $in: ['active', 'pending_payment'] } },
      { status: 'cancelled', updatedAt: new Date() }
    );

    const isCardPayment = paymentMethod === 'card';

    const subscription = new Subscription({
      adminId: admin._id,
      planId: subPlan._id,
      planName: subPlan.name,
      plan: subPlan.durationType === 'lifetime' ? 'lifetime' : 'custom',
      status: isCardPayment ? 'pending_payment' : 'active',
      startDate: isCardPayment ? null : new Date(),
      endDate: isCardPayment ? null : getEndDate(subPlan.duration, subPlan.durationType),
      amount: subPlan.price,
      currency: subPlan.currency,
      duration: subPlan.duration,
      durationType: subPlan.durationType,
      maxProjects: subPlan.maxProjects,
      paymentMethod,
      notes,
      createdBy: req.superAdmin.id
    });

    if (isCardPayment && stripe) {
      try {
        const isRecurring = subPlan.isRecurring && subPlan.durationType !== 'lifetime';
        let recurringInterval = 'month';
        if (subPlan.durationType === 'years') recurringInterval = 'year';
        else if (subPlan.durationType === 'months' && subPlan.duration >= 12) recurringInterval = 'year';

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: (subPlan.currency || 'EUR').toLowerCase(),
              product_data: {
                name: `BussnessApp - ${subPlan.name}`,
                description: `${subPlan.name} pour ${admin.fullName} (max ${subPlan.maxProjects} business)`
              },
              unit_amount: Math.round(subPlan.price * 100),
              ...(isRecurring ? { recurring: { interval: recurringInterval } } : {})
            },
            quantity: 1
          }],
          mode: isRecurring ? 'subscription' : 'payment',
          success_url: `${process.env.BACKOFFICE_URL || 'http://localhost:5173'}/admins/${admin._id}?payment=success`,
          cancel_url: `${process.env.BACKOFFICE_URL || 'http://localhost:5173'}/admins/${admin._id}?payment=cancelled`,
          customer_email: admin.email,
          metadata: { adminId: admin._id.toString(), subscriptionId: 'pending' }
        });

        subscription.stripeSessionId = session.id;
        subscription.stripePaymentLinkUrl = session.url;
      } catch (stripeError) {
        console.error('Stripe session creation error:', stripeError.message);
      }
    }

    await subscription.save();

    if (!isCardPayment) {
      admin.isActive = true;
      await admin.save();

      const payment = new Payment({
        subscriptionId: subscription._id,
        adminId: admin._id,
        amount: subPlan.price,
        paymentMethod,
        status: 'completed',
        reference: paymentMethod === 'cash' ? 'Paiement en liquide' : 'Donation',
        paidAt: new Date()
      });
      await payment.save();
    } else {
      admin.isActive = false;
      await admin.save();
    }

    const durationLabel = subPlan.durationType === 'lifetime' ? 'À vie' : `${subPlan.duration} ${DURATION_LABELS[subPlan.durationType] || subPlan.durationType}`;

    if (isCardPayment && subscription.stripePaymentLinkUrl) {
      await sendEmail(admin.email, 'Nouvel abonnement - Lien de paiement', `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a2e; margin-top: 0;">Nouvel abonnement</h2>
            <p style="color: #555;">Bonjour <strong>${admin.fullName}</strong>,</p>
            <p style="color: #555;">Un nouvel abonnement vous a été attribué. Veuillez procéder au paiement :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${subscription.stripePaymentLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #6C63FF, #5a50e6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Procéder au paiement (${subPlan.price}\u20AC)
              </a>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0; color: #555;">Plan : <strong>${subPlan.name}</strong></p>
              <p style="margin: 5px 0; color: #555;">Durée : <strong>${durationLabel}</strong></p>
              <p style="margin: 5px 0; color: #555;">Business max : <strong>${subPlan.maxProjects}</strong></p>
            </div>
          </div>
        </div>
      `);
    } else if (!isCardPayment) {
      await sendEmail(admin.email, 'Nouvel abonnement activé - BussnessApp', `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: #d4edda; color: #155724; padding: 10px 20px; border-radius: 50px; font-weight: 600;">Abonnement activé</div>
            </div>
            <p style="color: #555;">Bonjour <strong>${admin.fullName}</strong>,</p>
            <p style="color: #555;">Votre nouvel abonnement a été activé avec succès.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #555;">Plan : <strong>${subPlan.name}</strong></p>
              <p style="margin: 5px 0; color: #555;">Durée : <strong>${durationLabel}</strong></p>
              <p style="margin: 5px 0; color: #555;">Business max : <strong>${subPlan.maxProjects}</strong></p>
            </div>
          </div>
        </div>
      `);
    }

    await logActivity(req.superAdmin.id, 'superadmin', 'assign_subscription',
      `Abonnement ${subPlan.name} attribué à ${admin.fullName} (${paymentMethod})`, 'Subscription', subscription._id);

    res.status(201).json({
      message: isCardPayment
        ? 'Abonnement créé. Lien de paiement envoyé.'
        : 'Abonnement attribué et activé.',
      subscription: subscription.toObject(),
      paymentLink: subscription.stripePaymentLinkUrl || null
    });
  } catch (error) {
    console.error('Assign subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= SUBSCRIPTION PLANS =============

router.get('/plans', authenticateSuperAdmin, async (req, res) => {
  try {
    const { active } = req.query;
    let query = {};
    if (active === 'true') query.isActive = true;
    const plans = await SubscriptionPlan.find(query).sort({ sortOrder: 1, price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plans/active', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plans/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans', authenticateSuperAdmin, async (req, res) => {
  try {
    const { name, description, price, currency, duration, durationType, maxProjects, features, isRecurring, sortOrder } = req.body;
    if (!name || price == null || !duration || !durationType) {
      return res.status(400).json({ error: 'Champs obligatoires : name, price, duration, durationType' });
    }

    const plan = new SubscriptionPlan({
      name, description, price, currency, duration, durationType,
      maxProjects: maxProjects || 1,
      features: features || [],
      isRecurring: durationType !== 'lifetime' ? (isRecurring !== false) : false,
      sortOrder: sortOrder || 0
    });
    await plan.save();

    await logActivity(req.superAdmin.id, 'superadmin', 'create_plan', `Plan créé: ${name} (${price}\u20AC)`, 'SubscriptionPlan', plan._id);
    res.status(201).json({ message: 'Plan créé', plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/plans/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    const fields = ['name', 'description', 'price', 'currency', 'duration', 'durationType', 'maxProjects', 'features', 'isRecurring', 'isActive', 'sortOrder'];
    fields.forEach(f => { if (req.body[f] !== undefined) plan[f] = req.body[f]; });
    plan.updatedAt = new Date();
    await plan.save();

    await logActivity(req.superAdmin.id, 'superadmin', 'update_plan', `Plan modifié: ${plan.name}`, 'SubscriptionPlan', plan._id);
    res.json({ message: 'Plan mis à jour', plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/plans/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const activeSubs = await Subscription.countDocuments({ planId: req.params.id, status: 'active' });
    if (activeSubs > 0) {
      return res.status(400).json({ error: `Ce plan a ${activeSubs} abonnement(s) actif(s). Désactivez-le plutôt.` });
    }

    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });

    await logActivity(req.superAdmin.id, 'superadmin', 'delete_plan', `Plan supprimé: ${plan.name}`, 'SubscriptionPlan', plan._id);
    res.json({ message: 'Plan supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUBSCRIPTIONS =============

router.get('/subscriptions', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('adminId', 'fullName email username isActive')
      .populate('planId', 'name maxProjects duration durationType')
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/subscriptions/:id/status', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Statut requis' });

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Abonnement non trouvé' });

    subscription.status = status;
    subscription.updatedAt = new Date();

    if (status === 'active' && !subscription.startDate) {
      subscription.startDate = new Date();
      subscription.endDate = getEndDate(subscription.duration || 1, subscription.durationType || 'months');
    }

    await subscription.save();

    if (status === 'active') {
      await User.findByIdAndUpdate(subscription.adminId, { isActive: true });
    } else if (status === 'suspended' || status === 'cancelled') {
      await User.findByIdAndUpdate(subscription.adminId, { isActive: false });
    }

    await logActivity(req.superAdmin.id, 'superadmin', 'update_subscription',
      `Abonnement mis à jour: ${status}`, 'Subscription', subscription._id);

    res.json({ message: 'Statut mis à jour', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= PAYMENTS =============

router.get('/payments', authenticateSuperAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('adminId', 'fullName email')
      .populate('subscriptionId')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= STRIPE WEBHOOK =============

router.post('/stripe/webhook', async (req, res) => {
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && stripe) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const adminId = session.metadata?.adminId;

        if (adminId) {
          const subscription = await Subscription.findOne({
            $or: [
              { stripeSessionId: session.id },
              { adminId, status: 'pending_payment' }
            ]
          }).sort({ createdAt: -1 });

          if (subscription) {
            subscription.status = 'active';
            subscription.startDate = new Date();
            subscription.endDate = getEndDate(subscription.duration || 1, subscription.durationType || 'months');
            subscription.stripeCustomerId = session.customer;
            subscription.stripeSubscriptionId = session.subscription;
            subscription.updatedAt = new Date();
            await subscription.save();

            await User.findByIdAndUpdate(adminId, { isActive: true });

            const payment = new Payment({
              subscriptionId: subscription._id,
              adminId,
              amount: (session.amount_total || 0) / 100,
              paymentMethod: 'card',
              status: 'completed',
              stripePaymentIntentId: session.payment_intent,
              paidAt: new Date()
            });
            await payment.save();

            const admin = await User.findById(adminId);
            if (admin) {
              const tempPassword = generatePassword();
              admin.password = await bcrypt.hash(tempPassword, 10);
              await admin.save();

              await sendEmail(admin.email, 'Paiement confirmé - Vos identifiants BussnessApp', `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
                  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="display: inline-block; background: #d4edda; color: #155724; padding: 10px 20px; border-radius: 50px; font-weight: 600;">Paiement confirmé</div>
                    </div>
                    <p style="color: #555;">Bonjour <strong>${admin.fullName}</strong>,</p>
                    <p style="color: #555;">Votre paiement a été reçu avec succès. Voici vos identifiants :</p>
                    <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6C63FF;">
                      <p style="margin: 5px 0;"><strong>Email :</strong> ${admin.email}</p>
                      <p style="margin: 5px 0;"><strong>Mot de passe :</strong> ${tempPassword}</p>
                    </div>
                    <p style="color: #e74c3c; font-size: 13px;">Changez votre mot de passe dès votre première connexion.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                    <p style="color: #bbb; font-size: 12px; text-align: center;">BussnessApp - Gestion d'entreprise simplifiée</p>
                  </div>
                </div>
              `);

              const superAdmins = await SuperAdmin.find({ isActive: true });
              for (const sa of superAdmins) {
                await sendEmail(sa.email, 'Nouvel abonnement - BussnessApp', `
                  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f8f9fa;">
                    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                      <h2 style="color: #1a1a2e; margin-top: 0;">Nouvel abonnement</h2>
                      <p style="color: #555;">L'admin <strong>${admin.fullName}</strong> (${admin.email}) a souscrit un abonnement.</p>
                      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 5px 0;">Plan : <strong>${subscription.planName || subscription.plan}</strong></p>
                        <p style="margin: 5px 0;">Montant : <strong>${subscription.amount}\u20AC</strong></p>
                        <p style="margin: 5px 0;">Méthode : <strong>Carte bancaire</strong></p>
                      </div>
                    </div>
                  </div>
                `);
              }
            }

            await logActivity(null, 'system', 'payment_completed',
              `Paiement carte confirmé pour ${admin?.fullName || adminId}`, 'Payment', payment._id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'past_due') {
          const subscription = await Subscription.findOne({ stripeSubscriptionId: sub.id });
          if (subscription) {
            subscription.status = sub.status === 'canceled' ? 'cancelled' : 'suspended';
            subscription.updatedAt = new Date();
            await subscription.save();

            if (sub.status !== 'canceled') {
              await User.findByIdAndUpdate(subscription.adminId, { isActive: false });
            }

            await logActivity(null, 'system', 'subscription_' + sub.status,
              `Abonnement Stripe ${sub.status}`, 'Subscription', subscription._id);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.json({ received: true });
});

// ============= ACTIVITY LOGS =============

router.get('/activity-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { limit = 100, adminId } = req.query;
    let query = {};
    if (adminId) query.userId = adminId;

    const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DASHBOARD STATS =============

router.get('/dashboard/stats', authenticateSuperAdmin, async (req, res) => {
  try {
    const [totalAdmins, activeAdmins, inactiveAdmins] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: false })
    ]);

    const [totalSubs, activeSubs, pendingSubs, suspendedSubs] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'pending_payment' }),
      Subscription.countDocuments({ status: 'suspended' })
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const recentAdmins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 }).limit(5);
    const recentActivities = await ActivityLog.find().sort({ createdAt: -1 }).limit(15);

    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);

    const totalPlans = await SubscriptionPlan.countDocuments();
    const activePlans = await SubscriptionPlan.countDocuments({ isActive: true });

    res.json({
      admins: { total: totalAdmins, active: activeAdmins, inactive: inactiveAdmins },
      subscriptions: { total: totalSubs, active: activeSubs, pending: pendingSubs, suspended: suspendedSubs },
      plans: { total: totalPlans, active: activePlans },
      revenue: { total: totalRevenue[0]?.total || 0, monthly: monthlyRevenue[0]?.total || 0 },
      paymentMethods: paymentMethodStats,
      recentAdmins,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
