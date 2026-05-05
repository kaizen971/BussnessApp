const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://easDatabase:oDqCMD5pRdMBLImo@eas.sg9meiv.mongodb.net/';
const NEW_PASSWORD = process.argv[2] || 'Admin@2026!';

const SuperAdminSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  fullName: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
});

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connecté à MongoDB');

    const SuperAdmin = mongoose.model('SuperAdmin', SuperAdminSchema);
    const admins = await SuperAdmin.find({});
    const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

    if (admins.length === 0) {
      // Crée le superadmin initial
      const sa = new SuperAdmin({
        username: 'admin',
        email: 'yerbe.jordan@gmail.com',
        password: hashed,
        fullName: 'Super Admin',
        isActive: true,
      });
      await sa.save();
      console.log('\nSuperadmin créé avec succès !');
    } else {
      console.log(`\nSuperadmins existants :`);
      admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.username} (${a.email})`));
      await SuperAdmin.updateMany({}, { password: hashed, isActive: true });
      console.log('\nMot de passe réinitialisé avec succès !');
    }

    console.log(`\nIdentifiants du backoffice :`);
    console.log(`  Email    : yerbe.jordan@gmail.com`);
    console.log(`  Password : ${NEW_PASSWORD}`);
  } catch (err) {
    console.error('Erreur :', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
