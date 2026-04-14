FROM node:20-alpine

WORKDIR /app/backend

# Install backend dependencies first to leverage layer caching.
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend and frontend source.
COPY backend ./
COPY ["Gun Dungeon Game", "/app/Gun Dungeon Game"]

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
