# Modelo de datos y calidad de datos — colección única `Publicacion`

**Responsable:** Edwar (Fase 1) · **Cliente:** `weaviate-client@3.15.1` · **Vectorizador:** `text2vec-weaviate`

Este documento es la fuente de verdad del esquema. Si alguien necesita un campo nuevo, se
discute aquí antes de tocar la nube: el plan gratuito permite **una sola colección**, así que no
hay dónde "probar al lado".

---

## 1. Las propiedades

| Propiedad | Tipo | ¿Entra al vector? | ¿BM25? | ¿Filtrable? | Notas |
|---|---|---|---|---|---|
| `titulo` | text | **sí** | **sí** | no | Normalizado (sin emojis, teléfonos ni mayúscula sostenida) |
| `descripcionLimpia` | text | **sí** | **sí** | no | Derivada por el pipeline de limpieza |
| `descripcionOriginal` | text | no | no | no | Lo que ve el usuario, tal como se publicó |
| `categoria` | text | no | no | sí | Lista cerrada de 12 valores |
| `precio` | number | no | — | sí (+ rangos) | Entero en pesos |
| `ciudad` | text | no | no | sí | Title Case y sin acentos |
| `estado` | text | no | no | sí | `nuevo` \| `como nuevo` \| `usado` \| `para repuestos` |
| `fechaPublicacion` | date | no | — | sí (+ rangos) | UTC a medianoche |
| `codigo` | text | no | no | sí | Clave natural, `tokenization: field` |
| `imagenUrl` | text | no | no | no | Solo presentación |

---

## 2. Las cinco decisiones que hay que saber defender

### 2.1 Al vector solo entran `titulo` y `descripcionLimpia`

Se declara con `sourceProperties: ['titulo', 'descripcionLimpia']` y con `skipVectorization: true`
en todo lo demás.

Meter `precio` o `ciudad` en el texto vectorizado haría que dos artículos de $500.000 en Tunja se
parezcan entre sí *aunque uno sea una nevera y el otro una guitarra*. El embedding debe representar
**qué es el artículo**; sus atributos administrativos van como propiedades filtrables, que es
justamente para lo que sirven.

### 2.2 `precio` es `number`, nunca texto

Si se ingestara `"$ 450.000"` como cadena, los filtros por rango no funcionarían y el orden sería
alfabético: `"1.000.000"` quedaría antes que `"90.000"`. La normalización a entero ocurre en la
ingesta (`normalizarPrecio`), no en el frontend, y hay una prueba que lo verifica con los siete
formatos que aparecen de verdad en el CSV.

### 2.3 `descripcionLimpia` es derivada; `descripcionOriginal` se conserva aparte

Es la decisión técnica más importante del proyecto. En las 280 publicaciones de semilla:

| Ruido en el texto original | Publicaciones | % |
|---|---|---|
| Emojis o pictogramas | 130 | 46 % |
| Muletillas de contacto o relleno comercial | 99 | 35 % |
| Mayúscula sostenida (> 60 % del texto) | 92 | 33 % |
| Teléfono embebido | 73 | 26 % |
| Adornos y signos repetidos | 29 | 10 % |
| Correo electrónico | 4 | 1 % |

Si el texto de contacto entra al embedding, **el vector representa mayoritariamente ruido** y todas
las publicaciones con "ESCRIBIR AL WPP" se parecen entre sí sin tener nada que ver. Vectorizamos la
versión limpia y al usuario le mostramos la original. Cifras medidas: en las 58 descripciones con
ruido eliminable la limpieza quitó **46 caracteres en promedio, el 18 % de su texto**; dos
publicaciones quedaron sin contenido útil y se descartaron.

El reporte completo y reproducible está en `ingesta/reportes/limpieza.md` (se regenera con
`npm run cargar -- --seco`, sin gastar cuota de embeddings).

### 2.4 Un objeto = una publicación, sin fragmentación

Las descripciones son cortas y caben de sobra en la ventana del modelo. Si indexáramos catálogos
largos habría que partirlos en fragmentos con solape, porque un vector promedio de 80 páginas no
representa nada. Va declarado como trabajo futuro, no como olvido.

### 2.5 UUID determinístico a partir de `codigo`

`generateUuid5(codigo)`. Reejecutar la ingesta **actualiza** en lugar de duplicar. Sin esto, dos
corridas del script dejarían el catálogo repetido y —peor— arruinarían F5, porque el detector de
republicaciones encontraría duplicados que creamos nosotros mismos. Es la única red de seguridad
que tenemos: el plan gratuito no incluye backups.

---

## 3. Decisiones adicionales que tomó la Fase 1

Estas no estaban en el plan inicial; se tomaron al implementar y conviene conocerlas.

### 3.1 BM25 busca exactamente en el mismo texto que el vector

Todas las propiedades administrativas llevan `indexSearchable: false`, así que la búsqueda léxica
también lee solo `titulo` + `descripcionLimpia`.

**Por qué importa:** la vista comparativa F4 enfrenta α = 0 contra α = 1. Si BM25 pudiera buscar en
`descripcionOriginal`, encontraría coincidencias en el texto de contacto que el vector no ve, y la
comparación dejaría de medir *léxico contra semántica* para medir *qué campo indexó cada uno*. Con
esta decisión la única diferencia entre los dos extremos del deslizador es el método, no los datos.

### 3.2 El título también se normaliza

`titulo` entra al vector, así que pasa por el mismo pipeline, pero **sin el umbral de descarte**:
un título nunca se pierde. `VENDO CALEFACTOR CASI NUEVO BARATO` se almacena como
`Vendo calefactor casi nuevo barato`. No guardamos `tituloOriginal` porque el esquema es cerrado y
la fidelidad de lo que publicó el vendedor ya está en `descripcionOriginal`.

### 3.3 `codigo` con `tokenization: 'field'`

El código se compara completo. Con la tokenización por palabras, `REU-E001` se partiría en `reu` y
`e001`, y el filtro por clave natural dejaría de ser exacto.

### 3.4 `fechaPublicacion` es el único campo que se puede omitir

Si la fecha viene mal escrita se registra un aviso y el objeto **se ingesta sin ella**, en lugar de
perder la publicación o inventar un valor. La fecha solo ordena y filtra por antigüedad. Todo lo
demás (`codigo`, `titulo`, descripción útil, `precio`, `categoria`, `ciudad`, `estado`) es
obligatorio: sin ello la publicación se rechaza y aparece en el reporte.

### 3.5 Listas cerradas para `categoria` y `estado`

```
categoria: electrodomesticos | muebles | tecnologia | hogar | deportes | bebe
           herramientas | instrumentos | ropa | vehiculos | mascotas | libros
estado:    nuevo | como nuevo | usado | para repuestos
```

Son **valores de filtro**, no texto libre: si conviven `tecnologia` y `tecnología`, el selector del
frontend muestra dos opciones que parten el catálogo en dos. La ingesta tolera acentos, mayúsculas y
sinónimos razonables (`casi nuevo` → `como nuevo`, `dañado` → `para repuestos`) y **rechaza** lo que
no reconoce, para que el error salga en el reporte y no en la demo.

---

## 4. Lo que resultó ser el clúster (verificado, no asumido)

Estos valores salen de `npm run esquema -- --mostrar`, que lee la configuración **real** que quedó
en la nube, no la que creímos enviar:

| | |
|---|---|
| Versión de Weaviate | 1.40.2 |
| Modelo de embeddings | `Snowflake/snowflake-arctic-embed-l-v2.0` (multilingüe, va bien en español) |
| Métrica de distancia | coseno |
| Índice vectorial | **`hfresh`**, no HNSW |

**El índice merece una nota en el informe.** La descripción habitual —"la base de datos indexa los
vectores con HNSW"— no describe lo que tenemos. El plan gratuito creó un índice `hfresh`, que
guarda los vectores en regiones en disco (*postings*) y mantiene un HNSW pequeño **en memoria sobre
los centroides** de esas regiones para decidir qué regiones leer. Es decir: hay HNSW, pero sobre
centroides, no sobre los vectores de las publicaciones.

Esto toca directamente la tarea 3.3 (caída de recall al aplicar un filtro muy selectivo). El
argumento clásico —"el recorrido del grafo esquiva los nodos descartados y puede quedar
desconectado"— describe HNSW puro. Con `hfresh` el mecanismo es otro, así que **hay que medir el
efecto en vez de citarlo**, que es justo lo que el roadmap pedía. Si el resultado es que no degrada,
eso también es un hallazgo que se reporta.

Si el equipo prefiere HNSW clásico para que el discurso del informe coincida con la literatura, se
fuerza en `esquema.ts` añadiendo `vectorIndexConfig: configure.vectorIndex.hnsw()` al vectorizador y
recreando la colección (`npm run esquema -- --recrear` + `npm run cargar`).

### Distancias observadas en el catálogo de 272 objetos

| Consulta | Primer resultado | Distancia |
|---|---|---|
| "algo para calentar la sala" | `REU-A024` Pistola de calor | 0.592 |
| "mueble para guardar ropa" | `REU-E064` Armario en madera | 0.513 |
| "para trabajar desde la casa" | `REU-E014` Silla ergonómica | 0.768 |
| "iPhone 13 Pro Max 256GB" | `REU-E016` iPhone 13 Pro Max | 0.309 |

Rango completo observado: **0.309 a 0.826**, mediana 0.688. Con coseno, 0 es idéntico y 2 es
opuesto: no es un porcentaje de coincidencia.

#### Aviso importante para la demo: la consulta del calefactor ya no gana limpio

Con 68 objetos, `"algo para calentar la sala"` devolvía el calefactor en primer lugar. Con el
catálogo completo lo desplazó **`REU-A024` "pistola de calor con boquillas"** (0.592 contra 0.696),
y el calefactor cayó al tercer puesto. Se probaron tres redacciones de la consulta y la pistola de
calor gana en todas.

No es un error del pipeline ni de los datos: una pistola de calor *produce calor* y su descripción
lo repite, así que el modelo la acerca a "calentar". Es un vecino semántico legítimo. Conviene
decirlo en la exposición en vez de esconderlo, porque es justamente el tipo de límite que la
búsqueda híbrida con filtros existe para corregir, y porque muestra por qué 3.5 mide Precision@5 en
lugar de dar por hecho que el vector acierta.

Para el momento clave de la demo, la consulta que gana limpio es **`"mueble para guardar ropa"`**:
el armario `REU-E064` sale primero a 0.513, con margen sobre el segundo (0.609), y su título no
contiene la palabra "ropa" ni "guardar" como las usa el comprador. Sigue siendo el contraste exacto
entre léxico y semántica que pide el guion.

### Señal para el umbral de F5, medida sobre los 272 objetos

| Publicación | Su republicación | Vecino genuino más cercano |
|---|---|---|
| `REU-E016` iPhone 13 Pro Max | `REU-E066` a **0.112** | Celular Samsung a 0.451 |
| `REU-E030` Guitarra acústica | `REU-E069` a **0.190** | Guitarra eléctrica a 0.451 |
| `REU-E001` Calefactor | `REU-E061` a **0.271** | Calentador de agua a 0.464 |

Al cuadruplicar el catálogo el margen se estrechó (el vecino genuino pasó de 0.55 a 0.45) pero la
separación se mantiene clara: **las republicaciones no pasan de 0.28 y los artículos distintos no
bajan de 0.45**. Un corte alrededor de 0.35 separaría ambos grupos. Son tres pares, no una
calibración: la medición sobre los 20 pares de `datos/pares-republicados.csv` y el reporte de falsos
positivos es la tarea 3.4 de Alejandro.

### Un filtro deliberadamente selectivo para la tarea 3.3

La distribución de `estado` quedó desbalanceada a propósito, como en un clasificado real:

| estado | publicaciones |
|---|---|
| usado | 195 |
| como nuevo | 73 |
| nuevo | 3 |
| para repuestos | 1 |

Filtrar por `estado = "para repuestos"` deja **1 objeto entre 272**, y `nuevo` deja 3. Es el caso
extremo que la tarea 3.3 necesita para medir qué le pasa al recall cuando el filtro descarta casi
todo el índice.

---

## 5. La clave de solo lectura (roadmap 5.1)

El perfil `nube` del `docker-compose.yml` necesita una API key publicada en el repositorio. No puede
ser la de administrador: cualquiera que clone el repo podría borrar la colección entera, que es
exactamente lo que el informe critica en la sección 4.

Ya está creada y verificada, por API en lugar de a mano en la consola:

```bash
npm run rol-lectura              # crea el rol con permiso de lectura sobre Publicacion
npm run rol-lectura -- --clave   # crea el usuario y emite su API key
npm run rol-lectura -- --rotar   # emite una nueva e invalida la anterior
```

El rol `reusa-solo-lectura` tiene **exactamente dos permisos**, y ninguno más:

| Recurso | Acción |
|---|---|
| colección `Publicacion` | `read_collections` |
| datos de `Publicacion` | `read_data` |

La clave se emitió para el usuario `reusa-lectura-publica`. Que sea inofensiva no se afirma, se
comprueba:

```bash
CLAVE_LECTURA=<la clave> npm run probar-lectura
```

```
1. Leer el conteo ........... OK (272 objetos)
2. Buscar con nearText ...... OK (REU-A024)
3. Insertar un objeto ....... rechazado, correcto
4. Crear una coleccion ...... rechazado, correcto
```

La prueba **no** intenta borrar `Publicacion` a propósito: si el permiso estuviera mal puesto, la
comprobación destruiría el catálogo. Intenta crear una colección aparte, que es igual de
concluyente y no arriesga nada.

Esto es lo que se puede afirmar en el informe: *la clave publicada no puede escribir, ni borrar, ni
crear colecciones; el peor escenario es que alguien ejecute búsquedas contra nuestro clúster*.
Rotarla después de la sustentación con `--rotar`.

---

## 6. El pipeline de limpieza, etapa por etapa

Implementado en `ingesta/src/limpiar.ts` como funciones puras, con 28 pruebas (`npm test`).

| # | Etapa | Qué hace |
|---|---|---|
| 1 | `fragmentos` | Borra **completos** los fragmentos dedicados al contacto. Los emojis se tratan como separador de frase, porque en los clasificados es lo que son |
| 2 | `correos` | Elimina direcciones de correo |
| 3 | `telefonos` | Elimina secuencias de 7+ dígitos, **protegiendo antes los importes** |
| 4 | `emojis` | Elimina pictogramas sueltos |
| 5 | `adornos` | Elimina viñetas, flechas y signos repetidos |
| 6 | `mayusculas` | Si más del 60 % de las letras están en mayúscula, baja todo y recapitaliza |
| 7 | `muletillas` | Recorta relleno de contacto y comercial |
| 8 | `espacios` | Colapsa espacios, saltos y puntuación duplicada |
| 9 | `colas` | Poda palabras funcionales que quedaron colgando |
| — | descarte | Menos de 15 palabras útiles ⇒ la publicación no se ingesta |

Dos detalles que costaron trabajo y valen para el informe:

**Los importes se protegen antes de borrar teléfonos.** Un precio también es una secuencia larga de
dígitos: `1.200.000` tiene siete. Se enmascaran los importes, se borran los teléfonos y se
restauran. En Colombia los celulares no se escriben con punto de miles, así que el formato los
distingue. Sin esto, la limpieza destruiría información de precio escrita en la descripción.

**El contacto se borra por bloques, no palabra por palabra.** Recortando término a término,
`CONTACTO SOLO POR WHATSAPP AL 300 000 0000 ⬇️ NO CONTESTO MENSAJES DE CURIOSOS` dejaba el residuo
`CONTACTO SOLO POR AL DE CURIOSOS` pegado a la descripción: ruido que además *parece* texto. Ahora
el fragmento entero se elimina cuando contiene un marcador de contacto y tiene 10 palabras útiles o
menos; si es más largo se limpia por reglas, para no perder descripción de verdad.

---

## 7. Cómo se reproduce todo

```bash
cd ingesta
npm install
npm test                      # 28 pruebas del pipeline, sin red
npm run verificar             # conexión, versión y módulos del clúster
npm run esquema               # crea la colección (no la toca si ya existe)
npm run esquema -- --mostrar  # imprime la configuración REAL que hay en la nube
npm run cargar -- --seco      # normaliza y escribe el reporte SIN gastar cuota
npm run cargar                # ingesta real: ~1 embedding por objeto
npm run consultar             # conteo + nearText de control con distancias
npm run consultar -- --similares=REU-E001   # ensayo del detector de republicaciones
```

Variables de entorno (en `.env` de la raíz, nunca versionado): `WEAVIATE_URL`,
`WEAVIATE_API_KEY`. La plantilla está en `.env.example`.

---

## 8. Datos de semilla

- `datos/semilla.csv` — **280 publicaciones**, 70 por integrante:
  `REU-E###` (Edwar), `REU-J###` (Johnatan), `REU-A###` (Alejandro), `REU-D###` (David).
  Cubren las 12 categorías, 8 ciudades y los 4 estados. Tras la limpieza quedan **272 ingestadas**
  y 8 descartadas por no conservar contenido útil.
- `datos/pares-republicados.csv` — verdad de referencia para F5: **10 pares republicados** (mismo
  artículo, texto reescrito) y **10 pares de control** (artículos distintos de la misma categoría).
  Es lo que Alejandro necesita en 3.4 para calibrar el umbral en vez de elegirlo a ojo.

Los datos los escribimos nosotros, inspirados en clasificados reales pero **sin copiarlos** y **sin
datos personales**: los teléfonos son ficticios del tipo `300 000 0000` y los correos usan el
dominio inexistente `correo-falso.com`.

### Para quien añada publicaciones al CSV

1. Respeta las listas cerradas de `categoria` y `estado` (sección 3.5).
2. El `codigo` es único en todo el archivo: dos filas con el mismo código generan el mismo UUID y
   una sobreescribiría a la otra en silencio. La ingesta lo detecta y rechaza la segunda.
3. **Escribe con ruido realista.** Si los datos salen limpios, el proyecto pierde su mejor
   argumento. El precio puede venir como `$ 450.000`, `450000` o `450 mil`, y la fecha como
   `2025-09-14` o `14/09/2025`: la ingesta lo normaliza.
4. Antes de subir tu tanda, corre `npm run cargar -- --seco` y revisa que no te hayan rechazado
   filas.

---

## 9. Compartir las credenciales con el equipo

El criterio de aceptación de la Fase 1 pide que las credenciales reales viajen **solo por el canal
privado del grupo**, nunca por el repositorio ni por un chat compartido con terceros.

Hay dos claves y no se usan para lo mismo:

| Clave | Para qué | Quién la necesita | ¿Va al repo? |
|---|---|---|---|
| Admin (`ingesta-admin-edwar`) | Crear el esquema e ingestar | Solo quien corre `/ingesta` | **Nunca** |
| Solo lectura (`reusa-lectura-publica`) | Buscar desde la API | Todo el equipo, y el `docker-compose.yml` | Sí, a propósito |

Para desarrollar, a Johnatan, Alejandro y David les basta la **clave de solo lectura**: `/api` solo
hace consultas. Mensaje sugerido para el grupo:

> Clúster listo con 272 publicaciones cargadas.
> `WEAVIATE_URL` → (la URL REST del clúster)
> `WEAVIATE_API_KEY` → (la clave de solo lectura)
> Va en un `.env` en la raíz del repo, que ya está en `.gitignore`. No lo suban.
> Si alguien necesita reingestar datos, me pide la clave de admin aparte.

La clave de admin pasó por un chat durante el desarrollo, así que **hay que rotarla**: en la consola,
crear una nueva con rol `admin`, actualizar el `.env` local y eliminar la anterior.

---

## 10. Guion de la intervención sobre datos (60 s del minuto 4 de la demo)

El guion general reserva un minuto a "por qué funciona": el pipeline de limpieza con el antes y el
después de una descripción real y la cifra de ruido eliminado. Material listo:

**Lo que se muestra en pantalla** (está en `ingesta/reportes/limpieza.md`):

```
ORIGINAL     VENDO CALEFACTOR ELECTRICO CASI NUEVO!!! 🔥🔥 DOS NIVELES DE CALOR Y
             TERMOSTATO REGULABLE, LO USE UN SOLO INVIERNO Y QUEDO COMO NUEVO, NO
             HUMEA NI HUELE A QUEMADO. ESCRIBIR AL WPP 300 000 0000, SOLO
             INTERESADOS!!! ★★★ GRACIAS POR LEER

VECTORIZADO  Vendo calefactor electrico casi nuevo dos niveles de calor y termostato
             regulable, lo use un solo invierno y quedo como nuevo, no humea ni
             huele a quemado.
```

**Lo que se dice**, en cuatro frases:

1. "El 26 % de nuestras publicaciones traía el teléfono metido en la descripción y un tercio estaba
   en mayúscula sostenida."
2. "Si ese texto entra al modelo, el vector no representa el artículo: representa el estilo del
   vendedor. Todas las que dicen *escribir al wpp* se parecen entre sí, aunque una sea una nevera y
   la otra una guitarra."
3. "Por eso vectorizamos una versión limpia y le mostramos al usuario la original. En este ejemplo
   se eliminó el 34 % del texto sin perder un solo dato del artículo."
4. "En las 134 descripciones que traían ruido, la limpieza quitó el 17 % del texto en promedio, y 8
   publicaciones quedaron sin contenido útil y no se ingestaron."

**Si preguntan por qué no se borra el contacto palabra por palabra:** porque deja residuos que
parecen texto (`CONTACTO SOLO POR AL DE CURIOSOS`) y el embedding los toma como contenido. Se
elimina el fragmento completo.

**Si preguntan por el índice:** no es HNSW puro, es `hfresh`; hay HNSW, pero sobre los centroides de
regiones en disco (sección 4).
