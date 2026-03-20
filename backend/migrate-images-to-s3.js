/**
 * Script de migration : Base64 (MongoDB) -> Amazon S3
 *
 * Usage : cd backend && node migrate-images-to-s3.js
 *
 * Ce script :
 * 1. Trouve tous les documents avec des images base64
 * 2. Upload chaque image vers S3
 * 3. Remplace le base64 par l'URL S3 dans MongoDB
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Définir les schemas nécessaires
const ProductSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: String,
  image: String,
}, { strict: false });

const UserSchema = new mongoose.Schema({
  username: String,
  photo: String,
}, { strict: false });

const ProjectSchema = new mongoose.Schema({
  name: String,
  logo: String,
}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);

async function migrateBase64ToS3(model, field, folder) {
  const docs = await model.find({ [field]: { $regex: /^data:image/ } });
  console.log(`\n📦 ${docs.length} documents à migrer dans "${folder}"`);

  let migrated = 0;
  let errors = 0;

  for (const doc of docs) {
    const base64Data = doc[field];
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.warn(`  ⚠️  Format invalide pour ${doc._id}, ignoré`);
      errors++;
      continue;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const key = `${folder}/${doc._id}.${ext}`;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: `image/${matches[1]}`,
      }));

      const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      doc[field] = url;
      await doc.save();
      migrated++;
      console.log(`  ✅ ${doc._id} (${doc.name || doc.username || 'N/A'}) -> ${url}`);
    } catch (err) {
      errors++;
      console.error(`  ❌ Erreur pour ${doc._id}: ${err.message}`);
    }
  }

  console.log(`  Résultat: ${migrated} migrés, ${errors} erreurs`);
}

async function main() {
  console.log('🚀 Démarrage de la migration des images vers S3...');
  console.log(`   Bucket: ${process.env.S3_BUCKET_NAME}`);
  console.log(`   Région: ${process.env.AWS_REGION}`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'BussnessApp' });
  console.log('✅ Connecté à MongoDB');

  await migrateBase64ToS3(Product, 'image', 'products');
  await migrateBase64ToS3(User, 'photo', 'profiles');
  await migrateBase64ToS3(Project, 'logo', 'logos');

  console.log('\n🎉 Migration terminée !');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
