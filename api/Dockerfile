# Dockerfile para /api (Fase 2 / Fase 5 - Node.js Express)
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar exclusivamente dependencias de producción
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Asegurar propiedad de los archivos para el usuario no root
RUN chown -R node:node /app

# Usuario no root para seguridad (Roadmap 5.2)
USER node

# Puerto por defecto
ENV PORT=3001
EXPOSE 3001

# Arrancar el servidor Express escuchando en 0.0.0.0:3001
CMD ["node", "src/index.js"]
