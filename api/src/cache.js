const TTL_MS = 5 * 60 * 1000;

const almacen = new Map();

/** Clave estable sin importar el orden en que llegaron los query params. */
export function clave(prefijo, params) {
  const partes = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${k}=${params[k]}`);
  return `${prefijo}:${partes.join('&')}`;
}

export function obtener(key) {
  const entrada = almacen.get(key);
  if (!entrada) return undefined;
  if (Date.now() > entrada.expira) {
    almacen.delete(key);
    return undefined;
  }
  return entrada.valor;
}

export function guardar(key, valor) {
  almacen.set(key, { valor, expira: Date.now() + TTL_MS });
}
