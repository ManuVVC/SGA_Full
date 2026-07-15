# ============================================================
# Dockerfile — SGA PDA (Frontend React)
# Build multi-stage: Compila con Node, sirve con Nginx
# ============================================================

# ── Etapa 1: Build de producción con Node ───────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos primero para aprovechar la caché de Docker
COPY package*.json ./
RUN npm ci --only=production=false

# Copiar el resto del código fuente y compilar
COPY . .
RUN npm run build

# ── Etapa 2: Servidor Nginx ligero ──────────────────────────
FROM nginx:1.27-alpine

# Copiar el build generado por Vite al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto HTTP estándar
EXPOSE 80

# Nginx arranca en foreground para que Docker gestione el proceso
CMD ["nginx", "-g", "daemon off;"]
