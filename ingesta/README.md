# ingesta — limpieza, normalización y carga (Fase 1, Edwar)

Scripts que crean el esquema de la colección `Publicacion` y cargan el catálogo desde
`datos/semilla.csv`. Las decisiones de diseño están documentadas en [`docs/esquema.md`](../docs/esquema.md).

## Puesta en marcha

```bash
npm install
cp ../.env.example ../.env     # y poner WEAVIATE_URL y WEAVIATE_API_KEY
```

## Comandos

| Comando | Qué hace | ¿Gasta cuota de embeddings? |
|---|---|---|
| `npm test` | 28 pruebas del pipeline de limpieza y normalización | no |
| `npm run cargar -- --seco` | Normaliza el CSV y escribe `reportes/limpieza.md` | **no** |
| `npm run verificar` | Conexión, versión del clúster y módulos disponibles | no |
| `npm run esquema` | Crea la colección (no la toca si ya existe) | no |
| `npm run esquema -- --mostrar` | Imprime la configuración real que hay en la nube | no |
| `npm run esquema -- --recrear` | Borra la colección y la vuelve a crear | no |
| `npm run cargar` | Ingesta real, en lotes de 50 | sí, ~1 por objeto |
| `npm run consultar` | Conteo + `nearText` de control con sus distancias | sí, 1 por consulta |
| `npm run consultar -- --similares=REU-E001` | Ensayo del detector de republicaciones | sí, 1 |

El plan gratuito da **2.000 peticiones de embeddings al día**: por eso el modo `--seco` existe y por
eso conviene usarlo mientras se ajusta la limpieza.

## Por qué la ingesta se puede repetir sin miedo

El UUID de cada objeto sale de `generateUuid5(codigo)`, así que volver a correr `npm run cargar`
**actualiza** los objetos en lugar de duplicarlos. Es la única red de seguridad del proyecto: el plan
gratuito no incluye backups.

## Archivos

```
src/limpiar.ts       pipeline de limpieza de texto (funciones puras)
src/normalizar.ts    precio, fecha, estado, categoría, ciudad, código
src/preparar.ts      del CSV a objetos listos + reporte
src/cliente.ts       conexión única a Weaviate y lectura de configuración
src/esquema.ts       creación de la colección
src/cargar.ts        ingesta por lotes
src/consultar.ts     verificación con nearText y nearObject
reportes/            generado, no versionado
```
