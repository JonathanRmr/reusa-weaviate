import { obtenerColeccion } from './coleccion.js';
import { construirFiltros } from './filtros.js';
import { elegirModo, MODOS } from './modo.js';
import { aResultado, CAMPOS_TEXTO, PROPIEDADES_RESULTADO } from './publicacion.js';

/**
 * Motor de /api/buscar (roadmap 3.1–3.3). Recibe los parámetros ya validados por
 * `validarBusqueda` y devuelve el cuerpo del contrato: { resultados, tomoMs, modo }.
 */
export async function buscar({ q, alpha, limit, ...filtros }) {
  const coleccion = await obtenerColeccion();
  const modo = elegirModo(alpha);
  const comunes = {
    limit,
    filters: construirFiltros(coleccion.filter, filtros),
    returnProperties: PROPIEDADES_RESULTADO,
  };

  const inicio = performance.now();
  let respuesta;
  if (modo === MODOS.LEXICO) {
    respuesta = await coleccion.query.bm25(q, {
      ...comunes,
      queryProperties: CAMPOS_TEXTO,
      returnMetadata: ['score'],
    });
  } else if (modo === MODOS.VECTORIAL) {
    respuesta = await coleccion.query.nearText(q, {
      ...comunes,
      returnMetadata: ['distance'],
    });
  } else {
    // RelativeScore es el valor por defecto del servidor desde 1.24; se fija explícito
    // para que la evaluación de docs/evaluacion.md no dependa de la versión del clúster.
    // No se pide `distance`: Weaviate no la devuelve para el resultado fusionado (medido
    // en 1.40: null en 200 de 200 resultados), así que en este modo viaja en null.
    respuesta = await coleccion.query.hybrid(q, {
      ...comunes,
      alpha,
      fusionType: 'RelativeScore',
      queryProperties: CAMPOS_TEXTO,
      returnMetadata: ['score'],
    });
  }

  return {
    resultados: respuesta.objects.map(aResultado),
    tomoMs: Math.round(performance.now() - inicio),
    modo,
  };
}
