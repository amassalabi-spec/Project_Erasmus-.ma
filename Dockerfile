# DOCKERFILE POUR LE BACKEND LUMINA
FROM python:3.10-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le fichier des dépendances
COPY backend/requirements.txt .

# Installer les dépendances (avec quelques outils de base nécessaires pour compiler llama-cpp)
RUN apt-get update && apt-get install -y build-essential gcc g++ cmake && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get remove -y build-essential gcc g++ cmake && \
    apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copier tout le code du backend
COPY backend/ ./backend/

# Note : en production, on montera ou copiera aussi les dossiers /data, /db_rag et /models
# COPY data/ ./data/
# COPY db_rag/ ./db_rag/
# COPY models/ ./models/

# Exposer le port de l'API
EXPOSE 3000

# Commande pour démarrer le serveur FastAPI
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "3000"]
