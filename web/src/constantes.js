// Constantes reales extraídas de datos/semilla.csv y docs/esquema.md

export const CATEGORIAS = [
  { valor: 'bebe', etiqueta: 'Bebé' },
  { valor: 'deportes', etiqueta: 'Deportes' },
  { valor: 'electrodomesticos', etiqueta: 'Electrodomésticos' },
  { valor: 'herramientas', etiqueta: 'Herramientas' },
  { valor: 'hogar', etiqueta: 'Hogar' },
  { valor: 'instrumentos', etiqueta: 'Instrumentos musicales' },
  { valor: 'libros', etiqueta: 'Libros' },
  { valor: 'mascotas', etiqueta: 'Mascotas' },
  { valor: 'muebles', etiqueta: 'Muebles' },
  { valor: 'ropa', etiqueta: 'Ropa y calzado' },
  { valor: 'tecnologia', etiqueta: 'Tecnología' },
  { valor: 'vehiculos', etiqueta: 'Vehículos' },
];

export const CIUDADES = [
  { valor: 'Bogota', etiqueta: 'Bogotá' },
  { valor: 'Bucaramanga', etiqueta: 'Bucaramanga' },
  { valor: 'Cali', etiqueta: 'Cali' },
  { valor: 'Duitama', etiqueta: 'Duitama' },
  { valor: 'Medellin', etiqueta: 'Medellín' },
  { valor: 'Sogamoso', etiqueta: 'Sogamoso' },
  { valor: 'Tunja', etiqueta: 'Tunja' },
  { valor: 'Villavicencio', etiqueta: 'Villavicencio' },
];

export const ESTADOS = [
  { valor: 'nuevo', etiqueta: 'Nuevo' },
  { valor: 'como nuevo', etiqueta: 'Como nuevo' },
  { valor: 'usado', etiqueta: 'Usado' },
  { valor: 'para repuestos', etiqueta: 'Para repuestos' },
];

/**
 * Consultas de demostración de api/evaluacion/consultas.js
 * Utilizadas para pruebas rápidas y la exposición en videobeam.
 */
export const CONSULTAS_DEMO = [
  {
    q: 'algo para calentar la sala',
    tipo: 'semantica',
    explicacion: 'BM25 devuelve alfombras; Vectorial (α=1) trae calefactores por significado.',
    etiqueta: 'Calentar sala',
  },
  {
    q: 'mueble para guardar ropa',
    tipo: 'semantica',
    explicacion: 'BM25 devuelve mueble de TV; Vectorial (α=1) ubica el armario en primer lugar (0.513).',
    etiqueta: 'Guardar ropa',
  },
  {
    q: 'quiero aprender a tocar un instrumento',
    tipo: 'semantica',
    explicacion: 'Precision@5 salta de 0.2 en BM25 a 1.0 en Vectorial (guitarras, pianos, violines).',
    etiqueta: 'Instrumento musical',
  },
  {
    q: 'algo para mantener fria la comida',
    tipo: 'semantica',
    explicacion: 'BM25 devuelve cobijas y sábanas lavadas en "agua fría"; Vectorial saca neveras.',
    etiqueta: 'Enfriar comida',
  },
  {
    q: 'algo para hacer ejercicio en la casa',
    tipo: 'semantica',
    explicacion: 'Encuentra caminadoras y mancuernas sin que el título diga "ejercicio".',
    etiqueta: 'Ejercicio en casa',
  },
  {
    q: 'para trabajar desde la casa',
    tipo: 'semantica',
    explicacion: 'Encuentra sillas ergonómicas y computadores de oficina remota.',
    etiqueta: 'Trabajo remoto',
  },
  {
    q: 'donde pongo a dormir al bebe',
    tipo: 'semantica',
    explicacion: 'Encuentra cunas y corrales infantiles por necesidad familiar.',
    etiqueta: 'Dormir bebé',
  },
  {
    q: 'iPhone 13 Pro Max 256GB',
    tipo: 'exacta',
    explicacion: 'Referencia exacta de tecnología (modelo y capacidad específica).',
    etiqueta: 'iPhone 13 Pro',
  },
  {
    q: 'botas talla 39',
    tipo: 'exacta',
    explicacion: 'Búsqueda por modelo y talla exacta de calzado.',
    etiqueta: 'Botas talla 39',
  },
];

/**
 * Formatea valores numéricos en Pesos Colombianos (COP) con separador de miles.
 * Ejemplo: 1250000 -> "$ 1.250.000"
 */
export function formatearCOP(monto) {
  if (typeof monto !== 'number' || Number.isNaN(monto)) {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(monto);
}

/**
 * Mensajes de error legibles mapeados a los códigos HTTP/JSON del contrato de la API.
 */
export const ERRORES_API = {
  Q_VACIO: 'Ingresa un término de búsqueda en la barra para comenzar.',
  RANGO_PRECIO_INVALIDO: 'El precio mínimo no puede ser mayor que el precio máximo.',
  LIMIT_INVALIDO: 'El límite de resultados solicitado está fuera del rango permitido (1 a 25).',
  WEAVIATE_NO_DISPONIBLE: 'Weaviate Cloud no está disponible en este momento. Verifica la conexión o credenciales.',
  NO_ENCONTRADO: 'No se encontró la publicación especificada.',
};
