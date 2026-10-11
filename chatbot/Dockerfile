# Dockerfile pour le Frontend React (Vite)
FROM node:20-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances (prend en compte pnpm workspace s'il y en a)
COPY package.json package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Installer pnpm si nécessaire, puis installer les dépendances
RUN npm install -g pnpm && pnpm install

# Copier le reste du code frontend
COPY . .

# Construire l'application pour la production
RUN pnpm run build

# Étape de production avec un serveur web minimal (Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Exposer le port usuel pour le frontend web
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
