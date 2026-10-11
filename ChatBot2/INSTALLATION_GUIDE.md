# 📦 Guide d'Installation - Lumina Chatbot Frontend

## 🎯 Méthode 1 : Copier les Fichiers Essentiels

Voici les fichiers principaux à copier pour intégrer Lumina :

### 1️⃣ Fichier Principal du Chatbot
**`src/app/App.tsx`** - Le composant complet du chatbot avec :
- Widget flottant
- Interface de chat
- Gestion des messages
- Connexion API/Mode démo
- Panneau de paramètres

### 2️⃣ Fichiers de Configuration

**`package.json`** - Dépendances nécessaires :
```json
{
  "dependencies": {
    "lucide-react": "0.487.0",
    "motion": "12.23.24"
  }
}
```

**`vite.config.ts`** - Configuration Vite (si vous utilisez Vite)

### 3️⃣ Styles CSS

**`src/styles/`** - Tous les fichiers CSS :
- `theme.css` - Variables de couleurs
- `globals.css` - Styles globaux
- `fonts.css` - Imports de polices
- `tailwind.css` - Configuration Tailwind

---

## 🚀 Méthode 2 : Installation Complète

### Option A : Depuis l'archive

1. **Télécharger** le fichier `lumina-chatbot-frontend.tar.gz`

2. **Extraire** l'archive :
```bash
tar -xzf lumina-chatbot-frontend.tar.gz
cd lumina-chatbot-frontend
```

3. **Installer** les dépendances :
```bash
pnpm install
# ou
npm install
```

4. **Démarrer** le serveur de développement :
```bash
pnpm dev
# ou
npm run dev
```

### Option B : Création manuelle d'un nouveau projet

```bash
# 1. Créer un nouveau projet Vite + React + TypeScript
pnpm create vite lumina-chatbot --template react-ts
cd lumina-chatbot

# 2. Installer les dépendances nécessaires
pnpm install lucide-react motion
pnpm install -D tailwindcss @tailwindcss/vite

# 3. Copier les fichiers de ce projet :
#    - src/app/App.tsx
#    - src/styles/*
#    - Configuration Tailwind

# 4. Démarrer
pnpm dev
```

---

## 📁 Structure des Fichiers à Copier

```
votre-projet/
├── src/
│   ├── app/
│   │   └── App.tsx              ← FICHIER PRINCIPAL
│   └── styles/
│       ├── theme.css            ← Variables CSS
│       ├── globals.css          ← Styles globaux
│       ├── fonts.css            ← Polices
│       ├── tailwind.css         ← Config Tailwind
│       └── index.css            ← Point d'entrée CSS
├── package.json                 ← Dépendances
├── vite.config.ts              ← Config Vite
├── tsconfig.json               ← Config TypeScript
├── README_DEMO.md              ← Documentation
└── BACKEND_EXAMPLE.md          ← Exemples backend
```

---

## 🔧 Configuration Minimale

### 1. Configuration Tailwind v4

Créez `src/styles/tailwind.css` :
```css
@import "tailwindcss";
@import "./theme.css";
@import "./globals.css";
@import "./fonts.css";
```

### 2. Point d'entrée principal

Modifiez `src/main.tsx` :
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 3. Configuration de l'API

Dans `App.tsx`, modifiez :
```typescript
const API_CONFIG = {
  baseURL: "http://localhost:3000",  // ← Votre backend
  endpoint: "/api/chat",
  mode: "mock" as "mock" | "api",
};
```

---

## 🎨 Intégration sur votre Site Existant

### Si votre site utilise React :

```tsx
// Dans votre Layout ou composant principal
import LuminaChatbot from './components/LuminaChatbot'

function YourSite() {
  return (
    <div>
      {/* Votre contenu existant */}
      <YourContent />
      
      {/* Widget Lumina (position fixe en bas à droite) */}
      <LuminaChatbot />
    </div>
  )
}
```

### Si votre site utilise HTML/JavaScript pur :

1. Build le projet :
```bash
pnpm build
```

2. Les fichiers générés dans `dist/` peuvent être :
   - Hébergés séparément et intégrés via `<iframe>`
   - Ou inclus directement comme scripts dans votre HTML

---

## 📝 Fichiers Disponibles au Téléchargement

1. **`lumina-chatbot-frontend.tar.gz`** - Archive complète du projet
2. **`README_DEMO.md`** - Guide de démonstration
3. **`BACKEND_EXAMPLE.md`** - Exemples de code backend
4. **`INSTALLATION_GUIDE.md`** - Ce fichier

---

## ✅ Checklist d'Installation

- [ ] Télécharger/copier les fichiers
- [ ] Installer les dépendances (`pnpm install`)
- [ ] Configurer l'URL de l'API backend
- [ ] Tester en mode démo
- [ ] Connecter au backend réel
- [ ] Vérifier le responsive design
- [ ] Personnaliser les couleurs si nécessaire
- [ ] Intégrer sur le site principal

---

## 🆘 Besoin d'Aide ?

- **Mode démo ne fonctionne pas** : Vérifiez que les dépendances sont installées
- **Erreurs de build** : Assurez-vous d'avoir Node.js 18+ et pnpm/npm à jour
- **Problèmes CORS** : Consultez `BACKEND_EXAMPLE.md` pour la configuration
- **Styles manquants** : Vérifiez que tous les fichiers CSS sont importés

---

**Prêt à démarrer ! 🚀**
