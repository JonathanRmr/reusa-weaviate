/**
 * Crea el rol de SOLO LECTURA que usara el perfil "nube" del docker-compose
 * (roadmap 5.1), para no publicar nunca la Admin API key en el repositorio.
 *
 *   npm run rol-lectura              crea el rol si no existe y muestra sus permisos
 *   npm run rol-lectura -- --clave   crea ademas el usuario y emite su API key
 *   npm run rol-lectura -- --rotar   emite una clave nueva e invalida la anterior
 *   npm run rol-lectura -- --mostrar solo inspecciona
 *   npm run rol-lectura -- --borrar  elimina el rol
 *
 * La clave que emite `--clave` es la que va publicada en el docker-compose.yml.
 * Se puede publicar porque no puede escribir, ni borrar, ni crear colecciones:
 * el peor escenario es que alguien ejecute busquedas contra nuestro cluster.
 */
import weaviate from 'weaviate-client';
import { conectar, explicarError, NOMBRE_COLECCION } from './cliente.ts';

// `permissions` viaja en el export por defecto del cliente, no como named export.
const { permissions } = weaviate;

export const NOMBRE_ROL = 'reusa-solo-lectura';
export const NOMBRE_USUARIO = 'reusa-lectura-publica';

const opciones = new Set(process.argv.slice(2));

/**
 * `roles.byName` responde 404 cuando el rol no existe, en vez de devolver null.
 * Aqui se traduce a null, que es lo que la firma del cliente promete.
 */
async function buscarRol(cliente: Awaited<ReturnType<typeof conectar>>) {
  try {
    return await cliente.roles.byName(NOMBRE_ROL);
  } catch (error) {
    if (/404/.test(error instanceof Error ? error.message : String(error))) return null;
    throw error;
  }
}

async function principal() {
  const cliente = await conectar();
  try {
    const existente = await buscarRol(cliente);

    if (opciones.has('--borrar')) {
      if (!existente) {
        console.log(`El rol "${NOMBRE_ROL}" no existe.`);
        return;
      }
      await cliente.roles.delete(NOMBRE_ROL);
      console.log(`Rol "${NOMBRE_ROL}" eliminado.`);
      return;
    }

    if (!existente && !opciones.has('--mostrar')) {
      await cliente.roles.create(NOMBRE_ROL, [
        // Leer los objetos de la coleccion: es lo que hacen /api/buscar y
        // /api/similares. Sin create, update ni delete.
        ...permissions.data({ collection: NOMBRE_COLECCION, read: true }),
        // Leer la configuracion de la coleccion. El cliente la consulta al
        // conectarse; sin esto, las consultas fallan antes de empezar.
        ...permissions.collections({ collection: NOMBRE_COLECCION, read_config: true }),
      ]);
      console.log(`Rol "${NOMBRE_ROL}" creado.`);
    } else if (existente) {
      console.log(`El rol "${NOMBRE_ROL}" ya existe.`);
    } else {
      console.log(`El rol "${NOMBRE_ROL}" no existe todavia.`);
      return;
    }

    const rol = await buscarRol(cliente);
    console.log('\n--- Permisos del rol ---');
    console.log(JSON.stringify(rol, null, 2));
    if (opciones.has('--clave') || opciones.has('--rotar')) {
      await emitirClave(cliente);
    } else {
      console.log(
        `\nPara emitir la API key de este rol:  npm run rol-lectura -- --clave\n` +
          `(o en la consola: Dashboard -> API Keys -> + New key, eligiendo el rol "${NOMBRE_ROL}")`
      );
    }
  } finally {
    await cliente.close();
  }
}

/**
 * Crea el usuario de base de datos ligado al rol y devuelve su API key. Weaviate
 * la muestra una sola vez; si se pierde, `--rotar` emite otra e invalida la vieja.
 */
async function emitirClave(cliente: Awaited<ReturnType<typeof conectar>>) {
  let clave: string;

  if (opciones.has('--rotar')) {
    clave = await cliente.users.db.rotateKey(NOMBRE_USUARIO);
    console.log(`\nClave rotada para "${NOMBRE_USUARIO}". La anterior ya no sirve.`);
  } else {
    try {
      clave = await cliente.users.db.create(NOMBRE_USUARIO);
      console.log(`\nUsuario "${NOMBRE_USUARIO}" creado.`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      if (!/already exists|409/i.test(mensaje)) throw error;
      console.log(
        `\nEl usuario "${NOMBRE_USUARIO}" ya existe y su clave solo se muestra al crearla.\n` +
          `Si la perdiste:  npm run rol-lectura -- --rotar`
      );
      return;
    }
  }

  await cliente.users.db.assignRoles(NOMBRE_ROL, NOMBRE_USUARIO);
  console.log(`Rol "${NOMBRE_ROL}" asignado a "${NOMBRE_USUARIO}".`);
  console.log(`\n=== API key de SOLO LECTURA (esta si puede ir en el repositorio) ===`);
  console.log(clave);
  console.log(
    `\nVa en docker-compose.yml como WEAVIATE_API_KEY del perfil "nube".\n` +
      `Rotarla despues de la sustentacion:  npm run rol-lectura -- --rotar`
  );
}

principal().catch((error) => {
  console.error(`\nFallo la gestion del rol:\n${explicarError(error)}`);
  process.exit(1);
});
