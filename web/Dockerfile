# Dockerfile multi-stage para /web (Fase 4 / Fase 5 - React + Vite + Nginx)

# Etapa 1: Compilación de la aplicación con Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar bundle de producción
COPY . .
RUN npm run build

# Etapa 2: Servidor web ultraligero con Nginx (~25 MB)
FROM nginx:1.27-alpine

# Copiar bundle compilado a la ruta estática de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx (proxy /api hacia contenedor api y SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto de escucha estándar de Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
