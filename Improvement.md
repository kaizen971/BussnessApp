# Historique des améliorations - BussnessApp

Ce document répertorie toutes les améliorations apportées au projet BussnessApp.

---

## 2025-10-06 - Amélioration du design du Dashboard

### Description
Suppression des ombres (shadows) sur tous les cadres du dashboard pour un design plus épuré et moderne.

### Fichiers modifiés
1. **frontend/src/components/Card.js:54-56**
   - Suppression des propriétés shadow dans le style `elevated`
   - Propriétés retirées : `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`

2. **frontend/src/screens/DashboardScreen.js:436-443**
   - Suppression des ombres dans `headerGradient`

3. **frontend/src/screens/DashboardScreen.js:540-546**
   - Suppression des ombres dans `statIcon`

4. **frontend/src/screens/DashboardScreen.js:641-648**
   - Suppression des ombres dans `actionButton`

5. **frontend/src/screens/DashboardScreen.js:655-662**
   - Suppression des ombres dans `actionIcon`

### Impact
- Design plus plat et moderne
- Performance légèrement améliorée (moins de calculs de rendu)
- Interface plus cohérente avec les tendances actuelles du design mobile

### Notes techniques
- Les bordures (`borderWidth` et `borderColor`) ont été conservées pour maintenir la délimitation visuelle des éléments
- Aucun changement fonctionnel, uniquement esthétique
