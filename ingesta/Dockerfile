# Dockerfile para /ingesta (Fase 1 / Fase 5 - Ingesta y normalización)
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para tsx y typescript)
RUN npm ci

# Copiar código fuente
COPY . .

# Crear directorio de reportes con permisos
RUN mkdir -p /app/reportes

# Declarar punto de montaje para /datos
VOLUME ["/datos"]

# Crear el esquema en Weaviate y cargar los datos desde /datos una sola vez
CMD ["sh", "-c", "npx tsx src/esquema.ts && if [ -f /datos/semilla.csv ]; then npx tsx src/cargar.ts --archivo=/datos/semilla.csv; else npx tsx src/cargar.ts; fi"]
