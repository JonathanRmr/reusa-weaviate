import weaviate, { ApiKey } from 'weaviate-client';
import { env } from './env.js';

// Un solo cliente para todo el proceso (roadmap 2.4): cada conexión abre un canal
// gRPC, y abrir uno por petición es la causa clásica de que la app se caiga a los
// pocos minutos de demo.
let client = null;
let conectando = null;

async function crearConexion() {
  const nuevoCliente = await weaviate.connectToWeaviateCloud(env.weaviateUrl, {
    authCredentials: new ApiKey(env.weaviateApiKey),
  });
  return nuevoCliente;
}

/**
 * Devuelve el cliente compartido, conectando de forma perezosa en el primer uso.
 * Si Weaviate no está disponible (clúster aún no creado, red caída, etc.) no se
 * revienta el proceso: se propaga el error para que la ruta que llamó lo traduzca
 * a un 502, y el próximo intento vuelve a intentar conectar.
 */
export async function obtenerCliente() {
  if (client) return client;
  if (!conectando) {
    conectando = crearConexion()
      .then((nuevoCliente) => {
        client = nuevoCliente;
        return client;
      })
      .catch((error) => {
        conectando = null; // permitir reintentar en la próxima llamada
        throw error;
      });
  }
  return conectando;
}

export async function cerrarCliente() {
  if (client) {
    await client.close();
    client = null;
  }
}
