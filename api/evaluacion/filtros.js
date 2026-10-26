/**
 * Filtros combinados con la búsqueda (roadmap 3.3).
 *
 *   npm run medir-filtros
 *
 * Parte 1 — integridad (sin embeddings): cada filtro de la API debe devolver exactamente
 * las publicaciones que cumplen la condición, contadas a mano sobre el catálogo.
 *
 * Parte 2 — recall con filtros selectivos (1 embedding por fila de la tabla): ¿pierde
 * resultados el índice vectorial cuando el filtro descarta casi todo? La verdad de
 * referencia es la misma búsqueda SIN filtro pidiendo el catálogo entero: ahí cada
 * objeto trae su distancia exacta a la consulta, se filtra aquí y se toman los primeros.
 * Si la búsqueda filtrada no devuelve esos mismos, el índice perdió recall.
 */
import { obtenerColeccion } from '../src/motor/coleccion.js';
import { construirFiltros, ESTADOS } from '../src/motor/filtros.js';
import { ejecutar, fijo, guardarResultado, leerCatalogo } from './comun.js';
import { recall } from './metricas.js';

const LIMITE = 12;

const CONSULTAS = ['algo para calentar la sala', 'mueble para guardar ropa', 'para trabajar desde la casa'];

/** Del menos al más selectivo. `cumple` replica el filtro en JS para construir la verdad de referencia. */
const CASOS = [
  { nombre: 'sin filtro', params: {}, cumple: () => true },
  { nombre: 'ciudad = Duitama', params: { ciudad: 'Duitama' }, cumple: (p) => p.ciudad === 'Duitama' },
  {
    nombre: 'electrodomesticos y precio ≤ 150.000',
    params: { categoria: 'electrodomesticos', precioMax: 150000 },
    cumple: (p) => p.categoria === 'electrodomesticos' && p.precio <= 150000,
  },
  { nombre: 'precio ≤ 50.000', params: { precioMax: 50000 }, cumple: (p) => p.precio <= 50000 },
  { nombre: 'precio ≥ 2.000.000', params: { precioMin: 2000000 }, cumple: (p) => p.precio >= 2000000 },
  { nombre: 'estado = nuevo', params: { estado: 'nuevo' }, cumple: (p) => p.estado === 'nuevo' },
  { nombre: 'estado = para repuestos', params: { estado: 'para repuestos' }, cumple: (p) => p.estado === 'para repuestos' },
];

async function principal() {
  const coleccion = await obtenerColeccion();
  const catalogo = await leerCatalogo();
  const contar = async (filters) => (await coleccion.aggregate.overAll({ filters })).totalCount;

  // --- Parte 1: integridad ---------------------------------------------------
  const integridad = [];
  for (const estado of ESTADOS) {
    integridad.push({
      filtro: `estado = ${estado}`,
      esperado: catalogo.filter((p) => p.estado === estado).length,
      ingenuo: await contar(coleccion.filter.byProperty('estado').equal(estado)),
      api: await contar(construirFiltros(coleccion.filter, { estado })),
    });
  }
  for (const caso of CASOS.slice(1)) {
    if (caso.params.estado) continue;
    integridad.push({
      filtro: caso.nombre,
      esperado: catalogo.filter(caso.cumple).length,
      ingenuo: null,
      api: await contar(construirFiltros(coleccion.filter, caso.params)),
    });
  }
  // Acentos y mayúsculas como los escribiría un usuario en el selector.
  integridad.push({
    filtro: 'ciudad = "bogotá" (tal como la teclea un usuario)',
    esperado: catalogo.filter((p) => p.ciudad === 'Bogota').length,
    ingenuo: await contar(coleccion.filter.byProperty('ciudad').equal('bogotá')),
    api: await contar(construirFiltros(coleccion.filter, { ciudad: 'bogotá' })),
  });

  console.log('Integridad de filtros (esperado / equal ingenuo / filtro de la API):');
  for (const f of integridad) {
    const ok = f.api === f.esperado ? 'OK' : 'DIFERENTE';
    console.log(`  ${f.filtro.padEnd(48)} ${String(f.esperado).padStart(4)} / ${String(f.ingenuo ?? '—').padStart(4)} / ${String(f.api).padStart(4)}  ${ok}`);
  }

  // --- Parte 2: recall con filtros selectivos --------------------------------
  const medidas = [];
  for (const q of CONSULTAS) {
    const referencia = await coleccion.query.nearText(q, {
      limit: catalogo.length,
      returnMetadata: ['distance'],
      returnProperties: ['codigo', 'categoria', 'precio', 'ciudad', 'estado'],
    });
    const completa = referencia.objects.length === catalogo.length;

    for (const caso of CASOS) {
      const permitidos = referencia.objects.filter((o) => caso.cumple(o.properties));
      const esperados = permitidos.slice(0, LIMITE);
      const filtrada = await coleccion.query.nearText(q, {
        limit: LIMITE,
        filters: construirFiltros(coleccion.filter, caso.params),
        returnMetadata: ['distance'],
        returnProperties: ['codigo'],
      });
      const obtenidos = filtrada.objects.map((o) => o.properties.codigo);
      const codigosEsperados = esperados.map((o) => o.properties.codigo);
      medidas.push({
        q,
        caso: caso.nombre,
        referenciaCompleta: completa,
        cumplen: catalogo.filter(caso.cumple).length,
        esperados: codigosEsperados.length,
        obtenidos: obtenidos.length,
        recall: recall(obtenidos, codigosEsperados),
        mismoOrden: obtenidos.join() === codigosEsperados.join(),
        perdidos: codigosEsperados.filter((c) => !obtenidos.includes(c)),
        distanciaPrimero: filtrada.objects[0]?.metadata?.distance ?? null,
      });
      const m = medidas[medidas.length - 1];
      console.log(
        `recall ${fijo(m.recall, 2)} (${m.obtenidos}/${m.esperados})  primero a ${fijo(m.distanciaPrimero)}  ` +
          `${caso.nombre.padEnd(38)} "${q}"${completa ? '' : '  [referencia incompleta]'}`
      );
    }
  }

  guardarResultado('filtros', { limite: LIMITE, integridad, medidas }, markdown(integridad, medidas));
}

function markdown(integridad, medidas) {
  const l = [];
  l.push('# Filtros combinados con la búsqueda', '');
  l.push('## Integridad', '');
  l.push('| Filtro | Cumplen en el catálogo | `equal` ingenuo | Filtro de la API |', '|---|---|---|---|');
  for (const f of integridad) l.push(`| ${f.filtro} | ${f.esperado} | ${f.ingenuo ?? '—'} | ${f.api} |`);

  l.push('', `## Recall de nearText con filtro (limit ${LIMITE})`, '');
  l.push('| Consulta | Filtro | Cumplen | Esperados | Obtenidos | Recall | Mismo orden | Distancia del primero |');
  l.push('|---|---|---|---|---|---|---|---|');
  for (const m of medidas) {
    l.push(
      `| ${m.q} | ${m.caso} | ${m.cumplen} | ${m.esperados} | ${m.obtenidos} | ${fijo(m.recall, 2)} | ` +
        `${m.mismoOrden ? 'sí' : 'no'} | ${fijo(m.distanciaPrimero)} |`
    );
  }
  const incompletas = medidas.filter((m) => !m.referenciaCompleta);
  if (incompletas.length > 0) {
    l.push('', `⚠️ En ${incompletas.length} filas la búsqueda sin filtro no devolvió el catálogo entero: la referencia es aproximada.`);
  }
  return l.join('\n');
}

ejecutar(principal);
