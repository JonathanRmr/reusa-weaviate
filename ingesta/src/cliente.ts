/**
 * Conexion unica a Weaviate Cloud y lectura de configuracion.
 *
 * Toda la configuracion entra por variables de entorno (nunca valores quemados),
 * para que el mismo codigo sirva dentro del contenedor de la Fase 5.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import weaviate, { ApiKey, type WeaviateClient } from 'weaviate-client';
import dotenv from 'dotenv';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_REPO = resolve(AQUI, '..', '..');

// El .env vive en la raiz del repositorio; dotenv no sobreescribe lo que ya
// venga del entorno, asi que en Docker mandan las variables del contenedor.
for (const ruta of [resolve(RAIZ_REPO, '.env'), resolve(RAIZ_REPO, 'ingesta', '.env')]) {
  if (existsSync(ruta)) dotenv.config({ path: ruta, quiet: true });
}

export const NOMBRE_COLECCION = 'Publicacion';

export type Config = {
  url: string;
  apiKey: string;
};

/**
 * Falla de inmediato y con un mensaje accionable si falta configuracion.
 * Es preferible morir al arrancar que a mitad de la exposicion.
 */
export function leerConfig(): Config {
  const url = process.env.WEAVIATE_URL?.trim();
  const apiKey = process.env.WEAVIATE_API_KEY?.trim();

  const faltantes = [
    ['WEAVIATE_URL', url],
    ['WEAVIATE_API_KEY', apiKey],
  ]
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length > 0) {
    throw new Error(
      `Falta configuracion: ${faltantes.join(', ')}.\n` +
        `Copia .env.example a .env en la raiz del repositorio y pon los valores del clúster\n` +
        `(consola de Weaviate Cloud -> REST Endpoint URL y Admin API key).`
    );
  }

  if (!/^https?:\/\//.test(url!)) {
    throw new Error(
      `WEAVIATE_URL debe incluir el esquema https://. Valor recibido: "${url}".\n` +
        `Copia el "REST Endpoint" completo desde la consola de Weaviate Cloud.`
    );
  }

  return { url: url!, apiKey: apiKey! };
}

/**
 * Un solo cliente por proceso: cada conexion abre un canal gRPC y agotarlos es
 * la causa clasica de que la app se caiga a los dos minutos de demo.
 */
export async function conectar(): Promise<WeaviateClient> {
  const { url, apiKey } = leerConfig();
  return weaviate.connectToWeaviateCloud(url, {
    authCredentials: new ApiKey(apiKey),
    timeout: { init: 30, query: 60, insert: 180 },
  });
}

/** Traduce los errores mas frecuentes de Weaviate a algo que se pueda accionar. */
export function explicarError(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (/unauthorized|invalid api key|401/i.test(mensaje)) {
    return `${mensaje}\n\n-> La API key no sirve para esta operacion. Para crear el esquema o ingestar\n   hace falta la Admin API key, no la de solo lectura.`;
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(mensaje)) {
    return `${mensaje}\n\n-> No se pudo resolver WEAVIATE_URL. Revisa que sea el REST Endpoint completo\n   y que haya conexion a internet.`;
  }
  if (/timed out|deadline|UNAVAILABLE/i.test(mensaje)) {
    return `${mensaje}\n\n-> El clúster no respondio. Si acabas de crearlo, espera a que la consola\n   muestre el visto bueno al lado del nombre.`;
  }
  return mensaje;
}
