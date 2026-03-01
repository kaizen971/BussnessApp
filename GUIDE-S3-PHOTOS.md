# Guide : Brancher Amazon S3 pour le stockage des photos

Actuellement, les photos (profil utilisateur et produits) sont stockées en **base64 directement dans MongoDB**. Cette approche fonctionne mais présente des limites :

- Documents MongoDB volumineux (une image compressée = ~100-500 Ko en base64)
- Temps de chargement plus lents à mesure que le nombre d'images augmente
- Coût de stockage MongoDB plus élevé

La migration vers **Amazon S3** résout ces problèmes en stockant les fichiers sur un service dédié et en ne gardant que l'URL dans MongoDB.

---

## 1. Prérequis

- Un compte AWS avec accès à la console
- Node.js et npm installés
- Accès au backend du projet (`backend/server.js`)

## 2. Créer un bucket S3

1. Aller sur la [console S3](https://s3.console.aws.amazon.com/)
2. Cliquer sur **Create bucket**
3. Nom du bucket : `bussnessapp-photos` (ou un nom unique)
4. Région : choisir la plus proche de vos utilisateurs (ex: `eu-west-3` pour Paris)
5. **Décocher** "Block all public access" (les images doivent être accessibles publiquement)
6. Confirmer la création

### Politique du bucket (accès public en lecture)

Dans l'onglet **Permissions > Bucket policy**, ajouter :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bussnessapp-photos/*"
    }
  ]
}
```

### Configurer CORS

Dans **Permissions > CORS**, ajouter :

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 3. Créer un utilisateur IAM

1. Aller sur [IAM](https://console.aws.amazon.com/iam/)
2. Créer un utilisateur `bussnessapp-s3-uploader`
3. Attacher la politique suivante (inline ou custom) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::bussnessapp-photos/*"
    }
  ]
}
```

4. Générer une **Access Key** et noter :
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## 4. Installer les dépendances backend

```bash
cd backend
npm install @aws-sdk/client-s3 multer multer-s3
```

| Package | Rôle |
|---------|------|
| `@aws-sdk/client-s3` | SDK AWS v3 pour communiquer avec S3 |
| `multer` | Middleware Express pour gérer les uploads multipart |
| `multer-s3` | Adaptateur multer pour envoyer directement vers S3 |

## 5. Variables d'environnement

Ajouter dans le fichier `.env` du backend :

```env
AWS_ACCESS_KEY_ID=AKIA...votre_clé
AWS_SECRET_ACCESS_KEY=votre_secret
AWS_REGION=eu-west-3
S3_BUCKET_NAME=bussnessapp-photos
```

## 6. Configuration S3 dans le backend

Ajouter en haut de `server.js`, après les imports existants :

```javascript
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

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
      const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
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
```

## 7. Modifier les routes backend

### Route photo de profil

Remplacer la route existante `PUT /BussnessApp/auth/profile-photo` :

```javascript
app.put('/BussnessApp/auth/profile-photo', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image envoyée' });
    }

    const photoUrl = req.file.location; // URL publique S3

    // Supprimer l'ancienne photo si elle existe sur S3
    const currentUser = await User.findById(req.user.id);
    if (currentUser.photo && currentUser.photo.includes(process.env.S3_BUCKET_NAME)) {
      const oldKey = currentUser.photo.split('.com/')[1];
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: oldKey,
        }));
      } catch (e) {
        console.warn('Impossible de supprimer l\'ancienne photo:', e.message);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { photo: photoUrl },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Route création/modification de produit

Modifier les routes `POST` et `PUT` pour les produits :

```javascript
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
      // Supprimer l'ancienne image
      const oldProduct = await Product.findById(req.params.id);
      if (oldProduct?.image && oldProduct.image.includes(process.env.S3_BUCKET_NAME)) {
        const oldKey = oldProduct.image.split('.com/')[1];
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldKey,
          }));
        } catch (e) {
          console.warn('Impossible de supprimer l\'ancienne image:', e.message);
        }
      }
      updateData.image = req.file.location;
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## 8. Modifier le frontend (React Native)

### Modifier `api.js`

Remplacer l'envoi en base64 par un envoi multipart/form-data :

```javascript
export const authAPI = {
  // ...autres méthodes existantes...
  updateProfilePhoto: (imageUri) => {
    const formData = new FormData();
    formData.append('profilePhoto', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });
    return api.put('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const productsAPI = {
  // ...autres méthodes existantes...
  create: (data, imageUri) => {
    if (imageUri) {
      const formData = new FormData();
      Object.keys(data).forEach(key => formData.append(key, data[key]));
      formData.append('productImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'product.jpg',
      });
      return api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/products', data);
  },
  update: (id, data, imageUri) => {
    if (imageUri) {
      const formData = new FormData();
      Object.keys(data).forEach(key => formData.append(key, data[key]));
      formData.append('productImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'product.jpg',
      });
      return api.put(`/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/products/${id}`, data);
  },
};
```

### Modifier les écrans

Dans `DashboardScreen.js`, remplacer l'envoi base64 par l'URI directe :

```javascript
const handleChangeProfilePhoto = async () => {
  // ...permission check identique...
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    // Retirer base64: true, on n'en a plus besoin
  });
  if (!result.canceled && result.assets[0]) {
    const response = await authAPI.updateProfilePhoto(result.assets[0].uri);
    // ...suite identique...
  }
};
```

Dans `ProductsScreen.js`, stocker l'URI au lieu du base64 et passer l'URI aux fonctions API.

## 9. Migration des données existantes

Si des images base64 existent déjà en base, voici un script de migration :

```javascript
// migrate-images-to-s3.js
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

async function migrateBase64ToS3(model, field, folder) {
  const docs = await model.find({ [field]: { $regex: /^data:image/ } });
  console.log(`${docs.length} documents à migrer dans ${folder}`);

  for (const doc of docs) {
    const base64Data = doc[field];
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) continue;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const key = `${folder}/${doc._id}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: `image/${matches[1]}`,
    }));

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    doc[field] = url;
    await doc.save();
    console.log(`Migré: ${doc._id} -> ${url}`);
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'BussnessApp' });

  const User = mongoose.model('User');
  const Product = mongoose.model('Product');

  await migrateBase64ToS3(User, 'photo', 'profiles');
  await migrateBase64ToS3(Product, 'image', 'products');

  console.log('Migration terminée !');
  process.exit(0);
}

main().catch(console.error);
```

Exécuter avec :

```bash
cd backend
node migrate-images-to-s3.js
```

## 10. Estimation des coûts AWS S3

| Ressource | Estimation |
|-----------|-----------|
| Stockage | ~0.023 $/Go/mois |
| Requêtes PUT | ~0.005 $/1000 requêtes |
| Requêtes GET | ~0.0004 $/1000 requêtes |
| Transfert sortant | ~0.09 $/Go (premiers 10 To) |

Pour 1000 images de ~200 Ko chacune : **~0.005 $/mois** de stockage.

## 11. Alternative : CloudFront (CDN)

Pour de meilleures performances, ajoutez une distribution CloudFront devant S3 :

1. Créer une distribution CloudFront pointant vers le bucket S3
2. Remplacer les URLs S3 par les URLs CloudFront dans les réponses API
3. Les images seront mises en cache au plus près des utilisateurs

---

## Checklist de migration

- [ ] Créer le bucket S3 et configurer les permissions
- [ ] Créer l'utilisateur IAM avec les clés d'accès
- [ ] Installer les dépendances npm (`@aws-sdk/client-s3`, `multer`, `multer-s3`)
- [ ] Ajouter les variables d'environnement au `.env`
- [ ] Ajouter la configuration S3 + multer dans `server.js`
- [ ] Modifier les routes backend (profile-photo, products)
- [ ] Modifier `api.js` pour envoyer en multipart/form-data
- [ ] Modifier les écrans pour envoyer l'URI au lieu du base64
- [ ] Exécuter le script de migration pour les images existantes
- [ ] Tester l'upload et l'affichage des images
- [ ] (Optionnel) Configurer CloudFront pour le CDN
