import { obtenerColeccion } from './coleccion.js';
import { aPublicacion, normalizarCodigo, PROPIEDADES_RESULTADO, redondear } from './publicacion.js';
import { esPosibleDuplicado } from './umbral.js';

export class ErrorNoEncontrado extends Error {
  constructor(codigo) {
    super(`No existe la publicación "${codigo}".`);
    this.codigo = 'NO_ENCONTRADO';
    this.status = 404;
  }
}

/**
 * Motor de /api/similares/:codigo (F5, roadmap 3.4). `nearObject` reutiliza el vector
 * ya guardado de la publicación base, así que el detector no gasta cuota de embeddings.
 */
export async function similares(codigo, limit) {
  const coleccion = await obtenerColeccion();
  const clave = normalizarCodigo(codigo);

  const encontrados = await coleccion.query.fetchObjects({
    filters: coleccion.filter.byProperty('codigo').equal(clave),
    limit: 1,
    returnProperties: PROPIEDADES_RESULTADO,
  });
  const base = encontrados.objects[0];
  if (!base) throw new ErrorNoEncontrado(clave);

  // +1 porque el propio objeto sale siempre primero, a distancia 0. Se descarta por
  // UUID y no por distancia: una republicación idéntica también estaría a 0.
  const vecinos = await coleccion.query.nearObject(base.uuid, {
    limit: limit + 1,
    returnMetadata: ['distance'],
    returnProperties: PROPIEDADES_RESULTADO,
  });

  const { codigo: codigoBase, titulo, categoria, precio, ciudad } = aPublicacion(base.properties);
  return {
    base: { codigo: codigoBase, titulo, categoria, precio, ciudad },
    similares: vecinos.objects
      .filter((objeto) => objeto.uuid !== base.uuid)
      .slice(0, limit)
      .map((objeto) => {
        const distancia = objeto.metadata?.distance;
        return {
          ...aPublicacion(objeto.properties),
          distance: redondear(distancia),
          // Se decide con la distancia sin redondear: 0.2896 no debe convertirse en 0.29 y salir del umbral.
          posibleDuplicado: esPosibleDuplicado(distancia, base.properties, objeto.properties),
        };
      }),
  };
}
