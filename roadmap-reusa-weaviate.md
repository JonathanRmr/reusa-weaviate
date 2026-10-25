# Proyecto "Reusa" — Buscador semántico con Weaviate

**Asignatura:** Tendencias Modernas de Bases de Datos
**Objetivo del trabajo:** crear una aplicación funcional utilizando Weaviate en su capa gratuita.
**Equipo:** Edwar · Johnatan Romero · Alejandro Huerfano · David Quijano

> Este documento es el plan completo del proyecto. Si solo quieres saber qué te toca a ti,
> ve directo a tu fase en la sección 7, pero **lee antes las secciones 3, 4 y 6**: ahí están
> las restricciones y las decisiones de diseño que condicionan todo lo que vas a programar.

---

## 1. El caso

**"Reusa" — marketplace de artículos de segunda mano.**

En un clasificado local, quien publica escribe mal y quien busca no sabe cómo se llama lo que
necesita. Un vendedor titula *"VENDO CALEFACTOR CASI NUEVO BARATO ESCRIBIR WPP"*; un comprador
busca *"algo para calentar la sala en invierno"*. No comparten una sola palabra: un buscador por
coincidencia léxica devuelve cero resultados y la plataforma pierde la venta.

Ese es el problema de negocio: **la gente busca por necesidad y los vendedores publican por
nombre de producto**. Una base de datos vectorial cierra esa brecha, porque indexa el *significado*
del texto y no sus palabras.

Además, los datos de este dominio son sucios de verdad —mayúsculas sostenidas, emojis, teléfonos
embebidos, regionalismos—, lo que nos obliga a tomar decisiones de normalización que podemos
defender con argumentos y con cifras. Esa es la parte técnica interesante del proyecto.

### Qué es una base de datos vectorial (en una línea, para el informe)

Un modelo de *embeddings* convierte cada texto en un vector de cientos de dimensiones; textos con
significado parecido quedan cerca en ese espacio. La base de datos indexa esos vectores (con HNSW)
y responde "¿qué objetos están más cerca de esta consulta?" en milisegundos, sin comparar palabras.

---

## 2. Alcance: qué vamos a construir

| # | Funcionalidad | Qué demuestra |
|---|---|---|
| F1 | Buscar por necesidad en lenguaje natural → publicaciones ordenadas por similitud | Búsqueda vectorial (`nearText`) |
| F2 | Deslizador `alpha` (0 = palabras exactas, 1 = significado) | Búsqueda híbrida y por qué es indispensable aquí |
| F3 | Filtros de precio, ciudad y estado aplicados sobre la búsqueda | Filtrado + ANN y su costo en recall |
| F4 | Vista comparativa: misma consulta, léxico vs vectorial, lado a lado | El argumento central de la exposición |
| F5 | Detector de republicaciones: al abrir un artículo, listar los más parecidos y marcar los sospechosos de ser el mismo | Uso de la distancia como umbral de decisión, no solo como ranking |

**Volumen de datos:** 250–400 publicaciones. Suficiente para que la demo sea creíble y muy por
debajo de cualquier límite del plan gratuito.

### Requisito transversal: que el profesor lo pruebe en un comando

El proyecto debe poder evaluarse así, sin crear cuentas ni editar archivos:

```bash
git clone <repo> && cd reusa
docker compose up
# abrir http://localhost:8080
```

Esto no es un extra de presentación: **condiciona la arquitectura** y tiene su propia fase
(ver 7.5). Un proyecto que solo corre en el portátil de quien lo programó es, para efectos de
evaluación, un proyecto que no corre.

**Lo que NO vamos a hacer** (y lo decimos en el informe como trabajo futuro, porque sumar límites
reconocidos da más puntos que fingir que no existen):

- Búsqueda por imagen. Requeriría el módulo `multi2vec-clip`, que no está entre los módulos
  gestionados del plan gratuito.
- Fragmentación (*chunking*) de textos largos. Nuestras descripciones son cortas y caben de sobra
  en la ventana del modelo de embeddings.
- RAG con un modelo generativo externo. Exigiría una clave de pago de un proveedor de LLM.

---

## 3. Restricciones de la capa gratuita de Weaviate Cloud

El plan Free es gratuito de forma permanente y **no pide tarjeta de crédito**. Incluye:

| Recurso | Límite |
|---|---|
| Clústeres | 1 por usuario |
| Objetos | 100.000 |
| Memoria / disco | 1 GB / 10 GB |
| **Colecciones** | **1** (hasta 3 tenants) |
| Weaviate Embeddings | 2.000 peticiones/día |
| Query Agent | 1.000 peticiones/mes |
| Backups / replicación | No incluidos |

Consecuencias directas para el diseño — **esto hay que saberlo defender en la exposición**:

1. **Una sola colección** ⇒ no podemos tener `Vendedor`, `Categoria` y `Publicacion` como entidades
   separadas con referencias entre sí. Todo va **denormalizado** en un único objeto. Es un
   contraste directo y demostrable con el modelo relacional.
2. **Cuota diaria de embeddings** ⇒ ingestar 400 publicaciones gasta 400 peticiones; cada búsqueda
   gasta 1 más. Si el frontend busca en cada tecla, agotamos las 2.000 en una tarde de ensayos.
   Por eso el *debounce* y la caché son **requisitos funcionales**, no adornos.
3. **Sin backups** ⇒ el script de ingesta debe poder reejecutarse sin duplicar nada. Es nuestra
   única red de seguridad.
4. **Sin RAG gratuito con proveedores externos** ⇒ F5 (detector de republicaciones) reemplaza
   cualquier función generativa: no consume claves de pago ni la cuota del Query Agent.

---

## 4. Arquitectura y stack

```
React (Vite)  ──HTTP──►  Express (Node)  ──weaviate-client──►  Weaviate Cloud (Free)
  navegador                 servidor                              text2vec-weaviate
```

- **Frontend:** React + Vite
- **Backend:** Node 20+ y Express
- **Cliente:** `weaviate-client` (cliente oficial TypeScript v3) → `npm install weaviate-client`
- **Vectorizador:** `text2vec-weaviate` (Weaviate Embeddings, incluido en el plan gratuito)

### Regla no negociable de seguridad

**El navegador nunca habla directamente con Weaviate.** Si el frontend usara el cliente de Weaviate,
la API key de administrador quedaría incrustada en el bundle de React y sería visible con Ctrl+U:
cualquiera podría borrar la colección entera. Express actúa como proxy — guarda la clave en `.env`
y expone únicamente los endpoints de la sección 7.2.

### Por qué `text2vec-weaviate` y no `text2vec-openai`

Porque el servidor vectoriza: ni la ingesta ni las búsquedas necesitan una clave de OpenAI, y el
proyecto corre **sin costo alguno**. Hay que decirlo explícitamente en la exposición, es una
decisión de diseño, no una casualidad.

---

## 5. Repositorio

```
/ingesta            → scripts de limpieza y carga de datos (Edwar)
  Dockerfile
/api                → servidor Express (Johnatan) + módulos de búsqueda (Alejandro)
  Dockerfile
/web                → aplicación React (David)
  Dockerfile         (multi-stage: build de Vite + nginx)
  nginx.conf         (sirve el build y hace proxy de /api hacia el contenedor api)
/datos
  semilla.csv        → las ~280 publicaciones, versionadas en el repo
/docs               → contrato-api.md, esquema.md, evaluacion.md, manual.md
docker-compose.yml  → perfil "nube" (por defecto) y perfil "local"
.env.example        → versionado, SIN valores reales
.env                → NUNCA se sube al repositorio
.dockerignore
```

Ramas por persona, `main` protegida, *pull request* para integrar.

---

## 6. Modelo de datos — colección única `Publicacion`

| Propiedad | Tipo | ¿Entra al vector? | ¿Filtrable? |
|---|---|---|---|
| `titulo` | text | **sí** | no |
| `descripcionLimpia` | text | **sí** | no |
| `descripcionOriginal` | text | no | no |
| `categoria` | text | no | sí |
| `precio` | number | no | sí |
| `ciudad` | text | no | sí |
| `estado` | text (`nuevo` \| `como nuevo` \| `usado` \| `para repuestos`) | no | sí |
| `fechaPublicacion` | date | no | sí |
| `codigo` | text | no | sí (clave natural) |
| `imagenUrl` | text | no | no |

### Las cinco decisiones que hay que saber defender

**1. Al vector solo entran `titulo` y `descripcionLimpia`.**
Meter `precio` o `ciudad` en el texto vectorizado haría que dos artículos de $500.000 en Tunja se
parezcan entre sí *aunque uno sea una nevera y el otro una guitarra*. El embedding debe representar
**qué es el artículo**, no sus atributos administrativos. Esos van como propiedades filtrables.

**2. `precio` es `number`, nunca texto.**
Si se ingesta `"$ 450.000"` como cadena, los filtros por rango no funcionan y el orden es
alfabético: `"1.000.000"` queda antes que `"90.000"`. La normalización a entero ocurre en la
ingesta, no en el frontend.

**3. `descripcionLimpia` es derivada; `descripcionOriginal` se conserva aparte.**
Las descripciones reales traen teléfonos, "ESCRIBIR AL WHATSAPP", emojis y mayúsculas sostenidas.
Si el 60 % del texto es información de contacto, **el embedding representa mayoritariamente ruido**
y la búsqueda se degrada. Vectorizamos la versión limpia y le mostramos al usuario la original.
Esta es la decisión técnica más importante del proyecto.

**4. Un objeto = una publicación, sin fragmentación.**
Las descripciones son cortas. Si indexáramos catálogos largos habría que partirlos en fragmentos
con solape, porque un vector promedio de 80 páginas no representa nada. Va como trabajo futuro.

**5. UUID determinístico a partir de `codigo`** (`generateUuid5(codigo)`).
Así, reejecutar la ingesta **actualiza** en lugar de duplicar. Sin esto, dos corridas del script
dejan el catálogo repetido y —peor— arruinan F5, porque el detector encontraría duplicados que
creamos nosotros mismos.

### Sobre los datos

Los escribimos nosotros, inspirados en clasificados reales pero **sin copiarlos** y **sin datos
personales**: nada de teléfonos ni nombres reales. Como el ejercicio consiste justamente en limpiar
datos de contacto, usamos números ficticios del tipo `300 000 0000`. Esto nos evita problemas con
los términos de uso de los sitios y con el tratamiento de datos personales, y es una línea
defendible si en la sustentación lo preguntan.

---

## 7. Roadmap por fases

Cada fase tiene un **criterio de aceptación verificable**. Mientras no se cumpla, el siguiente no
puede avanzar sin inventar supuestos.

### Fase 0 — Arranque conjunto (los cuatro, ~1 hora)

1. Crear el repositorio con la estructura de la sección 5.
2. **Firmar el contrato de la API antes de escribir una línea de código** (ver 7.2) y dejarlo en
   `/docs/contrato-api.md`. Esto permite que David y Alejandro trabajen en paralelo.
3. Cada integrante redacta **~70 publicaciones** en el CSV compartido, cubriendo todas las
   categorías y —deliberadamente— con **ruido realista**: mayúsculas, emojis, contacto embebido,
   errores de tipeo, regionalismos.

> ⚠️ Si los datos salen limpios, el proyecto pierde su mejor argumento. El ruido es parte del
> material de trabajo, no un descuido.

---

### 7.1 Fase 1 — **Edwar**: clúster, esquema, normalización e ingesta

*Es la base del proyecto: nadie puede probar nada hasta que existan vectores en la nube.*

**1.1 Crear el clúster.** Cuenta en <https://console.weaviate.cloud> → clúster gratuito (tarda 1–3
minutos; aparece un ✔️ al lado del nombre cuando está listo). Guardar el **REST Endpoint URL** y la
**Admin API key**. Para Weaviate Cloud basta la URL REST: el cliente configura gRPC solo.

**1.2 Verificar la conexión antes que nada:**

```ts
import weaviate, { ApiKey } from 'weaviate-client';

const client = await weaviate.connectToWeaviateCloud(process.env.WEAVIATE_URL!, {
  authCredentials: new ApiKey(process.env.WEAVIATE_API_KEY!),
});
console.log(await client.isReady()); // true
await client.close();
```

Si responde `unauthorized: invalid api key`, se copió la clave de lectura en vez de la de
administrador.

**1.3 Definir el esquema:**

```ts
import { vectors, dataType } from 'weaviate-client';

await client.collections.create({
  name: 'Publicacion',
  vectorizers: vectors.text2VecWeaviate({
    sourceProperties: ['titulo', 'descripcionLimpia'],
  }),
  properties: [
    { name: 'titulo',              dataType: dataType.TEXT },
    { name: 'descripcionLimpia',   dataType: dataType.TEXT },
    { name: 'descripcionOriginal', dataType: dataType.TEXT,   skipVectorization: true },
    { name: 'categoria',           dataType: dataType.TEXT,   skipVectorization: true },
    { name: 'precio',              dataType: dataType.NUMBER },
    { name: 'ciudad',              dataType: dataType.TEXT,   skipVectorization: true },
    { name: 'estado',              dataType: dataType.TEXT,   skipVectorization: true },
    { name: 'fechaPublicacion',    dataType: dataType.DATE },
    { name: 'codigo',              dataType: dataType.TEXT,   skipVectorization: true },
    { name: 'imagenUrl',           dataType: dataType.TEXT,   skipVectorization: true },
  ],
});
```

> Verificar los nombres exactos de `sourceProperties` y `skipVectorization` contra la versión del
> cliente instalada. La API ha cambiado entre versiones y la documentación en
> <https://docs.weaviate.io/weaviate/quickstart> siempre refleja la última.

**1.4 Pipeline de normalización** (`ingesta/limpiar.ts`) — función pura y testeable:

```
descripcionOriginal
  → quitar teléfonos y correos (regex)
  → quitar emojis y caracteres de adorno
  → bajar mayúsculas sostenidas (si >60 % del texto está en mayúscula)
  → colapsar espacios y saltos repetidos
  → recortar muletillas de contacto ("escribir al wpp", "solo interesados")
  → descartar si quedan menos de 15 palabras útiles
= descripcionLimpia
```

Guardar un **reporte de limpieza**: cuántos caracteres se eliminaron en promedio y cuántas
publicaciones se descartaron. Es una cifra concreta para el informe y para la demo.

**1.5 Script de ingesta** (`ingesta/cargar.ts`): leer el CSV → normalizar precio a entero y fecha a
ISO → aplicar 1.4 → generar el UUID v5 desde `codigo` → insertar por lotes con
`collection.data.insertMany(...)` → reportar insertados y fallidos.

**1.6 Verificación.** Contar objetos con `collection.aggregate.overAll()`, correr desde consola un
`nearText("algo para calentar la sala")` e inspeccionar las distancias. Documentar en
`/docs/esquema.md` las cinco decisiones de la sección 6.

> ✅ **Criterio de aceptación:** ≥250 objetos en la colección; `nearText` devuelve resultados
> coherentes con distancias en un rango razonable (aprox. 0.3–0.7 con coseno); `.env.example`
> versionado sin valores y credenciales reales compartidas solo por el canal privado del grupo.

---

### 7.2 Fase 2 — **Johnatan Romero**: backend, contrato e infraestructura

*Arranca en paralelo al punto 1.4, apenas esté firmado el contrato.*

**2.1 Cerrar y publicar el contrato de la API** (antes de implementar nada):

```
GET /api/buscar?q=&alpha=0.6&categoria=&precioMin=&precioMax=&ciudad=&estado=&limit=12
→ 200 {
    resultados: [{ codigo, titulo, descripcionOriginal, categoria, precio,
                   ciudad, estado, fechaPublicacion, imagenUrl,
                   score, distance }],
    tomoMs, modo: "hybrid"
  }

GET /api/similares/:codigo?limit=5
→ 200 { base: {...}, similares: [{ ..., distance, posibleDuplicado: true }] }

GET /api/salud
→ 200 { weaviate: true, objetos: 312 }
```

**2.2 Esqueleto de Express** con `/api/salud` funcionando de verdad y los otros dos endpoints
devolviendo un *stub* fijo que respete el contrato. **Esto desbloquea a David el primer día**:
puede construir toda la interfaz sin esperar el motor de búsqueda.

**2.3 Gestión de credenciales.** `.env` fuera de Git desde el primer commit; `.env.example`
versionado; validación al arrancar: si falta `WEAVIATE_API_KEY`, el servidor debe morir con un
mensaje claro, no fallar a mitad de la exposición.

**2.4 Un solo cliente Weaviate por proceso**, no uno por petición. Cada conexión abre un canal gRPC;
agotarlos es la causa clásica de que la app se caiga a los dos minutos de demo. Cerrarlo
limpiamente al apagar el servidor.

**2.5 Validación, errores y cuota.**
- `q` no vacío, `limit ≤ 25`, `precioMin ≤ precioMax`.
- `try/catch` que traduzca los errores de Weaviate a códigos HTTP legibles.
- **Caché en memoria con TTL de 5 minutos**, indexada por la consulta completa (q + alpha +
  filtros). No es un adorno: protege el presupuesto de 2.000 embeddings diarios durante los ensayos.

**2.6 Preparar el servidor para vivir en un contenedor.** La contenerización completa es de David
(fase 7.5), pero el backend debe nacer listo para ella:

- **Toda la configuración entra por variables de entorno**, nunca por rutas o valores quemados en
  el código: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `PORT`, `CORS_ORIGIN`.
- `PORT` configurable, con `3001` por defecto.
- El servidor escucha en `0.0.0.0`, **no en `localhost`**. Si escucha en `localhost` dentro del
  contenedor, nadie puede alcanzarlo desde fuera y el `docker compose up` "funciona" pero no
  responde. Es el error más común de este paso.
- `/api/salud` sirve además como *healthcheck* de Docker: debe responder rápido y no depender de
  que haya datos cargados, solo de que Weaviate esté alcanzable.
- Despliegue opcional en la nube (Render/Railway) como respaldo del contenedor, con las variables
  en el panel del proveedor y nunca en el repositorio.

> ✅ **Criterio de aceptación:** `/api/salud` devuelve el conteo real de objetos; los otros dos
> endpoints cumplen el contrato; el servidor arranca correctamente con toda su configuración pasada
> por variables de entorno y escuchando en `0.0.0.0`.

---

### 7.3 Fase 3 — **Alejandro Huerfano**: motor de consultas y evaluación

*Implementa los módulos que Johnatan ya dejó enchufados detrás de los stubs. Es la carga técnica
más densa del proyecto.*

**3.1 Búsqueda vectorial pura.**

```ts
const r = await col.query.nearText(q, { limit, returnMetadata: ['distance'] });
```

Dejar escrito qué significa la distancia: con coseno, **0 es idéntico y 2 es opuesto**. No es un
porcentaje de coincidencia. Si la presentamos como "92 % de match", el jurado puede objetarlo con
razón.

**3.2 Búsqueda híbrida.**

```ts
const r = await col.query.hybrid(q, {
  alpha, limit, returnMetadata: ['score', 'explainScore'],
});
```

`alpha = 0` es BM25 puro (palabras exactas), `alpha = 1` es vectorial puro. Weaviate fusiona ambos
rankings y devuelve un `score` normalizado que **no es comparable con la distancia de 3.1**: son
escalas distintas, y mostrarlas en la misma columna sería un error de presentación.

En un marketplace el híbrido no es opcional, y el argumento es fuerte: quien busca
`"iPhone 13 Pro Max 256GB"` quiere coincidencia literal y ahí BM25 gana siempre; quien busca
`"algo para calentar la sala"` necesita el vector. Un `alpha` entre 0.6 y 0.7 suele equilibrar
ambos, pero **hay que confirmarlo con 3.5, no asumirlo**.

**3.3 Filtros combinados con la búsqueda.**

```ts
filters: Filters.and(
  col.filter.byProperty('ciudad').equal(ciudad),
  col.filter.byProperty('precio').lessOrEqual(precioMax),
)
```

Punto crítico para el informe: un filtro muy selectivo —por ejemplo `precio < 50.000` cuando solo
9 de 300 publicaciones lo cumplen— **degrada el recall del índice HNSW**, porque el recorrido del
grafo esquiva los nodos descartados y puede quedar desconectado. Hay que probar el caso, medir
cuántos resultados esperados se pierden y mostrarlo. Es el tipo de observación que distingue un
trabajo con criterio de uno que solo siguió un tutorial.

**3.4 Detector de republicaciones (F5).** Recuperar el objeto por `codigo`, ejecutar `nearObject`
con su UUID, excluirlo del resultado y marcar `posibleDuplicado` cuando la distancia cae por debajo
de un umbral.

**El umbral se calibra, no se inventa:**
1. Meter a propósito 10 pares republicados (mismo artículo, texto reescrito).
2. Medir sus distancias.
3. Medir también las de 10 pares distintos de la misma categoría.
4. Elegir el corte que separa ambos grupos y **reportar los falsos positivos**.

Esa tabla es, por sí sola, media exposición.

**3.5 Consultas de demostración y mini-evaluación.**
- 8 consultas donde el vector gana: `"algo para calentar la sala"`, `"mueble para guardar ropa"`,
  `"para trabajar desde la casa"`, etc.
- 2 consultas donde **pierde** (modelos y referencias exactas). Este caso es **obligatorio**:
  justifica por qué la app usa híbrido y no vectorial puro.
- Precision@5 con relevancia juzgada a mano para α = 0, α = 0.5 y α = 1, y una conclusión sobre
  qué `alpha` queda por defecto.

> ✅ **Criterio de aceptación:** dos funciones (`buscar(params)` y `similares(codigo)`) que cumplen
> el contrato, más `/docs/evaluacion.md` con la tabla de Precision@5, el umbral calibrado de
> duplicados y la justificación de ambos.

---

### 7.4 Fase 4 — **David Quijano**: frontend, UX y presentación

**4.1 Interfaz base** (React + Vite): buscador, rejilla de tarjetas con imagen, título, precio
formateado en pesos, ciudad y estado. Estados de carga, vacío y error. Se trabaja **contra el stub
de la Fase 2 desde el primer día**, sin esperar a nadie.

**4.2 Debounce de 350 ms** en el input. Sin esto, teclear "algo para calentar la sala" dispara ~25
búsquedas y gasta 25 embeddings. Es **requisito funcional**, no detalle cosmético.

**4.3 Controles de búsqueda:** deslizador de `alpha` rotulado en los extremos
("palabras exactas" ↔ "significado"), rango de precio, selector de ciudad, estado y categoría.
Mostrar la métrica devuelta junto a cada resultado **con el nombre correcto según el modo**
(distancia o score — ver 3.2).

**4.4 Vista comparativa (F4) — el corazón de la exposición:** dos columnas con la misma consulta,
izquierda α = 0, derecha α = 1, resaltando lo que aparece en una y no en la otra. Esta pantalla es
la que debe quedar proyectada mientras hablamos.

**4.5 Ficha de artículo con F5:** al abrir una publicación, franja inferior de "parecidos" y una
insignia visible en los marcados como posible republicación, mostrando la distancia.

**4.6 Pulido:** responsive, **contraste alto** (los grises claros desaparecen en videobeam), foco
visible, formato de precios con separador de miles.

**4.7 Cierre:** diapositivas, **video o GIF de respaldo de la demo** por si falla el wifi del salón,
y manual de usuario en `/docs`.

> ✅ **Criterio de aceptación:** app desplegada en una URL pública, vista comparativa funcionando
> con las consultas de Alejandro, video de respaldo grabado.

---

### 7.5 Fase 5 — **David Quijano**: contenerización y experiencia del evaluador

*Por qué David y no Alejandro: este trabajo no es infraestructura de producción (esa la tiene
Johnatan en 2.6), es **experiencia de quien recibe el proyecto**. David ya es dueño de todo lo que
el profesor ve de frente —la interfaz, el manual, el video— y esto es la primera pantalla de esa
experiencia. Alejandro, en los mismos días, está calibrando umbrales y midiendo Precision@5, que
es la tarea de mayor carga cognitiva del proyecto. Si el grupo prefiere invertirlo, que lo decidan
en la Fase 0 y lo anoten aquí; lo que no puede pasar es que quede sin dueño.*

#### El problema que hay que resolver primero

La capa gratuita de Weaviate es **un servicio en la nube** y exige una URL y una API key. Eso choca
con "que el profesor solo ejecute un comando". Las dos salidas malas son:

- ❌ Pedirle al profesor que cree su propia cuenta y edite un `.env` → ya no es "sin configuración".
- ❌ Publicar la **clave de administrador** en el repositorio → cualquiera puede borrar la colección
  entera, y además es exactamente lo que criticamos en la sección 4.

La salida correcta son **dos perfiles en el mismo `docker-compose.yml`**:

| Perfil | Qué levanta | Para qué sirve |
|---|---|---|
| `nube` (por defecto) | `api` + `web` | Demo real contra nuestro clúster gratuito, con datos ya ingestados. Arranca en segundos. |
| `local` (respaldo) | `weaviate` + `t2v-transformers` + `ingesta` + `api` + `web` | Funciona **sin internet y sin cuenta**, vectorizando en la máquina del evaluador. |

**5.1 Clave de solo lectura para el perfil `nube`.** En la consola de Weaviate Cloud, el plan
gratuito incluye RBAC: crear un rol con permiso únicamente de **lectura sobre la colección
`Publicacion`** y generar una API key para ese rol. Esa es la clave que va en el
`docker-compose.yml`, y hay que decirlo en el informe: *la clave publicada no puede escribir, ni
borrar, ni crear colecciones; el peor escenario es que alguien ejecute búsquedas contra nuestro
clúster*. Rotarla después de la sustentación.

**5.2 Dockerfiles.**

- `/api/Dockerfile`: imagen base `node:20-alpine`, `npm ci --omit=dev`, usuario no root, `CMD` al
  servidor.
- `/web/Dockerfile`: **multi-stage**. Primera etapa compila con Vite; segunda etapa es `nginx:alpine`
  y solo copia el `dist/`. Sin multi-stage la imagen pesa ~400 MB con todo `node_modules` adentro;
  con multi-stage queda en ~25 MB.
- `/ingesta/Dockerfile`: igual que la API, pero el `CMD` ejecuta el script de carga una sola vez.
- `.dockerignore` con `node_modules`, `.env`, `.git` y `dist`. Sin esto, el *build context* sube
  cientos de megas y la compilación se vuelve lentísima.

**5.3 Un solo puerto para el evaluador.** El profesor abre `http://localhost:8080` y nada más. Nginx
sirve el build de React y hace proxy de `/api/*` hacia el contenedor `api` por la red interna de
Docker. Ventaja adicional: **desaparecen los problemas de CORS**, porque para el navegador todo
viene del mismo origen. El contenedor `api` no publica ningún puerto hacia afuera.

**5.4 Fijar las versiones de las imágenes.** `node:20-alpine`, `nginx:1.27-alpine`,
`cr.weaviate.io/semitechnologies/weaviate:<versión exacta>`. **Nunca `latest`**: si el profesor
evalúa dentro de tres semanas y una imagen cambió, el proyecto deja de compilar y nadie va a estar
ahí para arreglarlo.

**5.5 Orden de arranque con `healthcheck` y `depends_on: condition: service_healthy`.** En el perfil
`local`, la ingesta no puede correr antes de que Weaviate responda, y la API no puede arrancar antes
de que existan datos. `depends_on` a secas solo espera a que el contenedor **inicie**, no a que esté
**listo**: esa diferencia es la causa típica de que el primer `docker compose up` falle y el
segundo funcione.

**5.6 Perfil `local` con vectorizador propio.** `text2vec-weaviate` es un servicio de Weaviate Cloud
y no existe en el Weaviate autoalojado; por eso el perfil local usa el módulo
`text2vec-transformers` con un contenedor de inferencia. Advertir en el README que la imagen del
modelo pesa alrededor de 1 GB y que la primera carga tarda varios minutos en CPU. **Por eso es el
respaldo y no el perfil por defecto.**

**5.7 README de evaluación**, al inicio del archivo y en tres bloques:

```markdown
## Para evaluar este proyecto

### Opción 1 — un comando (recomendada)
docker compose up
Abrir http://localhost:8080

### Opción 2 — sin internet ni cuentas
docker compose --profile local up
(la primera vez descarga ~1 GB del modelo; esperar a "listo para recibir consultas")

### Consultas sugeridas para probar
- "algo para calentar la sala"   → el deslizador a la izquierda no encuentra nada; a la derecha sí
- "mueble para guardar ropa"
- "iPhone 13 Pro Max"            → aquí gana la búsqueda por palabras, y explicamos por qué
```

**5.8 Prueba en frío, obligatoria.** Probarlo en la máquina de **otro integrante**, recién clonado,
con `docker system prune -a` antes. Si alguno usa Mac con chip Apple Silicon, verificar que las
imágenes corran en `arm64` o declarar `platform: linux/amd64`. Un `docker compose up` que solo
funciona en el portátil de David no sirve de nada.

> ✅ **Criterio de aceptación:** en una máquina limpia, con el repositorio recién clonado y **sin
> editar ningún archivo**, `docker compose up` deja la aplicación funcionando en
> `http://localhost:8080` con los datos cargados. El perfil `local` levanta sin conexión a internet.
> Ningún secreto con permisos de escritura está en el repositorio.

---

### 7.6 Fase 6 — Cierre conjunto

Integración, ensayo cronometrado y armado del informe con las piezas que cada uno ya escribió:

| Sección del informe | Responsable | Archivo fuente |
|---|---|---|
| Modelo de datos y calidad de datos | Edwar | `/docs/esquema.md` + reporte de limpieza |
| Arquitectura, API y despliegue | Johnatan | `/docs/contrato-api.md` + README |
| Motor de búsqueda y evaluación | Alejandro | `/docs/evaluacion.md` |
| Contenerización y manual de evaluación | David | `docker-compose.yml` + README |
| Manual de usuario y diapositivas | David | `/docs/manual.md` |

---

## 8. Cronograma (2 semanas)

| Días | Edwar | Johnatan | Alejandro | David |
|---|---|---|---|---|
| 1 | Fase 0 + crear clúster | Fase 0 + contrato | Fase 0 | Fase 0 |
| 2–4 | Esquema + limpieza + ingesta | Express + stubs + config por entorno | Estudio de la API, consultas de demo | UI base contra el stub |
| 5–7 | Reporte de limpieza, apoyo a datos | Caché + healthcheck + respaldo en la nube | Motor de búsqueda + detector F5 | Controles + vista comparativa |
| 8–10 | Clave de solo lectura (RBAC) | Integración real | Calibración de umbral + Precision@5 | **Dockerfiles + compose perfil `nube`** + ficha de artículo |
| 11–12 | Informe (datos) | Informe (arquitectura) | Informe (búsqueda) | **Perfil `local` + prueba en frío** + diapositivas y video |
| 13–14 | Ensayo general y ajustes finales (los cuatro) | | | |

**Dependencia dura única:** Fase 1 → Fase 3. Todo lo demás se solapa gracias a los stubs del
contrato. Por eso el contrato se firma el día 1 y no se cambia sin avisar a los cuatro.

---

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Agotar las 2.000 peticiones de embeddings ensayando | Debounce + caché + ensayar siempre con el mismo juego de consultas |
| Datos demasiado limpios ⇒ la limpieza no demuestra nada | Revisión cruzada del CSV en Fase 0: exigir ruido realista |
| Umbral de duplicados elegido "a ojo" | Calibrarlo con los 20 pares de 3.4 y reportar falsos positivos |
| Una sola colección: no hay dónde "probar al lado" | Weaviate local en Docker para ensayar cambios de esquema antes de tocar la nube |
| Se cae el wifi del salón | Video de respaldo (4.7) |
| Rendimiento flojo en español | Probar otro modelo de Weaviate Embeddings antes de cambiar de proveedor |
| Cambio de API entre versiones del cliente | Fijar la versión en `package.json` y no actualizar durante el proyecto |
| El `docker compose up` falla en la máquina del profesor | Prueba en frío en el equipo de otro integrante (5.8) y versiones de imagen fijadas (5.4) |
| La clave publicada en el compose se usa indebidamente | Es de **solo lectura** por RBAC (5.1) y se rota después de la sustentación |
| El perfil `local` tarda demasiado en la evaluación | No es el perfil por defecto; el README advierte la descarga de ~1 GB |
| Dejar la contenerización para el último día | Está agendada en los días 8–12, no en el 13 |

---

## 10. Guion de la demo (6 minutos)

0. **(20 s)** Antes de empezar: `docker compose up` en vivo y la app abierta en `localhost:8080`.
   Decir en una frase que el profesor puede reproducir esto mismo con el repositorio y un solo
   comando. Vale puntos y toma veinte segundos.
1. **(45 s)** El problema: consulta `"algo para calentar la sala"` con α = 0 → cero resultados o
   resultados absurdos.
2. **(45 s)** La misma consulta con α = 1 → aparece el calefactor cuyo título no contiene ninguna
   de esas palabras. **Este es el momento que decide la nota.**
3. **(60 s)** El deslizador en vivo: cómo cambia el ranking entre los extremos, y el contraejemplo
   `"iPhone 13 Pro Max"`, donde α = 0 gana. Conclusión: por eso usamos híbrido con α = 0.65.
4. **(60 s)** Por qué funciona: el pipeline de limpieza, con el antes y el después de una
   descripción real y la cifra de ruido eliminado.
5. **(60 s)** Filtros: precio y ciudad sobre la búsqueda, y la caída de recall con un filtro muy
   selectivo.
6. **(45 s)** F5: ficha de artículo, parecidos y la insignia de republicación, con el umbral y su
   justificación.
7. **(45 s)** Cierre: límites del plan gratuito, qué no hicimos (búsqueda por imagen,
   fragmentación) y por qué.

---

## 11. Enlaces útiles

- Consola de Weaviate Cloud: <https://console.weaviate.cloud>
- Quickstart oficial: <https://docs.weaviate.io/weaviate/quickstart>
- Cliente TypeScript: <https://docs.weaviate.io/weaviate/client-libraries/typescript>
- Precios y límites del plan gratuito: <https://weaviate.io/pricing>
- Foro de soporte: <https://forum.weaviate.io/c/support>
- Weaviate autoalojado con Docker (perfil `local`): <https://docs.weaviate.io/deploy>
- Módulo `text2vec-transformers`: <https://docs.weaviate.io/weaviate/model-providers>
