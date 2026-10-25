/**
 * Paso 1.2 del roadmap: verificar la conexion antes que nada.
 *
 *   npm run verificar
 */
import { conectar, explicarError, leerConfig, NOMBRE_COLECCION } from './cliente.ts';

async function principal() {
  const { url } = leerConfig();
  console.log(`Clúster: ${url}`);

  const cliente = await conectar();
  try {
    const listo = await cliente.isReady();
    console.log(`isReady(): ${listo}`);
    if (!listo) process.exitCode = 1;

    const meta = await cliente.getMeta();
    console.log(`Version de Weaviate: ${meta.version}`);
    const modulos = Object.keys((meta.modules as Record<string, unknown>) ?? {});
    console.log(`Modulos disponibles: ${modulos.length > 0 ? modulos.join(', ') : '(ninguno reportado)'}`);
    console.log(
      modulos.some((m) => m.includes('text2vec-weaviate'))
        ? 'OK: el vectorizador text2vec-weaviate esta disponible.'
        : 'Aviso: no se reporto text2vec-weaviate entre los modulos; revisa el plan del clúster.'
    );

    const existe = await cliente.collections.exists(NOMBRE_COLECCION);
    console.log(`Coleccion "${NOMBRE_COLECCION}": ${existe ? 'ya existe' : 'no existe todavia (corre npm run esquema)'}`);
  } finally {
    await cliente.close();
  }
}

principal().catch((error) => {
  console.error(`\nFallo la verificacion:\n${explicarError(error)}`);
  process.exit(1);
});
