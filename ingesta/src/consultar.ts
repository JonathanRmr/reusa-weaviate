/**
 * Paso 1.6 del roadmap: verificar que en la nube hay vectores que funcionan.
 *
 *   npm run consultar                              cuenta objetos y corre las consultas de control
 *   npm run consultar -- "algo para calentar la sala"   una consulta concreta
 *   npm run consultar -- --similares=REU-E001      los mas parecidos a una publicacion (ensayo de F5)
 *
 * Ojo: cada consulta gasta 1 peticion de la cuota diaria de embeddings (2.000/dia).
 */
import type { Collection } from 'weaviate-client';
import { conectar, explicarError, NOMBRE_COLECCION } from './cliente.ts';

type ColeccionPublicacion = Collection<undefined, typeof NOMBRE_COLECCION, undefined>;

const argumentos = process.argv.slice(2);
const valor = (nombre: string) =>
  argumentos.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=');
const libres = argumentos.filter((a) => !a.startsWith('--'));

/** Consultas de control: el vector tiene que ganar en las primeras y perder en la ultima. */
const CONSULTAS_CONTROL = [
  'algo para calentar la sala en invierno',
  'mueble para guardar ropa',
  'para trabajar desde la casa',
  'iPhone 13 Pro Max 256GB',
];

const pesos = (valor: number) => `$${valor.toLocaleString('es-CO')}`;

async function principal() {
  const cliente = await conectar();
  try {
    if (!(await cliente.collections.exists(NOMBRE_COLECCION))) {
      throw new Error(`La coleccion "${NOMBRE_COLECCION}" no existe. Corre: npm run esquema`);
    }
    const coleccion = cliente.collections.use(NOMBRE_COLECCION);

    const total = await coleccion.aggregate.overAll();
    console.log(`Objetos en "${NOMBRE_COLECCION}": ${total.totalCount}`);
    console.log(
      total.totalCount >= 250
        ? 'Criterio de aceptacion de la Fase 1 cumplido (>= 250 objetos).'
        : `Aun faltan ${Math.max(0, 250 - (total.totalCount ?? 0))} objetos para los 250 del criterio de aceptacion.`
    );

    const codigoSimilares = valor('similares');
    if (codigoSimilares) {
      await mostrarSimilares(coleccion, codigoSimilares);
      return;
    }

    const consultas = libres.length > 0 ? libres : CONSULTAS_CONTROL;
    const todasLasDistancias: number[] = [];

    for (const consulta of consultas) {
      console.log(`\n=== nearText: "${consulta}" ===`);
      const respuesta = await coleccion.query.nearText(consulta, {
        limit: 5,
        returnMetadata: ['distance'],
        returnProperties: ['codigo', 'titulo', 'categoria', 'precio', 'ciudad'],
      });

      if (respuesta.objects.length === 0) {
        console.log('  sin resultados');
        continue;
      }
      for (const [posicion, objeto] of respuesta.objects.entries()) {
        const distancia = objeto.metadata?.distance;
        if (typeof distancia === 'number') todasLasDistancias.push(distancia);
        const p = objeto.properties as Record<string, unknown>;
        console.log(
          `  ${posicion + 1}. dist ${distancia?.toFixed(3)}  ${String(p.codigo)}  ${String(p.titulo)}` +
            `  [${String(p.categoria)}, ${pesos(Number(p.precio))}, ${String(p.ciudad)}]`
        );
      }
    }

    if (todasLasDistancias.length > 0) {
      const ordenadas = [...todasLasDistancias].sort((a, b) => a - b);
      console.log(
        `\nRango de distancias observado: ${ordenadas[0].toFixed(3)} a ${ordenadas[ordenadas.length - 1].toFixed(3)}` +
          ` (mediana ${ordenadas[Math.floor(ordenadas.length / 2)].toFixed(3)})`
      );
      console.log(
        'Recordatorio para el informe: con coseno 0 es identico y 2 es opuesto. No es un porcentaje de coincidencia.'
      );
    }
  } finally {
    await cliente.close();
  }
}

/** Ensayo del detector de republicaciones (F5) con la verdad de datos/pares-republicados.csv. */
async function mostrarSimilares(coleccion: ColeccionPublicacion, codigo: string) {
  const base = await coleccion.query.fetchObjects({
    filters: coleccion.filter.byProperty('codigo').equal(codigo.toUpperCase()),
    limit: 1,
  });
  if (base.objects.length === 0) {
    console.log(`\nNo existe ninguna publicacion con codigo ${codigo}.`);
    return;
  }
  const objetoBase = base.objects[0];
  console.log(`\n=== Parecidos a ${codigo}: ${String(objetoBase.properties.titulo)} ===`);

  const respuesta = await coleccion.query.nearObject(objetoBase.uuid, {
    limit: 6,
    returnMetadata: ['distance'],
    returnProperties: ['codigo', 'titulo', 'categoria'],
  });

  for (const objeto of respuesta.objects) {
    if (objeto.uuid === objetoBase.uuid) continue; // el propio objeto siempre sale a distancia 0
    const p = objeto.properties as Record<string, unknown>;
    console.log(`  dist ${objeto.metadata?.distance?.toFixed(3)}  ${String(p.codigo)}  ${String(p.titulo)}`);
  }
  console.log('\nEl umbral de "posible republicacion" lo calibra Alejandro en 3.4 con datos/pares-republicados.csv.');
}

principal().catch((error) => {
  console.error(`\nFallo la consulta:\n${explicarError(error)}`);
  process.exit(1);
});
