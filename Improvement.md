# Journal d'Améliorations - BussnessApp

## 26 Novembre 2025

### Correction: Erreur de résolution de module pour les images PNG

**Problème identifié:**
```
Unable to resolve module 'src/assets/icon/dashboard.png.js'
Error: Unable to resolve module 'module://src/assets/icon/dashboard.png.js'
```

**Cause:**
- Import incorrect d'image PNG dans `LoginScreen.js` (ligne 20)
- Utilisation de la syntaxe `import logo from '../assets/icon/dashboard.png'` qui ne fonctionne pas correctement avec React Native/Expo

**Solution appliquée:**
- Modification de l'import dans `/frontend/src/screens/LoginScreen.js`
- Remplacement de `import logo from '../assets/icon/dashboard.png'` par `const logo = require('../assets/icon/dashboard.png')`
- La syntaxe `require()` est la méthode recommandée pour importer des assets statiques dans React Native

**Fichiers modifiés:**
- `frontend/src/screens/LoginScreen.js` (ligne 21)

**Vérifications effectuées:**
- ✅ Toutes les dépendances frontend sont compatibles avec Expo SDK 53.0.0
- ✅ Nodemon déjà installé dans le backend (devDependencies)
- ✅ Serveur backend déjà en cours d'exécution

**Impact:**
- L'application mobile ne devrait plus afficher d'erreur de résolution de module au démarrage
- Le logo s'affichera correctement sur l'écran de connexion
