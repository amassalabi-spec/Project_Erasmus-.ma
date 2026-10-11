# 🏗️ Architecture du Projet Lumina

Ce document explique le rôle de chaque fichier et dossier principal de l'espace de travail. Votre projet est un système de **Chatbot IA avancé basé sur la technologie RAG (Retrieval-Augmented Generation)**. Il est divisé en un "Cerveau" (Backend en Python) et une "Interface" (Frontend en React).

## 📂 À la racine (L'Intelligence Artificielle)
* **`Lumina.ipynb`** : Le cœur de l'Intelligence Artificielle. C'est le Jupyter Notebook qui contient le code en Python pour lire les données, paramétrer ChromaDB (la mémoire vectorielle), interagir avec le modèle Phi-3, et lancer le serveur API (`FastAPI`) pour communiquer avec le site web.
* **`CELLS_EXPLAINED.md`** : Document texte explicatif qui décrit à quoi sert telle ou telle cellule du Notebook.
* Fichiers temporaires (`extracted_cell1.py`, `cell_1_content.txt`, `temp_transcript_code.txt`) : Fichiers liés à l'extraction et aux tests passés sur les cellules du notebook.

## 📂 Dossier `Chat Bot/` (L'interface visuelle Web)
C'est l'application React/TypeScript (compilée avec Vite) qui sert de frontend.
* **`index.html`** : Point d'entrée web qui charge l'application React.
* **`package.json`** / **`pnpm-workspace.yaml`** : Registre du frontend et des dépendances (React, Tailwind, etc.).
* **`vite.config.ts`** : Configuration de Vite pour lancer et compiler le site web ultra rapidement.
* **`src/app/App.tsx`** : Le composant central du site. C'est lui qui gère la fenêtre de chat, les inputs et qui envoie les requêtes HTTP au serveur FastAPI.
* **`src/components/ui/`** : Dossier contenant les composants de l'interface (boutons, formulaires...) basés sur *shadcn/ui*.

## 📂 Dossier `data/` (La matière grise)
Contient toutes les connaissances brutes qui alimentent le modèle (voir `data/README.md`).

## 📂 Dossier `db_rag/` (La mémoire locale)
Contient la base de données vectorielle ChromaDB compilée (voir `db_rag/README.md`).

## 📂 Dossier `models/` (Le cerveau brut)
Contient les modèles de langage lourds (voir `models/README.md`).
