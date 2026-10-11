# Lumina - Chatbot Erasmus+ Widget

## 📋 Présentation

Lumina est un widget de chatbot intelligent conçu pour assister les étudiants dans leur projet de mobilité internationale Erasmus+. Le widget s'intègre discrètement sur un site existant tout en restant facilement accessible.

## ✨ Fonctionnalités

- **Interface compacte** : 360×520px, optimisée pour l'intégration
- **Bulle d'accroche animée** : Apparaît après 1,5s pour attirer l'attention
- **Bouton flottant avec pulsation** : Animation subtile pour la visibilité
- **Mode minimisé** : Réduit le chat en une barre compacte
- **Suggestions rapides** : Questions fréquentes pour démarrer la conversation
- **Mode Démo & API Live** : Testez sans backend ou connectez-vous à votre API
- **Panneau de paramètres** : Changez facilement entre les modes

## 🚀 Démarrage Rapide

### Mode Démo (Sans Backend)

Le widget fonctionne immédiatement en mode démo avec des réponses simulées.

1. Le serveur de développement est déjà en cours d'exécution
2. Ouvrez l'application dans l'aperçu
3. Le chatbot est prêt à être testé !

### Mode API Live (Avec Backend)

#### 1. Configuration du Backend

Modifiez la configuration dans `src/app/App.tsx` :

```typescript
const API_CONFIG = {
  // Changez cette URL pour pointer vers votre backend
  baseURL: "http://localhost:3000",
  endpoint: "/api/chat",
  // Mode par défaut au démarrage
  mode: "mock" as "mock" | "api",
};
```

#### 2. Format de l'API Backend

Votre backend doit exposer un endpoint POST qui accepte et retourne :

**Requête :**
```json
{
  "message": "Comment candidater à Erasmus ?"
}
```

**Réponse :**
```json
{
  "response": "Pour candidater à Erasmus+, vous devez..."
}
```

Ou simplement :
```json
{
  "message": "Pour candidater à Erasmus+, vous devez..."
}
```

#### 3. Configuration CORS

Votre backend doit autoriser les requêtes depuis l'origine du frontend. Exemple pour Express.js :

```javascript
const cors = require('cors');
app.use(cors({
  origin: '*', // En développement - Restreindre en production!
  methods: ['POST', 'GET'],
  credentials: true
}));
```

#### 4. Basculer vers le Mode API

Une fois le backend démarré :
1. Cliquez sur l'icône ⚙️ (Paramètres) dans le header du chatbot
2. Sélectionnez **"API Live"**
3. L'URL de l'API s'affiche sous les boutons
4. Le statut passe de "Mode Démo" à "API Live"

## 🎨 Personnalisation

### Thème et Couleurs

Les couleurs sont définies dans `src/styles/theme.css`. Le chatbot utilise :
- **Primaire** : Bleu gradient (#1E4FD8 → #3B6EF5)
- **Accent** : Pour les notifications
- **Card** : Arrière-plan des messages

### Suggestions Prédéfinies

Modifiez le tableau `SUGGESTIONS` dans `App.tsx` :

```typescript
const SUGGESTIONS = [
  "Votre question 1",
  "Votre question 2",
  "Votre question 3",
  "Votre question 4",
];
```

### Message de Bienvenue

Changez le message initial dans le state `messages` :

```typescript
const [messages, setMessages] = useState<Message[]>([
  {
    id: "0",
    role: "assistant",
    content: "Votre message de bienvenue personnalisé ici !",
  },
]);
```

## 🔧 Structure du Code

```
src/
├── app/
│   ├── App.tsx              # Composant principal du chatbot
│   └── components/          # Composants réutilisables
├── styles/
│   ├── theme.css           # Variables CSS et thème
│   └── fonts.css           # Imports de polices
└── imports/                # Assets importés depuis Figma
```

## 📦 Intégration sur un Site Existant

### Option 1 : Composant React

Si votre site utilise React :

1. Copiez le composant `App.tsx` dans votre projet
2. Importez les dépendances nécessaires :
   - `lucide-react`
   - `motion` (Framer Motion)
3. Incluez le composant dans votre layout :

```tsx
import LuminaWidget from './components/LuminaWidget';

function Layout() {
  return (
    <>
      {/* Votre contenu */}
      <LuminaWidget />
    </>
  );
}
```

### Option 2 : Iframe

Pour une intégration universelle :

1. Hébergez l'application build sur un serveur
2. Intégrez via iframe :

```html
<iframe
  src="https://votre-domaine.com/lumina-widget"
  style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; border: none; z-index: 9999;"
  title="Assistant Lumina"
></iframe>
```

## 🧪 Tests

### Test du Mode Démo
1. Ouvrez le chatbot
2. Posez des questions avec les mots-clés : "candidat", "pays", "bourse", "délai"
3. Vérifiez que les réponses sont contextuelles

### Test du Mode API
1. Démarrez votre backend
2. Activez le mode "API Live" dans les paramètres
3. Envoyez des messages et vérifiez les réponses
4. Surveillez la console pour les erreurs réseau

### Points de Contrôle
- ✅ Bulle d'accroche apparaît après 1,5s
- ✅ Bouton flottant avec animation de pulsation
- ✅ Mode minimisé fonctionne
- ✅ Suggestions cliquables
- ✅ Indicateur de saisie (typing dots)
- ✅ Scroll automatique vers les nouveaux messages
- ✅ Textarea auto-expandable (max 100px)
- ✅ Envoi avec Enter (Shift+Enter pour nouvelle ligne)
- ✅ Badge de notification non lue

## 🐛 Résolution des Problèmes

### Le chatbot ne se connecte pas à l'API

1. Vérifiez que le backend est démarré
2. Confirmez l'URL dans `API_CONFIG.baseURL`
3. Vérifiez la console pour les erreurs CORS
4. Assurez-vous que le endpoint retourne bien du JSON

### Les messages ne s'affichent pas

1. Ouvrez la console développeur
2. Vérifiez les erreurs JavaScript
3. Confirmez que le mode est bien "API Live" dans les paramètres

### Problèmes de CORS

Ajoutez ces headers dans votre backend :
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

## 📱 Responsive Design

Le widget est optimisé pour tous les écrans :
- **Desktop** : Pleine largeur (370px)
- **Tablette** : Adapté
- **Mobile** : Pleine largeur avec padding réduit

## 🎯 Prochaines Étapes

1. [ ] Connexion au backend
2. [ ] Tests avec données réelles
3. [ ] Ajustements UX basés sur les retours
4. [ ] Intégration sur le site principal
5. [ ] Analytics et suivi des interactions

## 📞 Support

Pour toute question ou problème :
- Vérifiez d'abord ce README
- Consultez la console développeur
- Testez en mode Démo pour isoler les problèmes backend

---

**Bonne présentation ! 🚀**
