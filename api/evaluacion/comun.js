// Piezas compartidas por los scripts de evaluación. Todos usan el mismo motor que la API
// (src/motor), así que lo que se mide es exactamente lo que ve el usuario.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { obtenerColeccion } from '../src/motor/coleccion.js';
import { cerrarCliente } from '../src/weaviateClient.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_REPO = resolve(AQUI, '..', '..');
const DIR_RESULTADOS = resolve(AQUI, 'resultados');

/**
 * Los resultados se versionan, a diferencia de los reportes de la ingesta: aquellos se
 * regeneran gratis, estos gastan cuota de embeddings y dependen del estado del clúster
 * el día que se midió. Son la evidencia de docs/evaluacion.md.
 */
export function guardarResultado(nombre, datos, markdown) {
  mkdirSync(DIR_RESULTADOS, { recursive: true });
  const sello = { generado: new Date().toISOString(), ...datos };
  writeFileSync(resolve(DIR_RESULTADOS, `${nombre}.json`), JSON.stringify(sello, null, 2) + '\n');
  writeFileSync(resolve(DIR_RESULTADOS, `${nombre}.md`), `<!-- Generado por npm run en ${sello.generado}. No editar a mano. -->\n\n${markdown}\n`);
  console.log(`\nResultados en api/evaluacion/resultados/${nombre}.{json,md}`);
}

/**
 * Todo el catálogo en una sola petición. No gasta embeddings: es una lectura. Se
 * comprueba contra el conteo para no evaluar sobre un catálogo partido sin saberlo.
 */
export async function leerCatalogo({ conVectores = false } = {}) {
  const coleccion = await obtenerColeccion();
  const total = (await coleccion.aggregate.overAll()).totalCount;
  const respuesta = await coleccion.query.fetchObjects({
    limit: Math.max(total, 1),
    includeVector: conVectores,
    returnProperties: ['codigo', 'titulo', 'categoria', 'precio', 'ciudad', 'estado'],
  });
  if (respuesta.objects.length !== total) {
    throw new Error(`Se leyeron ${respuesta.objects.length} objetos de ${total}: el catálogo llegó incompleto.`);
  }
  return respuesta.objects.map((objeto) => ({
    uuid: objeto.uuid,
    ...objeto.properties,
    ...(conVectores ? { vector: Object.values(objeto.vectors)[0] } : {}),
  }));
}

export async function ejecutar(principal) {
  try {
    await principal();
  } catch (error) {
    console.error(`\nFalló la evaluación: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await cerrarCliente();
  }
}

export const fijo = (valor, decimales = 3) => (typeof valor === 'number' ? valor.toFixed(decimales) : '—');
