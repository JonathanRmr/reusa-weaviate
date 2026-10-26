// Cliente HTTP para los endpoints de Reusa definidos en docs/contrato-api.md

/**
 * Consulta el estado de Weaviate y conteo de objetos indexados
 * GET /api/salud
 */
export async function consultarSalud() {
  try {
    const respuesta = await fetch('/api/salud', {
      headers: { Accept: 'application/json' },
    });
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      return { weaviate: false, objetos: 0, error: data.error || 'Error al conectar con Weaviate' };
    }
    return await respuesta.json();
  } catch (error) {
    return { weaviate: false, objetos: 0, error: error.message };
  }
}

/**
 * Ejecuta una búsqueda híbrida, vectorial o léxica con filtros
 * GET /api/buscar
 */
export async function buscarPublicaciones(params) {
  const url = new URL('/api/buscar', window.location.origin);
  
  if (params.q !== undefined && params.q !== null) {
    url.searchParams.set('q', params.q.trim());
  }
  if (params.alpha !== undefined && params.alpha !== null) {
    url.searchParams.set('alpha', String(params.alpha));
  }
  if (params.limit !== undefined && params.limit !== null) {
    url.searchParams.set('limit', String(params.limit));
  }
  if (params.categoria) {
    url.searchParams.set('categoria', params.categoria);
  }
  if (params.ciudad) {
    url.searchParams.set('ciudad', params.ciudad);
  }
  if (params.estado) {
    url.searchParams.set('estado', params.estado);
  }
  if (params.precioMin !== undefined && params.precioMin !== null && params.precioMin !== '') {
    url.searchParams.set('precioMin', String(params.precioMin));
  }
  if (params.precioMax !== undefined && params.precioMax !== null && params.precioMax !== '') {
    url.searchParams.set('precioMax', String(params.precioMax));
  }

  const respuesta = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const err = new Error(datos.error || 'Error en la búsqueda');
    err.codigo = datos.codigo || 'ERROR_DESCONOCIDO';
    err.status = respuesta.status;
    throw err;
  }

  return datos;
}

/**
 * Consulta publicaciones similares y detector de republicaciones
 * GET /api/similares/:codigo?limit=6
 */
export async function consultarSimilares(codigo, limit = 6) {
  const url = new URL(`/api/similares/${encodeURIComponent(codigo)}`, window.location.origin);
  if (limit) {
    url.searchParams.set('limit', String(limit));
  }

  const respuesta = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const err = new Error(datos.error || 'Error al obtener similares');
    err.codigo = datos.codigo || 'NO_ENCONTRADO';
    err.status = respuesta.status;
    throw err;
  }

  return datos;
}
