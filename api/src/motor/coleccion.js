import { obtenerCliente } from '../weaviateClient.js';
import { NOMBRE_COLECCION } from './publicacion.js';

/** La colección única del plan gratuito, sobre el cliente compartido del proceso (roadmap 2.4). */
export async function obtenerColeccion() {
  const cliente = await obtenerCliente();
  return cliente.collections.use(NOMBRE_COLECCION);
}
