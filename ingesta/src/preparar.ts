/**
 * Del CSV crudo a objetos listos para Weaviate (parte de la Fase 1.5).
 *
 * Es una funcion pura: no lee disco ni red. Por eso la ingesta puede correr en
 * seco (`npm run cargar -- --seco`) y producir el reporte de limpieza sin gastar
 * ni una peticion de la cuota diaria de embeddings.
 */
import {
  detectarRuido,
  limpiarDescripcion,
  MINIMO_PALABRAS_UTILES,
  type Etapa,
  type Ruido,
} from './limpiar.ts';
import {
  CATEGORIAS,
  ESTADOS,
  normalizarCategoria,
  normalizarCiudad,
  normalizarCodigo,
  normalizarEstado,
  normalizarFecha,
  normalizarPrecio,
  RE_CODIGO,
} from './normalizar.ts';

export type FilaCsv = Record<string, string>;

export type Publicacion = {
  codigo: string;
  titulo: string;
  descripcionLimpia: string;
  descripcionOriginal: string;
  categoria: string;
  precio: number;
  ciudad: string;
  estado: string;
  fechaPublicacion?: Date;
  imagenUrl?: string;
};

export type Rechazo = { fila: number; codigo: string; motivo: string };
export type Aviso = { fila: number; codigo: string; aviso: string };

export type Reporte = {
  total: number;
  listas: number;
  rechazadas: number;
  /** Promedio de caracteres que la limpieza elimino de las descripciones ingestadas. */
  promedioCaracteresEliminados: number;
  promedioReduccionPorcentaje: number;
  caracteresOriginalesTotal: number;
  caracteresEliminadosTotal: number;
  /**
   * Descripciones que traian ruido eliminable (contacto, correo, emojis, adornos
   * o muletillas). El promedio global se diluye con las que ya venian limpias,
   * asi que para el informe vale mas esta cifra que la global.
   */
  conRuido: number;
  promedioCaracteresEliminadosConRuido: number;
  promedioReduccionPorcentajeConRuido: number;
  /** En mayuscula sostenida. No reduce caracteres, pero cambia la tokenizacion. */
  enMayusculaSostenida: number;
  /**
   * Cuantas descripciones del CSV traian cada tipo de ruido. A diferencia de
   * `etapas`, no depende de que etapa del pipeline lo elimino.
   */
  incidencia: Record<keyof Ruido, number>;
  /** Cuantas descripciones activo cada etapa del pipeline. */
  etapas: Record<Etapa, number>;
  rechazos: Rechazo[];
  avisos: Aviso[];
  /** Las tres descripciones con mayor reduccion: material para la demo. */
  ejemplos: Array<{ codigo: string; antes: string; despues: string; reduccion: number }>;
};

export type Preparacion = {
  publicaciones: Publicacion[];
  reporte: Reporte;
};

const CAMPOS_REQUERIDOS = [
  'codigo',
  'titulo',
  'descripcionOriginal',
  'categoria',
  'precio',
  'ciudad',
  'estado',
] as const;

/** El titulo entra al vector, asi que se normaliza igual, pero nunca se descarta. */
export function limpiarTitulo(titulo: string): string {
  const resultado = limpiarDescripcion(titulo, 0);
  const limpio = resultado.descripcionLimpia.trim();
  return limpio === '' ? String(titulo ?? '').replace(/\s+/g, ' ').trim() : limpio;
}

export function prepararFilas(
  filas: FilaCsv[],
  minimoPalabras: number = MINIMO_PALABRAS_UTILES
): Preparacion {
  const publicaciones: Publicacion[] = [];
  const rechazos: Rechazo[] = [];
  const avisos: Aviso[] = [];
  const etapas: Record<Etapa, number> = {
    fragmentos: 0,
    correos: 0,
    telefonos: 0,
    emojis: 0,
    adornos: 0,
    mayusculas: 0,
    muletillas: 0,
    colas: 0,
    espacios: 0,
  };
  const incidencia: Record<keyof Ruido, number> = {
    emojis: 0,
    telefono: 0,
    correo: 0,
    mayusculaSostenida: 0,
    muletilla: 0,
    adornos: 0,
  };
  const vistos = new Map<string, number>();
  const medidas: Array<{
    codigo: string;
    antes: string;
    despues: string;
    originales: number;
    finales: number;
    conRuido: boolean;
  }> = [];
  // Etapas que de verdad quitan ruido; `espacios`, `colas` y `mayusculas` son cosmeticas.
  const ETAPAS_RUIDO: Etapa[] = ['fragmentos', 'correos', 'telefonos', 'emojis', 'adornos', 'muletillas'];

  filas.forEach((fila, indice) => {
    // +2: la primera fila de datos del CSV es la linea 2 del archivo.
    const numeroFila = indice + 2;
    const codigo = normalizarCodigo(fila.codigo ?? '');
    const rechazar = (motivo: string) => rechazos.push({ fila: numeroFila, codigo: codigo || '(sin codigo)', motivo });
    const avisar = (aviso: string) => avisos.push({ fila: numeroFila, codigo: codigo || '(sin codigo)', aviso });

    const vacios = CAMPOS_REQUERIDOS.filter((campo) => !String(fila[campo] ?? '').trim());
    if (vacios.length > 0) {
      rechazar(`Campos vacios: ${vacios.join(', ')}`);
      return;
    }

    if (!RE_CODIGO.test(codigo)) {
      avisar(`El codigo "${codigo}" no sigue el formato REU-X999`);
    }
    const filaPrevia = vistos.get(codigo);
    if (filaPrevia !== undefined) {
      // Dos filas con el mismo codigo generarian el mismo UUID: la segunda
      // sobreescribiria a la primera en silencio.
      rechazar(`Codigo repetido en el CSV (ya aparece en la fila ${filaPrevia})`);
      return;
    }

    const descripcionOriginal = String(fila.descripcionOriginal).trim();
    const limpieza = limpiarDescripcion(descripcionOriginal, minimoPalabras);
    for (const etapa of limpieza.etapas) etapas[etapa] += 1;
    for (const [tipo, presente] of Object.entries(detectarRuido(descripcionOriginal))) {
      if (presente) incidencia[tipo as keyof Ruido] += 1;
    }

    if (limpieza.descartada) {
      rechazar(limpieza.motivo ?? 'Descripcion sin contenido util');
      return;
    }

    const precio = normalizarPrecio(fila.precio);
    if (precio === null) {
      rechazar(`Precio no interpretable: "${fila.precio}"`);
      return;
    }

    const categoria = normalizarCategoria(fila.categoria);
    if (categoria === null) {
      rechazar(`Categoria "${fila.categoria}" fuera de la lista: ${CATEGORIAS.join(' | ')}`);
      return;
    }

    const estado = normalizarEstado(fila.estado);
    if (estado === null) {
      rechazar(`Estado "${fila.estado}" fuera de la lista: ${ESTADOS.join(' | ')}`);
      return;
    }

    // La fecha solo ordena y filtra por antiguedad: si viene mal, se avisa y se
    // omite la propiedad en lugar de perder la publicacion o inventar un valor.
    const fechaPublicacion = normalizarFecha(fila.fechaPublicacion ?? '');
    if (fechaPublicacion === null) {
      avisar(`Fecha no interpretable: "${fila.fechaPublicacion ?? ''}". Se ingesta sin fecha.`);
    }

    const imagenUrl = String(fila.imagenUrl ?? '').trim();
    if (imagenUrl === '') avisar('Sin imagenUrl: la tarjeta se vera con el marcador de posicion.');

    vistos.set(codigo, numeroFila);
    medidas.push({
      codigo,
      antes: descripcionOriginal,
      despues: limpieza.descripcionLimpia,
      originales: limpieza.caracteresOriginales,
      finales: limpieza.caracteresFinales,
      conRuido: limpieza.etapas.some((etapa) => ETAPAS_RUIDO.includes(etapa)),
    });

    publicaciones.push({
      codigo,
      titulo: limpiarTitulo(fila.titulo),
      descripcionLimpia: limpieza.descripcionLimpia,
      descripcionOriginal,
      categoria,
      precio,
      ciudad: normalizarCiudad(fila.ciudad),
      estado,
      ...(fechaPublicacion ? { fechaPublicacion } : {}),
      ...(imagenUrl ? { imagenUrl } : {}),
    });
  });

  const caracteresOriginalesTotal = medidas.reduce((suma, m) => suma + m.originales, 0);
  const caracteresEliminadosTotal = medidas.reduce((suma, m) => suma + (m.originales - m.finales), 0);

  const sucias = medidas.filter((m) => m.conRuido);
  const sucioOriginal = sucias.reduce((suma, m) => suma + m.originales, 0);
  const sucioEliminado = sucias.reduce((suma, m) => suma + (m.originales - m.finales), 0);

  const ejemplos = [...medidas]
    .sort((a, b) => (b.originales - b.finales) - (a.originales - a.finales))
    .slice(0, 3)
    .map((m) => ({
      codigo: m.codigo,
      antes: m.antes,
      despues: m.despues,
      reduccion: m.originales === 0 ? 0 : Math.round(((m.originales - m.finales) / m.originales) * 100),
    }));

  return {
    publicaciones,
    reporte: {
      total: filas.length,
      listas: publicaciones.length,
      rechazadas: rechazos.length,
      promedioCaracteresEliminados:
        medidas.length === 0 ? 0 : Math.round(caracteresEliminadosTotal / medidas.length),
      promedioReduccionPorcentaje:
        caracteresOriginalesTotal === 0
          ? 0
          : Math.round((caracteresEliminadosTotal / caracteresOriginalesTotal) * 100),
      caracteresOriginalesTotal,
      caracteresEliminadosTotal,
      conRuido: sucias.length,
      promedioCaracteresEliminadosConRuido:
        sucias.length === 0 ? 0 : Math.round(sucioEliminado / sucias.length),
      promedioReduccionPorcentajeConRuido:
        sucioOriginal === 0 ? 0 : Math.round((sucioEliminado / sucioOriginal) * 100),
      enMayusculaSostenida: etapas.mayusculas,
      incidencia,
      etapas,
      rechazos,
      avisos,
      ejemplos,
    },
  };
}
