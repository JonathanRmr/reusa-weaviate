/**
 * Normalizacion de los campos no textuales (Fase 1.5 del roadmap).
 *
 * El CSV lo escriben cuatro personas a mano, asi que llega con "$ 450.000",
 * "280,000", "80 mil", "12/09/2025" y "2025-09-08" mezclados. Todo se canoniza
 * aqui y no en el frontend: si `precio` entrara como texto, los filtros por rango
 * no funcionarian y el orden seria alfabetico ("1.000.000" antes que "90.000").
 */

export const ESTADOS = ['nuevo', 'como nuevo', 'usado', 'para repuestos'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Lista cerrada: evita que "tecnologia" y "tecnología" convivan como dos filtros. */
export const CATEGORIAS = [
  'electrodomesticos',
  'muebles',
  'tecnologia',
  'hogar',
  'deportes',
  'bebe',
  'herramientas',
  'instrumentos',
  'ropa',
  'vehiculos',
  'mascotas',
  'libros',
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/** Tope de cordura: por encima de esto asumimos un error de tipeo, no un precio. */
const PRECIO_MAXIMO = 100_000_000;

export function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// --- Precio -----------------------------------------------------------------

/**
 * "$ 450.000" | "280,000" | "780000" | "80 mil" | "2.5 millones" -> entero en pesos.
 * Devuelve null si el valor no es interpretable; el llamador decide si descarta.
 */
export function normalizarPrecio(valor: string): number | null {
  const texto = sinAcentos(String(valor ?? '')).toLowerCase().trim();
  if (texto === '') return null;

  let multiplicador = 1;
  if (/\bmillon(?:es)?\b|\bmill\b/.test(texto)) multiplicador = 1_000_000;
  else if (/\bmil\b|\bk\b/.test(texto)) multiplicador = 1_000;

  const cuerpo = texto.replace(/\b(?:millon(?:es)?|mill|mil|k|cop|pesos?)\b/g, ' ');

  let numero: number;
  if (multiplicador > 1) {
    // Con multiplicador el separador puede ser decimal: "2.5 millones".
    const coincidencia = cuerpo.match(/\d+(?:[.,]\d{1,2})?(?!\d)/);
    if (!coincidencia) return null;
    numero = Number(coincidencia[0].replace(',', '.'));
  } else {
    // Sin multiplicador, puntos, comas y apostrofes son separadores de miles.
    const digitos = cuerpo.replace(/\D/g, '');
    if (digitos === '') return null;
    numero = Number(digitos);
  }

  const precio = Math.round(numero * multiplicador);
  if (!Number.isFinite(precio) || precio < 0 || precio > PRECIO_MAXIMO) return null;
  return precio;
}

// --- Fecha ------------------------------------------------------------------

/**
 * Acepta yyyy-mm-dd, yyyy/mm/dd, dd/mm/yyyy y dd-mm-yyyy. Devuelve un Date en UTC
 * a medianoche, que es lo que el cliente serializa como RFC3339 para un campo `date`.
 */
export function normalizarFecha(valor: string): Date | null {
  const texto = String(valor ?? '').trim();
  if (texto === '') return null;

  let anio: number, mes: number, dia: number;

  const iso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const local = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (iso) [, anio, mes, dia] = iso.map(Number) as [number, number, number, number];
  else if (local) {
    const [, d, m, a] = local.map(Number) as [number, number, number, number];
    anio = a;
    mes = m;
    dia = d;
  } else return null;

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Rechaza fechas que el calendario corrigio solo (31 de febrero, por ejemplo).
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return fecha;
}

// --- Estado y categoria -----------------------------------------------------

const SINONIMOS_ESTADO: Array<[RegExp, Estado]> = [
  [/^(?:nuevo|sin\s+uso|sellado|nuevo\s+en\s+caja)$/, 'nuevo'],
  [/^(?:como\s+nuevo|casi\s+nuevo|excelente(?:\s+estado)?|semi\s*nuevo)$/, 'como nuevo'],
  [/^(?:usado|de\s+segunda|buen\s+estado|normal)$/, 'usado'],
  [/^(?:para\s+repuestos|repuestos?|dañado|danado|no\s+funciona|para\s+partes)$/, 'para repuestos'],
];

export function normalizarEstado(valor: string): Estado | null {
  const texto = sinAcentos(String(valor ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (texto === '') return null;
  for (const [patron, estado] of SINONIMOS_ESTADO) {
    if (patron.test(texto)) return estado;
  }
  return null;
}

export function normalizarCategoria(valor: string): Categoria | null {
  const texto = sinAcentos(String(valor ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const encontrada = CATEGORIAS.find((categoria) => categoria === texto);
  return encontrada ?? null;
}

/** Title Case y sin acentos: la ciudad es clave de filtrado exacto, no texto libre. */
export function normalizarCiudad(valor: string): string {
  return sinAcentos(String(valor ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s-])(\p{Ll})/gu, (_, prefijo: string, letra: string) => prefijo + letra.toUpperCase());
}

/** Clave natural del objeto: de ella sale el UUID determinístico. */
export function normalizarCodigo(valor: string): string {
  return String(valor ?? '').trim().toUpperCase();
}

export const RE_CODIGO = /^REU-[A-Z]?\d{3,}$/;
