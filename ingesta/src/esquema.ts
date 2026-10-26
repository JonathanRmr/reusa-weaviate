/**
 * Paso 1.3 del roadmap: definir la coleccion unica `Publicacion`.
 *
 *   npm run esquema              crea la coleccion si no existe
 *   npm run esquema -- --recrear la borra y la vuelve a crear (pierde los datos)
 *   npm run esquema -- --mostrar solo imprime la configuracion que hay en la nube
 *
 * El plan gratuito permite UNA sola coleccion: no hay Vendedor ni Categoria como
 * entidades aparte. Todo va denormalizado en un unico objeto.
 */
import { dataType, vectors } from 'weaviate-client';
import { conectar, explicarError, NOMBRE_COLECCION } from './cliente.ts';

const opciones = new Set(process.argv.slice(2));

async function principal() {
  const cliente = await conectar();
  try {
    if (opciones.has('--mostrar')) {
      await mostrar(cliente);
      return;
    }

    const existe = await cliente.collections.exists(NOMBRE_COLECCION);

    if (existe && !opciones.has('--recrear')) {
      console.log(`La coleccion "${NOMBRE_COLECCION}" ya existe. No se toca.`);
      console.log('Si necesitas rehacerla desde cero: npm run esquema -- --recrear');
      await mostrar(cliente);
      return;
    }

    if (existe) {
      console.log(`Borrando "${NOMBRE_COLECCION}" y todos sus objetos...`);
      await cliente.collections.delete(NOMBRE_COLECCION);
    }

    await cliente.collections.create({
      name: NOMBRE_COLECCION,
      description:
        'Publicacion de un articulo de segunda mano. Al vector solo entran titulo y descripcionLimpia.',

      // Decision 1: el embedding representa QUE ES el articulo, no sus atributos
      // administrativos. Si `precio` o `ciudad` entraran al vector, dos articulos
      // de $500.000 en Tunja se parecerian aunque uno sea una nevera y otro una guitarra.
      vectorizers: (process.env.WEAVIATE_URL?.includes('weaviate.cloud') || process.env.WEAVIATE_URL?.includes('weaviate.network'))
        ? vectors.text2VecWeaviate({
            sourceProperties: ['titulo', 'descripcionLimpia'],
          })
        : vectors.text2VecTransformers({
            sourceProperties: ['titulo', 'descripcionLimpia'],
          }),

      properties: [
        // Lo unico que se vectoriza y lo unico donde busca BM25: asi los dos lados
        // de la busqueda hibrida leen el mismo texto y la comparacion de F4 es justa.
        { name: 'titulo', dataType: dataType.TEXT },
        { name: 'descripcionLimpia', dataType: dataType.TEXT },

        // Se guarda para mostrarsela al usuario, nunca para buscar en ella.
        {
          name: 'descripcionOriginal',
          dataType: dataType.TEXT,
          skipVectorization: true,
          indexSearchable: false,
          indexFilterable: false,
        },

        { name: 'categoria', dataType: dataType.TEXT, skipVectorization: true, indexSearchable: false, indexFilterable: true },
        { name: 'precio', dataType: dataType.NUMBER, indexFilterable: true, indexRangeFilters: true },
        { name: 'ciudad', dataType: dataType.TEXT, skipVectorization: true, indexSearchable: false, indexFilterable: true },
        { name: 'estado', dataType: dataType.TEXT, skipVectorization: true, indexSearchable: false, indexFilterable: true },
        { name: 'fechaPublicacion', dataType: dataType.DATE, indexFilterable: true, indexRangeFilters: true },

        // Clave natural. Tokenizacion `field`: el codigo se compara completo, no partido.
        {
          name: 'codigo',
          dataType: dataType.TEXT,
          skipVectorization: true,
          tokenization: 'field',
          indexSearchable: false,
          indexFilterable: true,
        },
        {
          name: 'imagenUrl',
          dataType: dataType.TEXT,
          skipVectorization: true,
          indexSearchable: false,
          indexFilterable: false,
        },
      ],
    });

    console.log(`Coleccion "${NOMBRE_COLECCION}" creada.`);
    await mostrar(cliente);
  } finally {
    await cliente.close();
  }
}

/** Lee la configuracion REAL que quedo en la nube, no la que creimos enviar. */
async function mostrar(cliente: Awaited<ReturnType<typeof conectar>>) {
  if (!(await cliente.collections.exists(NOMBRE_COLECCION))) {
    console.log(`La coleccion "${NOMBRE_COLECCION}" no existe.`);
    return;
  }
  const config = await cliente.collections.use(NOMBRE_COLECCION).config.get();

  console.log('\n--- Configuracion en la nube ---');
  for (const [nombre, vector] of Object.entries(config.vectorizers ?? {})) {
    const v = vector as {
      vectorizer?: { name?: string; config?: { model?: string } };
      properties?: string[];
      indexType?: string;
      indexConfig?: { distance?: string };
    };
    console.log(`vector "${nombre}": ${v.vectorizer?.name} <- ${JSON.stringify(v.properties ?? [])}`);
    console.log(`  modelo: ${v.vectorizer?.config?.model ?? '(no reportado)'}`);
    console.log(`  indice: ${v.indexType ?? '?'} | distancia: ${v.indexConfig?.distance ?? '?'}`);
  }
  // Lo que de verdad entra al vector es la lista de sourceProperties; la bandera
  // `skip` por propiedad es redundante cuando esa lista esta definida.
  const alVector = new Set(
    Object.values(config.vectorizers ?? {}).flatMap(
      (v) => ((v as { properties?: string[] }).properties ?? [])
    )
  );

  console.log('propiedades:');
  for (const propiedad of config.properties) {
    // La bandera viene anidada bajo el nombre del vectorizador:
    // { 'text2vec-weaviate': { skip: true, ... } }
    const ajustes = Object.values(
      (propiedad.vectorizerConfig ?? {}) as Record<string, { skip?: boolean }>
    )[0];
    const marcas = [
      alVector.has(propiedad.name) ? 'AL VECTOR' : 'sin vectorizar',
      propiedad.indexFilterable ? 'filtrable' : null,
      propiedad.indexSearchable ? 'bm25' : null,
      propiedad.indexRangeFilters ? 'rangos' : null,
      propiedad.tokenization ? `tok:${propiedad.tokenization}` : null,
    ].filter(Boolean);
    console.log(`  ${propiedad.name.padEnd(22)} ${String(propiedad.dataType).padEnd(8)} ${marcas.join(', ')}`);
  }
}

principal().catch((error) => {
  console.error(`\nFallo la creacion del esquema:\n${explicarError(error)}`);
  process.exit(1);
});
