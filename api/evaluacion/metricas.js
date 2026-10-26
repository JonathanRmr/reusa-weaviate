// Métricas de la evaluación (roadmap 3.3–3.5). Funciones puras: se prueban sin red.

/** Fracción del top k que es relevante. Si la respuesta trae menos de k, lo que falta cuenta como fallo. */
export function precisionEnK(codigos, relevantes, k) {
  const conjunto = new Set(relevantes);
  return codigos.slice(0, k).filter((c) => conjunto.has(c)).length / k;
}

/**
 * El mejor Precision@k posible para esa consulta. Con 3 relevantes en todo el catálogo
 * ni un buscador perfecto pasa de 0.6: sin este techo la tabla castigaría a la consulta,
 * no al método.
 */
export function techoPrecision(relevantes, k) {
  return Math.min(k, relevantes.length) / k;
}

/** 1 / posición del primer relevante; 0 si no aparece. Distingue "lo puso primero" de "lo puso quinto". */
export function rangoReciproco(codigos, relevantes) {
  const conjunto = new Set(relevantes);
  const posicion = codigos.findIndex((c) => conjunto.has(c));
  return posicion === -1 ? 0 : 1 / (posicion + 1);
}

/** Fracción de los esperados que sí llegaron. Con `esperados` vacío no hay nada que perder: 1. */
export function recall(obtenidos, esperados) {
  if (esperados.length === 0) return 1;
  const conjunto = new Set(obtenidos);
  return esperados.filter((e) => conjunto.has(e)).length / esperados.length;
}

export function promedio(valores) {
  return valores.length === 0 ? 0 : valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Distancia coseno, la que usa la colección: 0 idéntico, 2 opuesto. */
export function distanciaCoseno(a, b) {
  let punto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    punto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  return 1 - punto / Math.sqrt(normaA * normaB);
}

/** Percentil por el método del rango más cercano, sobre una copia ordenada. */
export function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1));
  return ordenados[indice];
}

/**
 * Elige el corte para "posible republicación" a partir de las distancias de pares
 * republicados (positivos) y pares distintos (negativos). Se marca duplicado cuando
 * distancia < corte.
 *
 * Si los grupos no se tocan, el corte va en el punto medio del hueco: es el que más
 * margen deja a ambos lados para lo que el catálogo de prueba no vio. Si se solapan, se
 * prueba cada punto medio entre valores consecutivos y gana el de menos errores; ante
 * empate, el de menos falsos positivos, porque acusar de republicación a un vendedor
 * honesto es peor que dejar pasar un duplicado.
 *
 * Recorre los valores ordenados una sola vez: los negativos pueden ser los ~37.000 pares
 * del catálogo, no solo los 10 de control.
 */
export function elegirCorte(positivos, negativos) {
  const maxPositivo = positivos.reduce((a, b) => Math.max(a, b), -Infinity);
  const minNegativo = negativos.reduce((a, b) => Math.min(a, b), Infinity);

  if (maxPositivo < minNegativo) {
    return {
      corte: (maxPositivo + minNegativo) / 2,
      separables: true,
      hueco: [maxPositivo, minNegativo],
      falsosNegativos: 0,
      falsosPositivos: 0,
    };
  }

  const puntos = [...positivos.map((d) => [d, true]), ...negativos.map((d) => [d, false])].sort((a, b) => a[0] - b[0]);
  // Un corte entre puntos[i] y puntos[i + 1] marca como duplicado todo hasta i inclusive.
  let falsosNegativos = positivos.length;
  let falsosPositivos = 0;
  let mejor = null;
  for (let i = 0; i < puntos.length - 1; i++) {
    if (puntos[i][1]) falsosNegativos--;
    else falsosPositivos++;
    if (puntos[i][0] === puntos[i + 1][0]) continue;
    const total = falsosNegativos + falsosPositivos;
    if (!mejor || total < mejor.total || (total === mejor.total && falsosPositivos < mejor.falsosPositivos)) {
      mejor = { corte: (puntos[i][0] + puntos[i + 1][0]) / 2, total, falsosNegativos, falsosPositivos };
    }
  }
  const { total: _total, ...resultado } = mejor;
  return { ...resultado, separables: false, hueco: null };
}
