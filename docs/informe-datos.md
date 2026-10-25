# Modelo de datos y calidad de datos

**Proyecto "Reusa" — buscador semántico de artículos de segunda mano**
Sección del informe a cargo de Edwar · Fase 1 del plan de trabajo

---

## 1. El problema de datos

En un clasificado local, quien publica escribe mal y quien busca no sabe cómo se llama lo que
necesita. Un vendedor titula *"VENDO CALEFACTOR CASI NUEVO BARATO ESCRIBIR WPP"*; un comprador
busca *"algo para calentar la sala"*. No comparten una sola palabra: un buscador por coincidencia
léxica devuelve cero resultados y la plataforma pierde la venta.

Una base de datos vectorial cierra esa brecha porque indexa el *significado* del texto. Pero esa
promesa depende por completo de **qué texto se indexa**, y ahí es donde el dominio se pone difícil:
las publicaciones reales vienen en mayúscula sostenida, con emojis, con el número de teléfono
repetido tres veces y con frases que no describen nada ("SOLO INTERESADOS", "NO CAMBIOS",
"GRACIAS POR LEER").

Medimos cuánto ruido traía nuestro corpus de 280 publicaciones:

| Ruido presente en el texto original | Publicaciones | % |
|---|---|---|
| Emojis o pictogramas | 130 | 46 % |
| Muletillas de contacto o relleno comercial | 99 | 35 % |
| Mayúscula sostenida (más del 60 % del texto) | 92 | 33 % |
| Teléfono embebido en la descripción | 73 | 26 % |
| Adornos y signos repetidos | 29 | 10 % |
| Correo electrónico | 4 | 1 % |

Si ese texto entra al modelo de embeddings, el vector resultante representa mayoritariamente
información de contacto. La consecuencia es concreta y medible: **todas las publicaciones que dicen
"ESCRIBIR AL WPP" se parecen entre sí**, aunque una sea una nevera y la otra una guitarra. El
buscador deja de ordenar por significado del artículo y pasa a ordenar por estilo de redacción del
vendedor.

---

## 2. El modelo de datos

El plan gratuito de Weaviate Cloud permite **una sola colección**. Esto no es un detalle
administrativo: obliga a un diseño distinto del relacional. No existen `Vendedor`, `Categoria` y
`Publicacion` como entidades separadas con llaves foráneas entre ellas; todo vive **denormalizado**
en un único objeto.

Colección `Publicacion`, diez propiedades:

| Propiedad | Tipo | ¿Entra al vector? | ¿Búsqueda léxica? | ¿Filtrable? |
|---|---|---|---|---|
| `titulo` | text | **sí** | **sí** | no |
| `descripcionLimpia` | text | **sí** | **sí** | no |
| `descripcionOriginal` | text | no | no | no |
| `categoria` | text | no | no | sí |
| `precio` | number | no | — | sí, con rangos |
| `ciudad` | text | no | no | sí |
| `estado` | text | no | no | sí |
| `fechaPublicacion` | date | no | — | sí, con rangos |
| `codigo` | text | no | no | sí (clave natural) |
| `imagenUrl` | text | no | no | no |

### 2.1 Al vector solo entran el título y la descripción limpia

El vectorizador se declara con `sourceProperties: ['titulo', 'descripcionLimpia']`.

Meter `precio` o `ciudad` en el texto vectorizado haría que dos artículos de $500.000 en Tunja se
parezcan entre sí aunque uno sea una nevera y el otro una guitarra. El embedding debe representar
**qué es el artículo**; sus atributos administrativos van como propiedades filtrables, que es
exactamente para lo que sirven y lo que permite combinar búsqueda semántica con filtros exactos.

### 2.2 El precio es numérico, nunca texto

Si `"$ 450.000"` se ingestara como cadena, los filtros por rango no funcionarían y el orden sería
alfabético: `"1.000.000"` quedaría antes que `"90.000"`. La normalización a entero ocurre en la
ingesta. El corpus llegó con siete formatos distintos escritos por cuatro personas
(`$ 120.000`, `450000`, `$280,000`, `80 mil`, `$1'200.000`, `2.5 millones`, `350.000`) y todos se
canonizan al mismo entero en pesos.

### 2.3 La descripción limpia es derivada; la original se conserva

Es la decisión central del trabajo. Vectorizamos una versión normalizada del texto y al usuario le
mostramos la que escribió el vendedor. Así la búsqueda opera sobre significado mientras la interfaz
conserva la fidelidad del anuncio original.

### 2.4 Un objeto es una publicación, sin fragmentación

Las descripciones son cortas y caben de sobra en la ventana del modelo. Si indexáramos catálogos
largos habría que partirlos en fragmentos con solape, porque un vector promedio de ochenta páginas
no representa nada en particular. Queda declarado como trabajo futuro.

### 2.5 Identificador determinístico

El UUID de cada objeto se deriva del `codigo` con UUID v5. Reejecutar la ingesta **actualiza** los
objetos en lugar de duplicarlos. Es la única red de seguridad disponible, porque el plan gratuito no
incluye copias de respaldo; y es imprescindible para la funcionalidad de detección de
republicaciones, que de lo contrario encontraría duplicados creados por nosotros mismos.

---

## 3. El pipeline de limpieza

Nueve etapas sobre el texto original, implementadas como funciones puras y cubiertas por 28 pruebas
automáticas que corren sin conexión a la base de datos.

| # | Etapa | Qué hace |
|---|---|---|
| 1 | fragmentos | Elimina **completos** los fragmentos dedicados al contacto |
| 2 | correos | Elimina direcciones de correo |
| 3 | teléfonos | Elimina secuencias de 7 o más dígitos |
| 4 | emojis | Elimina pictogramas sueltos |
| 5 | adornos | Elimina viñetas, flechas y signos repetidos |
| 6 | mayúsculas | Si más del 60 % de las letras son mayúsculas, baja todo y recapitaliza |
| 7 | muletillas | Recorta relleno de contacto y comercial |
| 8 | espacios | Colapsa espacios, saltos y puntuación duplicada |
| 9 | colas | Poda palabras funcionales que quedaron sin su frase |
| — | descarte | Si quedan menos de 15 palabras útiles, la publicación no se ingesta |

Tres problemas concretos que aparecieron al aplicarlo a datos reales, y cómo se resolvieron:

**Los importes se destruían junto con los teléfonos.** Un precio también es una secuencia larga de
dígitos: `1.200.000` tiene siete. La regla que borraba teléfonos se llevaba por delante la
información de precio escrita dentro de la descripción. La solución fue enmascarar los importes
antes de borrar teléfonos y restaurarlos después. El formato los distingue de forma fiable: en
Colombia los celulares no se escriben con separador de miles.

**Recortar palabra por palabra dejaba residuos que parecían texto.** Al eliminar término a término,
`CONTACTO SOLO POR WHATSAPP AL 300 000 0000 NO CONTESTO MENSAJES DE CURIOSOS` dejaba pegado a la
descripción el fragmento `CONTACTO SOLO POR AL DE CURIOSOS`: ruido que además *aparentaba* ser
contenido. Ahora el fragmento se elimina entero cuando contiene un marcador de contacto y tiene diez
palabras útiles o menos; si es más largo se limpia por reglas, para no perder descripción legítima.

**Los emojis no decoran: separan.** En este dominio cumplen la función de un punto seguido
(`... porque viajo ⬇️⬇️ CONTACTO SOLO POR WHATSAPP ...`). Tratarlos como simple basura a eliminar
dejaba el bloque de contacto fundido con la descripción en un solo fragmento largo, que entonces no
se podía eliminar completo. Convertirlos en separador antes de fragmentar resolvió esa familia
entera de casos.

### Resultados de la limpieza

| Métrica | Valor |
|---|---|
| Filas leídas | 280 |
| Publicaciones ingestadas | 272 |
| Descartadas por quedar sin contenido útil | 8 |
| Descripciones con ruido eliminable | 134 |
| En ellas: caracteres eliminados en promedio | 38 |
| En ellas: reducción promedio del texto vectorizado | 17 % |
| Caracteres totales eliminados | 5.143 de 55.554 |

Un ejemplo del antes y el después:

> **Original:** `VENDO CALEFACTOR ELECTRICO CASI NUEVO!!! 🔥🔥 DOS NIVELES DE CALOR Y TERMOSTATO`
> `REGULABLE, LO USE UN SOLO INVIERNO Y QUEDO COMO NUEVO, NO HUMEA NI HUELE A QUEMADO. ESCRIBIR AL`
> `WPP 300 000 0000, SOLO INTERESADOS!!! ★★★ GRACIAS POR LEER`
>
> **Lo que se vectoriza:** `Vendo calefactor electrico casi nuevo dos niveles de calor y termostato`
> `regulable, lo use un solo invierno y quedo como nuevo, no humea ni huele a quemado.`

Se eliminó el 34 % del texto y no se perdió ni un dato sobre el artículo.

---

## 4. Verificación sobre el clúster

La configuración se leyó de vuelta desde la nube en lugar de darla por hecha:

| | |
|---|---|
| Versión de Weaviate | 1.40.2 |
| Modelo de embeddings | `Snowflake/snowflake-arctic-embed-l-v2.0` (multilingüe) |
| Métrica de distancia | coseno |
| Índice vectorial | `hfresh` |
| Objetos en la colección | 272 |

**Sobre el índice:** la descripción habitual de una base vectorial dice que los vectores se indexan
con HNSW. En este clúster no es exactamente así. El plan gratuito creó un índice `hfresh`, que
almacena los vectores en regiones en disco y mantiene un HNSW pequeño **en memoria sobre los
centroides** de esas regiones para decidir qué regiones leer. Hay HNSW, pero sobre centroides, no
sobre los vectores de las publicaciones. Lo señalamos porque cambia el razonamiento esperado sobre
la degradación del recall al aplicar filtros muy selectivos: con este índice el mecanismo es
distinto y por eso el efecto se mide en vez de citarse.

### Comportamiento de la búsqueda semántica

| Consulta en lenguaje natural | Primer resultado | Distancia |
|---|---|---|
| "mueble para guardar ropa" | Armario en madera con entrepaños | 0.513 |
| "iPhone 13 Pro Max 256GB" | iPhone 13 Pro Max 256GB | 0.309 |
| "para trabajar desde la casa" | Silla ergonómica de oficina | 0.768 |

Con distancia coseno, 0 es idéntico y 2 es opuesto. **No es un porcentaje de coincidencia** y
presentarlo como tal sería incorrecto.

El caso `"mueble para guardar ropa"` ilustra el objetivo del proyecto: el primer resultado es un
armario cuyo título no contiene las palabras que usó el comprador. Un buscador léxico no lo habría
encontrado.

### Un límite que encontramos y conviene declarar

Con 68 objetos, la consulta `"algo para calentar la sala"` devolvía el calefactor en primer lugar.
Al ampliar el catálogo a 272, lo desplazó una **pistola de calor** (0.592 contra 0.696). No es un
fallo del pipeline: una pistola de calor produce calor y su descripción lo repite, de modo que el
modelo la acerca legítimamente a "calentar". El embedding captura el concepto de *calor*, pero no
distingue *calefacción de ambiente* de *herramienta que calienta*.

Es precisamente el tipo de caso que justifica la búsqueda híbrida y el filtrado por categoría, y la
razón por la que la evaluación del sistema mide Precision@5 en lugar de suponer que el vector
siempre acierta.

---

## 5. Seguridad de las credenciales

El navegador nunca habla directamente con Weaviate: si el frontend usara el cliente de la base de
datos, la clave de administrador quedaría incrustada en el bundle de JavaScript y sería visible con
*ver código fuente*. El servidor Express actúa como intermediario y guarda la clave fuera del
control de versiones.

Para que el proyecto se pueda ejecutar con un solo comando hace falta, aun así, una clave publicada
en el repositorio. Esa clave **no es la de administrador**. Se creó un rol con exactamente dos
permisos —leer la configuración de la colección `Publicacion` y leer sus datos— y se emitió una API
key ligada a ese rol.

Que sea inofensiva no se afirma, se comprueba con una prueba automatizada:

```
1. Leer el conteo ........... OK (272 objetos)
2. Buscar con nearText ...... OK
3. Insertar un objeto ....... rechazado, correcto
4. Crear una colección ...... rechazado, correcto
```

La clave publicada no puede escribir, ni borrar, ni crear colecciones. El peor escenario es que
alguien ejecute búsquedas contra el clúster. Se rota después de la sustentación.

---

## 6. Sobre el origen de los datos

Las 280 publicaciones las redactó el equipo, inspiradas en clasificados reales pero **sin copiarlos**
y **sin datos personales**. Los teléfonos son ficticios del tipo `300 000 0000` y los correos usan un
dominio inexistente. Esto evita problemas con los términos de uso de los sitios de clasificados y
con el tratamiento de datos personales, y permite además controlar deliberadamente la cantidad y el
tipo de ruido, que es el objeto de estudio de esta sección.
