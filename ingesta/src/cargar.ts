/**
 * Paso 1.5 del roadmap: ingesta del CSV en la coleccion `Publicacion`.
 *
 *   npm run cargar -- --seco     normaliza y escribe el reporte SIN tocar la nube
 *   npm run cargar               ingesta de verdad (gasta 1 embedding por objeto)
 *   npm run cargar -- --lote=25  tamaño de lote (por defecto 50)
 *   npm run cargar -- --archivo=../datos/otro.csv
 *
 * El UUID sale del `codigo` con generateUuid5, asi que reejecutar el script
 * ACTUALIZA en lugar de duplicar: es la unica red de seguridad que tenemos,
 * porque el plan gratuito no incluye backups.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { generateUuid5 } from 'weaviate-client';
import { conectar, explicarError, NOMBRE_COLECCION, RAIZ_REPO } from './cliente.ts';
import { prepararFilas, type Publicacion, type Reporte } from './preparar.ts';
import { MINIMO_PALABRAS_UTILES } from './limpiar.ts';

const argumentos = process.argv.slice(2);
const bandera = (nombre: string) => argumentos.includes(`--${nombre}`);
const valor = (nombre: string) =>
  argumentos.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=');

const SECO = bandera('seco');
const TAMANO_LOTE = Number(valor('lote') ?? 50);
const ARCHIVO_CSV = resolve(RAIZ_REPO, valor('archivo') ?? 'datos/semilla.csv');
const DIR_REPORTES = resolve(RAIZ_REPO, 'ingesta/reportes');

function leerCsv(ruta: string): Record<string, string>[] {
  const contenido = readFileSync(ruta, 'utf8');
  return parse(contenido, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
}

function escribirReporte(reporte: Reporte, publicaciones: Publicacion[]): string {
  mkdirSync(DIR_REPORTES, { recursive: true });

  const lineas: string[] = [];
  const p = (texto = '') => lineas.push(texto);

  p('# Reporte de limpieza e ingesta');
  p();
  p(`Generado: ${new Date().toISOString()}`);
  p(`Archivo de origen: \`${ARCHIVO_CSV.replace(RAIZ_REPO + '/', '')}\``);
  p(`Umbral de descarte: menos de ${MINIMO_PALABRAS_UTILES} palabras utiles tras la limpieza.`);
  p();
  p('## Resumen');
  p();
  p('| Metrica | Valor |');
  p('|---|---|');
  p(`| Filas leidas del CSV | ${reporte.total} |`);
  p(`| Publicaciones listas para ingestar | ${reporte.listas} |`);
  p(`| Publicaciones rechazadas | ${reporte.rechazadas} |`);
  p(`| Avisos (se ingestan, pero con algo incompleto) | ${reporte.avisos.length} |`);
  p(`| Descripciones que traian ruido eliminable | ${reporte.conRuido} de ${reporte.listas} |`);
  p(`| **En ellas**: caracteres eliminados en promedio | ${reporte.promedioCaracteresEliminadosConRuido} |`);
  p(`| **En ellas**: reduccion promedio del texto vectorizado | ${reporte.promedioReduccionPorcentajeConRuido} % |`);
  p(`| Descripciones en mayuscula sostenida (no reduce caracteres) | ${reporte.enMayusculaSostenida} |`);
  p(`| Reduccion promedio sobre TODO el catalogo | ${reporte.promedioReduccionPorcentaje} % |`);
  p(`| Caracteres totales antes / eliminados | ${reporte.caracteresOriginalesTotal} / ${reporte.caracteresEliminadosTotal} |`);
  p();
  p('## Que ruido traia el CSV (incidencia sobre las ' + reporte.total + ' filas)');
  p();
  p('| Tipo de ruido en el texto original | Descripciones | % |');
  p('|---|---|---|');
  const etiquetas: Record<string, string> = {
    emojis: 'Emojis o pictogramas',
    telefono: 'Telefono embebido',
    correo: 'Correo electronico',
    mayusculaSostenida: 'Mayuscula sostenida (> 60 % del texto)',
    muletilla: 'Muletillas de contacto o relleno comercial',
    adornos: 'Adornos y signos repetidos',
  };
  for (const [tipo, cantidad] of Object.entries(reporte.incidencia)) {
    p(`| ${etiquetas[tipo] ?? tipo} | ${cantidad} | ${Math.round((cantidad / reporte.total) * 100)} % |`);
  }
  p();
  p('## Cuantas descripciones activo cada etapa');
  p();
  p('> Las etapas se solapan: `fragmentos` borra de una vez los bloques de contacto');
  p('> completos, con sus emojis y telefonos dentro, asi que las etapas siguientes');
  p('> ven menos trabajo. La incidencia real del ruido es la tabla anterior.');
  p();
  p('| Etapa del pipeline | Descripciones afectadas |');
  p('|---|---|');
  for (const [etapa, cantidad] of Object.entries(reporte.etapas)) {
    p(`| ${etapa} | ${cantidad} |`);
  }
  p();
  p('## Antes y despues (las tres con mayor reduccion)');
  for (const ejemplo of reporte.ejemplos) {
    p();
    p(`### ${ejemplo.codigo} — ${ejemplo.reduccion} % menos texto`);
    p();
    p(`- **Original:** ${ejemplo.antes}`);
    p(`- **Vectorizado:** ${ejemplo.despues}`);
  }
  p();
  p('## Rechazos');
  p();
  if (reporte.rechazos.length === 0) p('Ninguno.');
  else {
    p('| Fila | Codigo | Motivo |');
    p('|---|---|---|');
    for (const r of reporte.rechazos) p(`| ${r.fila} | ${r.codigo} | ${r.motivo} |`);
  }
  p();
  p('## Avisos');
  p();
  if (reporte.avisos.length === 0) p('Ninguno.');
  else {
    p('| Fila | Codigo | Aviso |');
    p('|---|---|---|');
    for (const a of reporte.avisos) p(`| ${a.fila} | ${a.codigo} | ${a.aviso} |`);
  }
  p();
  p('## Distribucion de lo que se ingesta');
  p();
  const contar = (campo: 'categoria' | 'ciudad' | 'estado') => {
    const cuenta = new Map<string, number>();
    for (const pub of publicaciones) cuenta.set(pub[campo], (cuenta.get(pub[campo]) ?? 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  };
  for (const campo of ['categoria', 'ciudad', 'estado'] as const) {
    p(`- **${campo}:** ${contar(campo).map(([k, v]) => `${k} (${v})`).join(', ')}`);
  }
  const precios = publicaciones.map((pub) => pub.precio).sort((a, b) => a - b);
  if (precios.length > 0) {
    const formato = (n: number) => n.toLocaleString('es-CO');
    p(
      `- **precio:** min ${formato(precios[0])}, mediana ${formato(precios[Math.floor(precios.length / 2)])}, max ${formato(precios[precios.length - 1])}`
    );
  }
  p();

  const rutaMd = resolve(DIR_REPORTES, 'limpieza.md');
  writeFileSync(rutaMd, lineas.join('\n'));
  writeFileSync(resolve(DIR_REPORTES, 'limpieza.json'), JSON.stringify(reporte, null, 2));
  return rutaMd;
}

async function ingestar(publicaciones: Publicacion[]) {
  const cliente = await conectar();
  try {
    if (!(await cliente.collections.exists(NOMBRE_COLECCION))) {
      throw new Error(
        `La coleccion "${NOMBRE_COLECCION}" no existe todavia. Crea el esquema primero: npm run esquema`
      );
    }
    const coleccion = cliente.collections.use(NOMBRE_COLECCION);

    let insertados = 0;
    const fallidos: Array<{ codigo: string; mensaje: string }> = [];

    for (let inicio = 0; inicio < publicaciones.length; inicio += TAMANO_LOTE) {
      const lote = publicaciones.slice(inicio, inicio + TAMANO_LOTE);
      const respuesta = await coleccion.data.insertMany(
        // El UUID determinístico es lo que convierte la ingesta en idempotente.
        lote.map((pub) => ({ id: generateUuid5(pub.codigo), properties: pub }))
      );

      const errores = Object.entries(respuesta.errors);
      insertados += lote.length - errores.length;
      for (const [indice, error] of errores) {
        fallidos.push({ codigo: lote[Number(indice)].codigo, mensaje: error.message });
      }
      console.log(
        `  lote ${inicio / TAMANO_LOTE + 1}: ${lote.length - errores.length}/${lote.length} en ${respuesta.elapsedSeconds.toFixed(1)} s`
      );
    }

    console.log(`\nInsertados o actualizados: ${insertados}`);
    console.log(`Fallidos: ${fallidos.length}`);
    for (const fallo of fallidos) console.log(`  ${fallo.codigo}: ${fallo.mensaje}`);

    const total = await coleccion.aggregate.overAll();
    console.log(`\nObjetos en la coleccion ahora: ${total.totalCount}`);
    if (fallidos.length > 0) process.exitCode = 1;
  } finally {
    await cliente.close();
  }
}

async function principal() {
  console.log(`Leyendo ${ARCHIVO_CSV}`);
  const filas = leerCsv(ARCHIVO_CSV);
  const { publicaciones, reporte } = prepararFilas(filas);

  console.log(
    `\nFilas: ${reporte.total} | listas: ${reporte.listas} | rechazadas: ${reporte.rechazadas} | avisos: ${reporte.avisos.length}`
  );
  console.log(
    `Limpieza: ${reporte.conRuido} descripciones con ruido eliminable, ` +
      `-${reporte.promedioCaracteresEliminadosConRuido} caracteres en promedio en ellas ` +
      `(${reporte.promedioReduccionPorcentajeConRuido} % de su texto). ` +
      `${reporte.enMayusculaSostenida} venian en mayuscula sostenida.`
  );
  for (const rechazo of reporte.rechazos) {
    console.log(`  rechazada fila ${rechazo.fila} (${rechazo.codigo}): ${rechazo.motivo}`);
  }
  for (const aviso of reporte.avisos) {
    console.log(`  aviso fila ${aviso.fila} (${aviso.codigo}): ${aviso.aviso}`);
  }

  const rutaReporte = escribirReporte(reporte, publicaciones);
  console.log(`\nReporte escrito en ${rutaReporte}`);

  if (publicaciones.length === 0) {
    console.log('\nNo hay nada que ingestar.');
    return;
  }

  if (SECO) {
    console.log('\n--seco: no se toco la nube y no se gasto cuota de embeddings.');
    console.log('Ejemplo del primer objeto que se enviaria:');
    const primera = publicaciones[0];
    console.log(JSON.stringify({ id: generateUuid5(primera.codigo), properties: primera }, null, 2));
    return;
  }

  console.log(
    `\nIngestando ${publicaciones.length} objetos en lotes de ${TAMANO_LOTE}.` +
      `\nEsto consume ~${publicaciones.length} peticiones de la cuota diaria de embeddings (2.000/dia).`
  );
  await ingestar(publicaciones);
}

principal().catch((error) => {
  console.error(`\nFallo la ingesta:\n${explicarError(error)}`);
  process.exit(1);
});
