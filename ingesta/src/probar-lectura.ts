/**
 * Comprueba que la clave de SOLO LECTURA es realmente inofensiva antes de
 * publicarla en el docker-compose.yml (roadmap 5.1).
 *
 *   CLAVE_LECTURA=xxxx npm run probar-lectura
 *
 * Deliberadamente NO intenta borrar la coleccion `Publicacion`: si el permiso
 * estuviera mal puesto, la prueba destruiria el catalogo entero. Para verificar
 * que no puede tocar el esquema intenta CREAR una coleccion aparte, que es
 * igual de concluyente y no pone en riesgo los datos.
 */
import weaviate, { ApiKey } from 'weaviate-client';
import { leerConfig, NOMBRE_COLECCION } from './cliente.ts';

const COLECCION_DE_PRUEBA = 'PruebaDePermisos';

async function principal() {
  const clave = process.env.CLAVE_LECTURA?.trim();
  if (!clave) {
    console.error(
      'Falta CLAVE_LECTURA. Uso:\n  CLAVE_LECTURA=<la clave de solo lectura> npm run probar-lectura'
    );
    process.exit(1);
  }

  const { url } = leerConfig();
  const cliente = await weaviate.connectToWeaviateCloud(url, { authCredentials: new ApiKey(clave) });
  let problemas = 0;

  try {
    const coleccion = cliente.collections.use(NOMBRE_COLECCION);

    const total = await coleccion.aggregate.overAll();
    console.log(`1. Leer el conteo ........... OK (${total.totalCount} objetos)`);

    const respuesta = await coleccion.query.nearText('algo para calentar la sala', {
      limit: 1,
      returnMetadata: ['distance'],
    });
    console.log(`2. Buscar con nearText ...... OK (${String(respuesta.objects[0]?.properties.codigo)})`);

    try {
      await coleccion.data.insert({
        codigo: 'REU-X999',
        titulo: 'prueba de escritura no autorizada',
        descripcionLimpia: 'Este objeto no deberia poder crearse con la clave de solo lectura',
      });
      console.log('3. Insertar un objeto ....... PELIGRO: la clave pudo escribir');
      problemas += 1;
    } catch (error) {
      console.log(`3. Insertar un objeto ....... rechazado, correcto`);
    }

    try {
      await cliente.collections.create({ name: COLECCION_DE_PRUEBA });
      console.log('4. Crear una coleccion ...... PELIGRO: la clave pudo tocar el esquema');
      problemas += 1;
      await cliente.collections.delete(COLECCION_DE_PRUEBA);
    } catch (error) {
      console.log('4. Crear una coleccion ...... rechazado, correcto');
    }

    console.log(
      problemas === 0
        ? '\nLa clave solo puede leer. Se puede publicar en el repositorio.'
        : `\nNO publicar esta clave: ${problemas} operacion(es) de escritura pasaron.`
    );
    if (problemas > 0) process.exitCode = 1;
  } finally {
    await cliente.close();
  }
}

principal().catch((error) => {
  console.error(`\nFallo la prueba:\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
