# ============================================================
# Dockerfile — SGA PDA (Frontend React)
# Build multi-stage: Soporta desarrollo y producción
# ============================================================

# ── Etapa 1: Base común de Node ─────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false

# ── Etapa 2: Entorno de Desarrollo (Vite Dev Server) ────────
FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Etapa 3: Build de Producción ────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build

# ── Etapa 4: Servidor Nginx (Producción) ────────────────────
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
