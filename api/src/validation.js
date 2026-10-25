export class ErrorValidacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
    this.status = 400;
  }
}

function aEnteroOIndefinido(valor) {
  if (valor === undefined) return undefined;
  const n = Number(valor);
  return Number.isInteger(n) ? n : NaN;
}

export function validarBusqueda(query) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (!q) {
    throw new ErrorValidacion('Q_VACIO', 'El parámetro "q" es obligatorio y no puede estar vacío.');
  }

  let alpha = query.alpha === undefined ? 0.65 : Number(query.alpha);
  if (Number.isNaN(alpha)) alpha = 0.65;
  alpha = Math.min(1, Math.max(0, alpha)); // clamp, según contrato: nunca error

  let limit = query.limit === undefined ? 12 : aEnteroOIndefinido(query.limit);
  if (Number.isNaN(limit) || limit < 1 || limit > 25) {
    throw new ErrorValidacion('LIMIT_INVALIDO', 'El parámetro "limit" debe ser un entero entre 1 y 25.');
  }

  const precioMin = aEnteroOIndefinido(query.precioMin);
  const precioMax = aEnteroOIndefinido(query.precioMax);
  if (precioMin !== undefined && (Number.isNaN(precioMin) || precioMin < 0)) {
    throw new ErrorValidacion('RANGO_PRECIO_INVALIDO', 'precioMin debe ser un entero ≥ 0.');
  }
  if (precioMax !== undefined && (Number.isNaN(precioMax) || precioMax < 0)) {
    throw new ErrorValidacion('RANGO_PRECIO_INVALIDO', 'precioMax debe ser un entero ≥ 0.');
  }
  if (precioMin !== undefined && precioMax !== undefined && precioMin > precioMax) {
    throw new ErrorValidacion('RANGO_PRECIO_INVALIDO', 'precioMin no puede ser mayor que precioMax.');
  }

  // categoria y estado no se validan contra un set cerrado aquí: ese set lo define
  // /docs/esquema.md (Fase 1, Edwar). Un valor que no exista simplemente no matchea
  // ninguna publicación — no es un error de la petición.
  return {
    q,
    alpha,
    limit,
    precioMin,
    precioMax,
    categoria: query.categoria || undefined,
    ciudad: query.ciudad || undefined,
    estado: query.estado || undefined,
  };
}

export function validarLimiteSimilares(query) {
  let limit = query.limit === undefined ? 5 : aEnteroOIndefinido(query.limit);
  if (Number.isNaN(limit) || limit < 1 || limit > 25) {
    throw new ErrorValidacion('LIMIT_INVALIDO', 'El parámetro "limit" debe ser un entero entre 1 y 25.');
  }
  return limit;
}
