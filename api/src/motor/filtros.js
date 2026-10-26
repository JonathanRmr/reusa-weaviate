import { Filters } from 'weaviate-client';

// Filtros de /api/buscar (roadmap 3.3). Módulo puro: recibe la fábrica de filtros de la
// colección (`coleccion.filter`) en lugar de importarla, para poder probarlo sin red.

/** Lista cerrada de docs/esquema.md §3.5. */
export const ESTADOS = ['nuevo', 'como nuevo', 'usado', 'para repuestos'];

function sinAcentos(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** "Tecnología" → "tecnologia". Los valores de filtro se guardaron sin acentos y en minúscula. */
export function normalizarValor(valor) {
  return sinAcentos(String(valor)).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "bogotá" → "Bogota": misma forma canónica que `normalizarCiudad` de la ingesta. */
export function normalizarCiudad(valor) {
  return normalizarValor(valor).replace(/(^|[\s-])(\p{Ll})/gu, (_, prefijo, letra) => prefijo + letra.toUpperCase());
}

/**
 * `estado` se creó con la tokenización por defecto (`word`), y con ella `equal` no
 * compara el campo completo sino sus palabras: `equal('nuevo')` también trae los
 * "como nuevo". Para que el filtro sea exacto se excluye, de cada valor de la lista
 * cerrada que contiene todas las palabras del buscado, una palabra que el buscado no
 * tiene: nuevo ⇒ equal('nuevo') AND notEqual('como').
 *
 * Se usa `notEqual` sobre una sola palabra y no `Filters.not(equal('como nuevo'))`
 * porque con una palabra no hay ambigüedad sobre cómo se combinan los tokens, y
 * porque funciona igual en el Weaviate autoalojado del perfil `local`.
 */
export function condicionesExactas(filtro, propiedad, valor, valoresPosibles) {
  const condiciones = [filtro.byProperty(propiedad).equal(valor)];
  const palabras = valor.split(' ');
  for (const otro of valoresPosibles) {
    const palabrasOtro = otro.split(' ');
    if (otro === valor || !palabras.every((p) => palabrasOtro.includes(p))) continue;
    const distintiva = palabrasOtro.find((p) => !palabras.includes(p));
    condiciones.push(filtro.byProperty(propiedad).notEqual(distintiva));
  }
  return condiciones;
}

/**
 * Devuelve el filtro combinado para Weaviate, o `undefined` si la búsqueda no lleva
 * ninguno. `categoria` y `ciudad` son de una sola palabra en todo el catálogo, así que
 * `equal` ya es exacto para ellas.
 */
export function construirFiltros(filtro, { categoria, ciudad, estado, precioMin, precioMax } = {}) {
  const condiciones = [];

  if (categoria) condiciones.push(filtro.byProperty('categoria').equal(normalizarValor(categoria)));
  if (ciudad) condiciones.push(filtro.byProperty('ciudad').equal(normalizarCiudad(ciudad)));
  if (estado) condiciones.push(...condicionesExactas(filtro, 'estado', normalizarValor(estado), ESTADOS));
  if (precioMin !== undefined) condiciones.push(filtro.byProperty('precio').greaterOrEqual(precioMin));
  if (precioMax !== undefined) condiciones.push(filtro.byProperty('precio').lessOrEqual(precioMax));

  if (condiciones.length === 0) return undefined;
  return condiciones.length === 1 ? condiciones[0] : Filters.and(...condiciones);
}
