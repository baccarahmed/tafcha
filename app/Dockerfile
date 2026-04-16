# Utiliser une image Node.js officielle
FROM node:22.14.0-alpine

# Installer les dépendances système nécessaires
RUN apk add --no-cache python3 make g++

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --production=false --legacy-peer-deps
RUN npx prisma generate

# Copier le reste du code
COPY . .

# Build l'application
RUN npm run build

# Exposer le port
EXPOSE 3001

# Commande de démarrage
CMD ["npm", "run", "server"]