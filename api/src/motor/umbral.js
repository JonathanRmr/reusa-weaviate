// Regla del detector de republicaciones (F5, roadmap 3.4). Calibrada con
// `npm run calibrar`; la tabla y la justificación completas están en docs/evaluacion.md §3.
//
// La distancia sola no alcanza. El embedding representa QUÉ ES el artículo (decisión 1 del
// esquema), así que dos consolas distintas de dos vendedores distintos quedan a 0.157,
// más cerca que la mitad de las republicaciones reales. Lo que distingue "el mismo
// artículo publicado otra vez" de "otro artículo del mismo tipo" es justo lo que dejamos
// fuera del vector a propósito: quien republica sigue en la misma ciudad y no cambia
// mucho el precio. Por eso la regla usa los tres datos.
//
//   solo distancia, corte de los 20 pares de referencia (0.355): 10/10, pero 59 de 272
//     publicaciones mostrarían una insignia falsa.
//   solo distancia, mejor corte sobre todo el catálogo (≈0.21):   8/10, 1 par falso.
//   distancia < 0.29 + misma ciudad + precio a ±20 %:             10/10, 0 pares falsos
//     entre los 36.846 pares de artículos distintos.

/** Punto medio entre la republicación más lejana (0.271) y el primer par distinto que cumple ciudad y precio (0.315). */
export const UMBRAL_DISTANCIA = 0.29;

/** El más barato debe valer al menos el 80 % del otro: quien republica puede rebajar, pero no a la mitad. */
export const TOLERANCIA_PRECIO = 0.8;

/** Del más barato al más caro, en [0, 1]. 1 = mismo precio. */
export function proporcionPrecio(a, b) {
  const mayor = Math.max(a, b);
  return mayor === 0 ? 1 : Math.min(a, b) / mayor;
}

/**
 * ¿Es `candidato` posiblemente la misma publicación que `base`, subida otra vez?
 * `distancia` es la coseno entre sus vectores; base y candidato traen `ciudad` y `precio`.
 */
export function esPosibleDuplicado(distancia, base, candidato, umbral = UMBRAL_DISTANCIA) {
  return (
    typeof distancia === 'number' &&
    distancia < umbral &&
    base.ciudad === candidato.ciudad &&
    proporcionPrecio(base.precio, candidato.precio) >= TOLERANCIA_PRECIO
  );
}
