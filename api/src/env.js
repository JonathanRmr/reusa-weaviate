import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Un solo .env para todo el repositorio, compartido con /ingesta: duplicar la misma
// credencial en dos archivos es la forma más fácil de acabar filtrando uno de los dos.
// api/.env (si existe) gana sobre el de la raíz, y dentro de Docker mandan las
// variables del contenedor, porque dotenv no sobrescribe lo que ya está definido.
const AQUI = dirname(fileURLToPath(import.meta.url));
for (const ruta of [resolve(AQUI, '..', '.env'), resolve(AQUI, '..', '..', '.env')]) {
  if (existsSync(ruta)) dotenv.config({ path: ruta });
}

const url = process.env.WEAVIATE_URL?.trim();
const esLocal = url && !url.includes('weaviate.cloud') && !url.includes('weaviate.network');
const REQUERIDAS = esLocal ? ['WEAVIATE_URL'] : ['WEAVIATE_URL', 'WEAVIATE_API_KEY'];

function morirPorConfigFaltante(variable) {
  console.error(
    `[config] Falta la variable de entorno ${variable}. ` +
      'Revisa .env (desarrollo) o las variables pasadas al contenedor (docker-compose / panel del proveedor). ' +
      'El servidor no puede arrancar sin credenciales de Weaviate.',
  );
  process.exit(1);
}

for (const variable of REQUERIDAS) {
  if (!process.env[variable] || process.env[variable].trim() === '') {
    morirPorConfigFaltante(variable);
  }
}

export const env = {
  weaviateUrl: process.env.WEAVIATE_URL,
  weaviateApiKey: process.env.WEAVIATE_API_KEY,
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
