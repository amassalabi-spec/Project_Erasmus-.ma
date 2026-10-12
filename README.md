# 🇲🇦 Lumina RAG — Assistant Intelligent Erasmus+ Maroc

> **Architecture RAG 100% locale** — Souveraineté des données, recherche sémantique hybride, cache sémantique, dashboard admin.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

---

## ✨ Fonctionnalités

| Fonction | Description |
|----------|-------------|
| 🔍 **Recherche Sémantique Hybride** | Dense + Sparse retrieval avec filtrage dynamique par profil |
| ⚡ **Cache Sémantique (MMR)** | Réponses instantanées (~0s) pour questions fréquentes |
| 🤖 **LLM Local (Phi-3 Mini 4-bit GGUF)** | Aucune donnée ne sort de votre infrastructure |
| 📊 **Dashboard Admin** | Logs erreurs, stats d'usage, amélioration continue KB |
| 🐳 **Docker Compose** | Déploiement en une commande |

---

## 🏗 Architecture

```
lumina-rag/
├── backend/                 # FastAPI + RAG Engine
│   ├── config.py           # Configuration centralisée
│   ├── data_manager.py     # Ingestion & Vector Store (ChromaDB)
│   ├── llm_engine.py       # Phi-3 via llama-cpp-python
│   ├── rag_chat.py         # Pipeline RAG + Semantic Cache
│   ├── analytics.py        # Stats & Monitoring
│   └── main.py             # API REST + SSE
├── chatbot/ / ChatBot2/    # React + Vite + Tailwind + shadcn/ui
├── data/                   # Documents sources (PDF, JSONL, TXT)
├── db_rag/                 # ChromaDB persistant (gitignored)
├── models/                 # Phi-3 GGUF (gitignored - télécharger depuis HF)
├── docker-compose.yml      # Orchestration complète
├── Dockerfile              # Backend container
└── .gitignore              # Exclut modèles, DB, node_modules, __pycache__
```

---

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Modèle Phi-3 Mini 4-bit GGUF (voir ci-dessous)

### 1. Télécharger le modèle
```bash
# Depuis HuggingFace : microsoft/Phi-3-mini-4k-instruct-gguf
# Placer dans ./models/Phi-3-mini-4k-instruct-q4.gguf
```

### 2. Lancer
```bash
docker-compose up --build
```

### 3. Accéder
- **Frontend** : http://localhost:80
- **API Backend** : http://localhost:3000
- **Docs API** : http://localhost:3000/docs

---

## 📦 Stack Technique

| Couche | Technologies |
|--------|--------------|
| **LLM** | Phi-3 Mini 4k (GGUF 4-bit) via `llama-cpp-python` |
| **Embeddings** | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| **Vector DB** | ChromaDB (persistant) |
| **Framework** | FastAPI (async), LangChain, LangGraph |
| **Frontend** | React 18, TypeScript, Vite, Tailwind, shadcn/ui |
| **Streaming** | Server-Sent Events (SSE) |
| **Déploiement** | Docker Compose, Cloudflare Tunnel (remote access) |

---

## 🔧 Configuration

Variables d'environnement (`backend/.env` ou `docker-compose.yml`) :
```env
# Modèle
LLM_MODEL_PATH=./models/Phi-3-mini-4k-instruct-q4.gguf
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# RAG
CHUNK_SIZE=1200
CHUNK_OVERLAP=150
TOP_K=3
TEMPERATURE=0.0

# Cache Sémantique
CACHE_THRESHOLD=0.88
CACHE_PERSIST_DIR=./db_rag
```

---

## 📚 Documentation

- [Architecture Technique](ARCHITECTURE_PROJET.md)
- [Présentation Projet](PRESENTATION_PROJET.md)
- [API Reference](http://localhost:3000/docs)

---

## 🤝 Contribuer

1. Fork le repo
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Committez (`git commit -m 'feat: add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

---

## 📄 License

Distribué sous licence MIT. Voir `LICENSE` pour plus d'informations.

---

## 👤 Auteur

**MASSALABI OUMAROU Almajir**  
🇲🇦 Maroc | Data Science & AI Engineer  
🔗 [GitHub](https://github.com/amassalabi-spec) | 📧 amassalabi@gmail.com

---

> *"Souveraineté des données = Liberté d'innovation"*