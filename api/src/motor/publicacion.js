// Forma de una publicación tal como la devuelve la API (docs/contrato-api.md).
// Módulo puro: no conecta a Weaviate, así que se prueba sin red ni credenciales.

export const NOMBRE_COLECCION = 'Publicacion';

/**
 * Los dos únicos campos que entran al vector y en los que busca BM25 (docs/esquema.md §3.1).
 * Se declaran explícitamente en las consultas léxicas para que la comparación de F4
 * mida el método de búsqueda y no qué campos indexó cada lado.
 */
export const CAMPOS_TEXTO = ['titulo', 'descripcionLimpia'];

/** Lo que viaja al frontend. `descripcionLimpia` no: es solo para el vector. */
export const PROPIEDADES_RESULTADO = [
  'codigo',
  'titulo',
  'descripcionOriginal',
  'categoria',
  'precio',
  'ciudad',
  'estado',
  'fechaPublicacion',
  'imagenUrl',
];

/** Tres decimales: es lo que se puede leer en una tarjeta, y más precisión no cambia ninguna decisión. */
export function redondear(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.round(valor * 1000) / 1000 : null;
}

/**
 * De las propiedades de Weaviate al objeto del contrato. Los campos `date` llegan como
 * `Date`; se serializan como instante ISO completo, igual que los stubs de la Fase 2.
 */
export function aPublicacion(propiedades) {
  const fecha = propiedades.fechaPublicacion;
  return {
    codigo: propiedades.codigo,
    titulo: propiedades.titulo,
    descripcionOriginal: propiedades.descripcionOriginal ?? null,
    categoria: propiedades.categoria,
    precio: propiedades.precio,
    ciudad: propiedades.ciudad,
    estado: propiedades.estado,
    fechaPublicacion: fecha instanceof Date ? fecha.toISOString() : (fecha ?? null),
    imagenUrl: propiedades.imagenUrl ?? null,
  };
}

/**
 * Un resultado de /api/buscar. `score` y `distance` no son comparables entre sí
 * (roadmap 3.2): cada modo rellena la métrica que de verdad calcula y deja la otra en null.
 */
export function aResultado(objeto) {
  return {
    ...aPublicacion(objeto.properties),
    score: redondear(objeto.metadata?.score),
    distance: redondear(objeto.metadata?.distance),
  };
}

/** Misma regla que la ingesta (`normalizarCodigo`): la clave natural va en mayúscula y sin espacios. */
export function normalizarCodigo(codigo) {
  return String(codigo ?? '').trim().toUpperCase();
}
