// Consultas de demostración y su relevancia juzgada a mano (roadmap 3.5).
//
// Los conjuntos `relevantes` se fijaron leyendo las 272 publicaciones ingestadas ANTES
// de correr ninguna búsqueda, con el criterio escrito al lado de cada consulta. Así el
// juicio no se acomoda a lo que devuelva un alpha en particular. Toda publicación que no
// está en la lista cuenta como no relevante: el catálogo se juzgó completo, no solo lo
// que salió en el top 5.
//
// grupo 'semantica': el comprador describe una necesidad y no el nombre del producto.
// grupo 'exacta':    el comprador escribe un modelo o una talla y quiere eso y nada más.

export const CONSULTAS = [
  {
    q: 'algo para calentar la sala',
    grupo: 'semantica',
    criterio: 'Aparato cuya función es calentar un espacio de la casa.',
    relevantes: ['REU-E001', 'REU-E061', 'REU-A036'],
    descartesDiscutibles:
      'Pistola de calor (herramienta para despegar vinilos), calentadores de agua, cobija térmica (calienta a la persona, no la sala), alfombra.',
  },
  {
    q: 'mueble para guardar ropa',
    grupo: 'semantica',
    criterio: 'Mueble cuya función declarada incluye guardar o colgar ropa.',
    relevantes: ['REU-E009', 'REU-E064', 'REU-D010', 'REU-A045', 'REU-D009'],
    descartesDiscutibles:
      'Zapatero y organizador de zapatos (calzado, no ropa), ganchos sueltos (no son un mueble), tendedero (es para secar), puff que guarda cobijas, cama nido con almacenamiento genérico.',
  },
  {
    q: 'para trabajar desde la casa',
    grupo: 'semantica',
    criterio:
      'Equipo o mobiliario de oficina remota: computador, escritorio, silla de trabajo, periféricos de entrada o salida, conectividad, respaldo eléctrico o impresión.',
    relevantes: [
      'REU-E014', 'REU-D063', 'REU-E010', 'REU-A044', 'REU-D008', 'REU-J044',
      'REU-E015', 'REU-E065', 'REU-J014', 'REU-D012', 'REU-A011', 'REU-J015',
      'REU-E017', 'REU-J048', 'REU-A047', 'REU-A012', 'REU-A049', 'REU-E019',
      'REU-J017', 'REU-A027', 'REU-D013', 'REU-J018', 'REU-A014', 'REU-E018',
      'REU-J047',
    ],
    descartesDiscutibles:
      'Almacenamiento (disco externo, memoria USB), lámpara de lectura, proyector, barra de sonido, interfaz de audio y controlador MIDI (son para música).',
  },
  {
    q: 'algo para hacer ejercicio en la casa',
    grupo: 'semantica',
    criterio: 'Equipo de entrenamiento físico que se usa dentro de la vivienda.',
    relevantes: ['REU-E022', 'REU-A018', 'REU-J021', 'REU-E023', 'REU-D020', 'REU-A020', 'REU-J068'],
    descartesDiscutibles:
      'Guantes de boxeo (necesitan costal o compañero), mesa de ping pong (es un juego), bicicletas, patines y kayak (son para exteriores).',
  },
  {
    q: 'donde pongo a dormir al bebe',
    grupo: 'semantica',
    criterio: 'Mueble o equipo en el que el bebé duerme.',
    relevantes: ['REU-J012', 'REU-A017', 'REU-E025'],
    descartesDiscutibles: 'Coches (son para pasear aunque reclinen), carpa de juegos, cama nido (es para niños mayores).',
  },
  {
    q: 'algo para refrescar la habitacion cuando hace calor',
    grupo: 'semantica',
    criterio: 'Aparato que enfría o ventila un espacio.',
    relevantes: ['REU-E007', 'REU-A005', 'REU-E056', 'REU-A004'],
    descartesDiscutibles: 'Deshumidificador y humidificador (no bajan la temperatura), neveras (enfrían comida, no el cuarto).',
  },
  {
    q: 'quiero aprender a tocar un instrumento',
    grupo: 'semantica',
    criterio: 'Instrumento musical que se toca por sí solo, sin accesorios aparte.',
    relevantes: [
      'REU-E030', 'REU-E069', 'REU-E031', 'REU-J027', 'REU-J028', 'REU-J056', 'REU-A025',
      'REU-A026', 'REU-A059', 'REU-D024', 'REU-D025', 'REU-D026', 'REU-D053',
    ],
    descartesDiscutibles:
      'Amplificadores, interfaz de audio y micrófono (son accesorios), controlador MIDI (necesita computador y software para sonar).',
  },
  {
    q: 'algo para mantener fria la comida',
    grupo: 'semantica',
    criterio: 'Aparato de refrigeración de alimentos.',
    relevantes: ['REU-E002', 'REU-E062', 'REU-J005', 'REU-D068', 'REU-D036'],
    descartesDiscutibles: 'Aire acondicionado (enfría el cuarto), dispensador de agua fría (no guarda comida).',
  },
  {
    q: 'iPhone 13 Pro Max 256GB',
    grupo: 'exacta',
    criterio: 'Exactamente ese modelo de celular.',
    relevantes: ['REU-E016', 'REU-E066'],
    descartesDiscutibles: 'Otros celulares, portátiles con disco de 256GB.',
  },
  {
    q: 'botas talla 39',
    grupo: 'exacta',
    criterio: 'Botas en talla 39; en un clasificado otra talla no le sirve al comprador.',
    relevantes: ['REU-J057'],
    descartesDiscutibles: 'Botas de seguridad talla 42, tenis talla 40, patines talla 38.',
  },
];

/** Los puntos del deslizador que se miden: los tres del roadmap más el default actual y sus vecinos. */
export const ALPHAS = [0, 0.25, 0.5, 0.65, 0.75, 1];

/** Lo que muestra la primera fila de la interfaz y lo que mide Precision@5. */
export const K = 5;
