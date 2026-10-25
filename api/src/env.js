import 'dotenv/config';

const REQUERIDAS = ['WEAVIATE_URL', 'WEAVIATE_API_KEY'];

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
