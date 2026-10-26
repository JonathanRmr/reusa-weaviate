/**
 * Calibración del detector de republicaciones (F5, roadmap 3.4).
 *
 *   npm run calibrar
 *
 * No gasta embeddings: lee los vectores ya guardados y usa nearObject.
 *
 * 1. Distancia de los 10 pares republicados y los 10 de control de datos/pares-republicados.csv,
 *    y el puesto en que /api/similares pone a cada republicación.
 * 2. Barrido de TODOS los pares del catálogo (~37.000). Los controles del CSV son artículos
 *    distintos de la misma categoría (lavadora contra estufa); el vecino que de verdad pone a
 *    prueba el umbral es el artículo del mismo tipo, y ese solo aparece mirando el catálogo entero.
 * 3. Tres reglas medidas con la misma vara:
 *      A1. solo distancia, corte elegido con los 20 pares de referencia (lo que pedía el roadmap)
 *      A2. solo distancia, corte elegido con todo el catálogo como negativos
 *      B.  distancia + misma ciudad + precio parecido (la vigente en src/motor/umbral.js)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { obtenerColeccion } from '../src/motor/coleccion.js';
import { esPosibleDuplicado, proporcionPrecio, TOLERANCIA_PRECIO, UMBRAL_DISTANCIA } from '../src/motor/umbral.js';
import { ejecutar, fijo, guardarResultado, leerCatalogo, RAIZ_REPO } from './comun.js';
import { distanciaCoseno, elegirCorte, percentil } from './metricas.js';

const CORTES = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45];
const TOLERANCIAS = [0.7, 0.8, 0.9];
/** Pares distintos por debajo de esta distancia se listan para revisarlos a mano. */
const REVISAR_HASTA = 0.32;

function leerPares() {
  const [, ...lineas] = readFileSync(resolve(RAIZ_REPO, 'datos/pares-republicados.csv'), 'utf8').trim().split(/\r?\n/);
  return lineas.map((linea) => {
    const [codigoA, codigoB, relacion, ...nota] = linea.split(',');
    return { codigoA, codigoB, relacion, nota: nota.join(',') };
  });
}

const clavePar = (a, b) => [a, b].sort().join('|');
const cumpleAtributos = (par, tolerancia = TOLERANCIA_PRECIO) =>
  par.a.ciudad === par.b.ciudad && proporcionPrecio(par.a.precio, par.b.precio) >= tolerancia;

/** Lo que una regla le haría al catálogo. `marca(par)` dice si F5 pondría la insignia. */
function medirRegla(todos, marca) {
  const marcados = todos.filter(marca);
  const falsos = marcados.filter((p) => !p.republicacion);
  return {
    republicacionesDetectadas: marcados.filter((p) => p.republicacion).length,
    controlesMarcados: marcados.filter((p) => p.control).length,
    paresFalsos: falsos.length,
    publicacionesConInsigniaFalsa: new Set(falsos.flatMap((p) => [p.a.codigo, p.b.codigo])).size,
  };
}

async function principal() {
  const catalogo = await leerCatalogo({ conVectores: true });
  const porCodigo = new Map(catalogo.map((p) => [p.codigo, p]));
  const coleccion = await obtenerColeccion();
  const referencia = leerPares();

  // --- 1. Pares de referencia -------------------------------------------------
  const pares = [];
  for (const par of referencia) {
    const a = porCodigo.get(par.codigoA);
    const b = porCodigo.get(par.codigoB);
    if (!a || !b) throw new Error(`El par ${par.codigoA}–${par.codigoB} no está completo en la colección.`);

    // Lo que ve F5 de verdad: ¿nearObject encuentra a B desde A, y en qué puesto?
    const vecinos = await coleccion.query.nearObject(a.uuid, {
      limit: 11,
      returnMetadata: ['distance'],
      returnProperties: ['codigo'],
    });
    const otros = vecinos.objects.filter((o) => o.uuid !== a.uuid);
    const puesto = otros.findIndex((o) => o.properties.codigo === b.codigo);

    pares.push({
      ...par,
      tituloA: a.titulo,
      tituloB: b.titulo,
      mismaCiudad: a.ciudad === b.ciudad,
      proporcionPrecio: proporcionPrecio(a.precio, b.precio),
      distancia: distanciaCoseno(a.vector, b.vector),
      distanciaServidor: puesto === -1 ? null : otros[puesto].metadata.distance,
      puestoEnSimilares: puesto === -1 ? null : puesto + 1,
    });
  }
  const conServidor = pares.filter((p) => p.distanciaServidor !== null);
  const desfase = conServidor.reduce((m, p) => Math.max(m, Math.abs(p.distancia - p.distanciaServidor)), 0);

  // --- 2. Todos los pares del catálogo -----------------------------------------
  const republicaciones = new Set(referencia.filter((p) => p.relacion === 'republicacion').map((p) => clavePar(p.codigoA, p.codigoB)));
  const controles = new Set(referencia.filter((p) => p.relacion === 'distinto').map((p) => clavePar(p.codigoA, p.codigoB)));
  const todos = [];
  for (let i = 0; i < catalogo.length; i++) {
    for (let j = i + 1; j < catalogo.length; j++) {
      const a = catalogo[i];
      const b = catalogo[j];
      const clave = clavePar(a.codigo, b.codigo);
      todos.push({
        a,
        b,
        distancia: distanciaCoseno(a.vector, b.vector),
        republicacion: republicaciones.has(clave),
        control: controles.has(clave),
      });
    }
  }
  const positivos = todos.filter((p) => p.republicacion);
  const distintos = todos.filter((p) => !p.republicacion);
  const dist = (lista) => lista.map((p) => p.distancia);

  // --- 3. Las tres reglas ------------------------------------------------------
  const corteA1 = elegirCorte(dist(positivos), dist(distintos.filter((p) => p.control)));
  const corteA2 = elegirCorte(dist(positivos), dist(distintos));
  const corteB = elegirCorte(dist(positivos.filter((p) => cumpleAtributos(p))), dist(distintos.filter((p) => cumpleAtributos(p))));
  const reglas = [
    { nombre: 'A1 · solo distancia, corte de los 20 pares de referencia', corte: corteA1, conAtributos: false },
    { nombre: 'A2 · solo distancia, corte con todo el catálogo', corte: corteA2, conAtributos: false },
    { nombre: 'B · distancia + misma ciudad + precio a ±20 % (calibrada)', corte: corteB, conAtributos: true },
  ].map((r) => ({
    ...r,
    ...medirRegla(todos, (p) => p.distancia < r.corte.corte && (!r.conAtributos || cumpleAtributos(p))),
  }));
  // La regla tal como está escrita en producción, con su umbral redondeado.
  const vigente = {
    umbral: UMBRAL_DISTANCIA,
    tolerancia: TOLERANCIA_PRECIO,
    ...medirRegla(todos, (p) => esPosibleDuplicado(p.distancia, p.a, p.b)),
  };

  const sensibilidad = CORTES.map((corte) => ({
    corte,
    soloDistancia: medirRegla(todos, (p) => p.distancia < corte),
    ...Object.fromEntries(
      TOLERANCIAS.map((t) => [`tolerancia${t}`, medirRegla(todos, (p) => p.distancia < corte && cumpleAtributos(p, t))])
    ),
  }));

  const paraRevisar = distintos
    .filter((p) => p.distancia < REVISAR_HASTA)
    .sort((x, y) => x.distancia - y.distancia)
    .map((p) => ({
      distancia: p.distancia,
      codigoA: p.a.codigo,
      tituloA: p.a.titulo,
      ciudadA: p.a.ciudad,
      precioA: p.a.precio,
      codigoB: p.b.codigo,
      tituloB: p.b.titulo,
      ciudadB: p.b.ciudad,
      precioB: p.b.precio,
      marcadoPorLaReglaVigente: esPosibleDuplicado(p.distancia, p.a, p.b),
    }));

  const catalogoResumen = {
    publicaciones: catalogo.length,
    pares: todos.length,
    minimoDistintos: Math.min(...dist(distintos)),
    p1: percentil(dist(distintos), 1),
    p5: percentil(dist(distintos), 5),
    mediana: percentil(dist(distintos), 50),
  };

  console.log('Pares de referencia (distancia, puesto en /api/similares, misma ciudad, precio):');
  for (const p of pares) {
    console.log(
      `  ${p.relacion.padEnd(13)} ${fijo(p.distancia)}  puesto ${String(p.puestoEnSimilares ?? '>10').padEnd(3)} ` +
        `${p.mismaCiudad ? 'misma ciudad ' : 'otra ciudad  '} ${fijo(p.proporcionPrecio, 2)}  ${p.codigoA} ↔ ${p.codigoB}`
    );
  }
  console.log(`\nDesfase máximo entre la distancia local y la del servidor: ${desfase.toExponential(2)}`);
  console.log(`Par distinto más cercano de todo el catálogo: ${fijo(catalogoResumen.minimoDistintos)}\n`);
  for (const r of reglas) {
    console.log(
      `${r.nombre}\n  corte ${fijo(r.corte.corte)}  detecta ${r.republicacionesDetectadas}/10  ` +
        `pares falsos ${r.paresFalsos}  publicaciones con insignia falsa ${r.publicacionesConInsigniaFalsa}`
    );
  }
  console.log(
    `\nVigente (umbral ${UMBRAL_DISTANCIA}, tolerancia ${TOLERANCIA_PRECIO}): detecta ${vigente.republicacionesDetectadas}/10, ` +
      `pares falsos ${vigente.paresFalsos}`
  );

  guardarResultado(
    'umbral',
    { desfase, pares, reglas, vigente, sensibilidad, catalogo: catalogoResumen, paraRevisar },
    markdown({ pares, desfase, reglas, vigente, sensibilidad, catalogoResumen, paraRevisar })
  );
}

function markdown({ pares, desfase, reglas, vigente, sensibilidad, catalogoResumen, paraRevisar }) {
  const pesos = (n) => `$${n.toLocaleString('es-CO')}`;
  const l = [];
  l.push('# Calibración del detector de republicaciones', '');
  l.push('## Pares de referencia', '');
  l.push('| Relación | Distancia | Puesto en similares | Misma ciudad | Precio menor / mayor | A | B |');
  l.push('|---|---|---|---|---|---|---|');
  for (const p of [...pares].sort((x, y) => x.distancia - y.distancia)) {
    l.push(
      `| ${p.relacion} | ${fijo(p.distancia)} | ${p.puestoEnSimilares ?? '> 10'} | ${p.mismaCiudad ? 'sí' : 'no'} | ` +
        `${fijo(p.proporcionPrecio, 2)} | \`${p.codigoA}\` ${p.tituloA} | \`${p.codigoB}\` ${p.tituloB} |`
    );
  }
  l.push('', `Desfase máximo entre la distancia calculada aquí y la que devuelve Weaviate: ${desfase.toExponential(2)}.`);

  l.push('', '## Las tres reglas', '');
  l.push('| Regla | Corte | Republicaciones detectadas | Controles marcados | Pares distintos marcados | Publicaciones con insignia falsa |');
  l.push('|---|---|---|---|---|---|');
  for (const r of reglas) {
    const detalle = r.corte.separables
      ? ` (hueco ${fijo(r.corte.hueco[0])}–${fijo(r.corte.hueco[1])})`
      : ` (solapan: ${r.corte.falsosNegativos} FN, ${r.corte.falsosPositivos} FP)`;
    l.push(
      `| ${r.nombre} | ${fijo(r.corte.corte)}${detalle} | ${r.republicacionesDetectadas}/10 | ${r.controlesMarcados}/10 | ` +
        `${r.paresFalsos} | ${r.publicacionesConInsigniaFalsa} |`
    );
  }
  l.push(
    `| **Vigente** en \`src/motor/umbral.js\` (distancia < ${vigente.umbral}, tolerancia ${vigente.tolerancia}) | ${vigente.umbral} | ` +
      `${vigente.republicacionesDetectadas}/10 | ${vigente.controlesMarcados}/10 | ${vigente.paresFalsos} | ${vigente.publicacionesConInsigniaFalsa} |`
  );

  l.push('', '## Sensibilidad', '', 'Republicaciones detectadas / pares distintos marcados.', '');
  l.push(`| Corte | Solo distancia | ${TOLERANCIAS.map((t) => `Misma ciudad + precio ≥ ${t * 100} %`).join(' | ')} |`);
  l.push(`|---|---|${TOLERANCIAS.map(() => '---').join('|')}|`);
  for (const s of sensibilidad) {
    const celda = (m) => `${m.republicacionesDetectadas}/10 · ${m.paresFalsos}`;
    l.push(`| ${fijo(s.corte, 2)} | ${celda(s.soloDistancia)} | ${TOLERANCIAS.map((t) => celda(s[`tolerancia${t}`])).join(' | ')} |`);
  }

  l.push('', '## Todo el catálogo', '');
  l.push(`${catalogoResumen.publicaciones} publicaciones, ${catalogoResumen.pares} pares.`, '');
  l.push('| Pares distintos | Distancia |', '|---|---|');
  l.push(`| mínimo | ${fijo(catalogoResumen.minimoDistintos)} |`);
  l.push(`| percentil 1 | ${fijo(catalogoResumen.p1)} |`);
  l.push(`| percentil 5 | ${fijo(catalogoResumen.p5)} |`);
  l.push(`| mediana | ${fijo(catalogoResumen.mediana)} |`);

  l.push('', `## Pares distintos por debajo de ${REVISAR_HASTA} (revisados a mano)`, '');
  l.push('| Distancia | A | B | ¿Insignia con la regla vigente? |', '|---|---|---|---|');
  for (const p of paraRevisar) {
    l.push(
      `| ${fijo(p.distancia)} | \`${p.codigoA}\` ${p.tituloA} · ${p.ciudadA} · ${pesos(p.precioA)} | ` +
        `\`${p.codigoB}\` ${p.tituloB} · ${p.ciudadB} · ${pesos(p.precioB)} | ${p.marcadoPorLaReglaVigente ? '**sí**' : 'no'} |`
    );
  }
  return l.join('\n');
}

ejecutar(principal);
