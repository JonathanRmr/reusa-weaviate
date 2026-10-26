# Motor de búsqueda y evaluación

**Proyecto "Reusa" — buscador semántico de artículos de segunda mano**
Sección del informe a cargo de Alejandro Huerfano · Fase 3 del plan de trabajo

Mediciones tomadas el 25 de octubre de 2026 sobre el clúster de Weaviate Cloud (versión 1.40.2,
modelo `Snowflake/snowflake-arctic-embed-l-v2.0`, distancia coseno, índice `hfresh`) con las 272
publicaciones ingestadas. Todas las cifras se reproducen con los comandos de la sección 6.

---

## 1. Qué hace el motor

El motor tiene dos funciones, que son las que la API expone:

- **`buscar(params)`** responde a `/api/buscar`: una consulta en lenguaje natural, un `alpha` y
  filtros opcionales de categoría, ciudad, estado y rango de precio.
- **`similares(codigo)`** responde a `/api/similares/:codigo`: las publicaciones más parecidas a
  una dada, con la marca de posible republicación (sección 3).

### Tres operadores según la posición del deslizador

| `alpha` | Operador de Weaviate | Métrica que devuelve | Qué significa |
|---|---|---|---|
| 0 | `bm25` | `score` | Puntaje léxico BM25. No está acotado: 20.7 en una coincidencia casi literal, 2.4 en una floja |
| entre 0 y 1 | `hybrid` | `score` | Fusión de los dos rankings, normalizada **dentro de cada respuesta** a [0, 1] |
| 1 | `nearText` | `distance` | Distancia coseno entre la consulta y la publicación |

En los extremos no usamos `hybrid` con `alpha` 0 o 1, aunque produciría el mismo orden, por dos
razones:

1. **La métrica.** El híbrido normaliza los puntajes dentro de cada respuesta, así que su primer
   resultado siempre vale cerca de 1, aunque no se parezca a nada. La distancia de `nearText` es
   absoluta: permite decir "lo más parecido está a 0.99, es decir, no hay nada parecido".
2. **La cuota.** `bm25` no vectoriza la consulta. El extremo léxico del deslizador y la columna
   izquierda de la vista comparativa no gastan ninguna de las 2.000 peticiones diarias de embeddings
   del plan gratuito.

La respuesta de la API incluye el campo `modo` (`bm25`, `hybrid` o `vector`) para que la interfaz
muestre la métrica con su nombre correcto. `score` y `distance` **no son comparables entre sí**, y
ninguna de las dos es un porcentaje de coincidencia. Con coseno, 0 es idéntico y 2 es opuesto; en
la evaluación de la sección 2, los resultados relevantes del top 5 aparecieron entre 0.31 y 0.83. Weaviate no devuelve
distancia para el resultado fusionado del híbrido (lo comprobamos: vino vacía en 200 de 200
resultados), así que en ese modo `distance` viaja en `null`.

### Filtros

Los filtros se aplican dentro de la búsqueda, no después, y se combinan con un Y lógico. El motor
lleva cada valor a la forma en que se ingestó (`"Bogotá"` → `"Bogota"`, `"Tecnología"` →
`"tecnologia"`), porque la ciudad y la categoría se guardaron sin tildes para que sirvan como clave
de filtrado. La sección 4 muestra por qué ambas cosas hicieron falta.

---

## 2. Cuánto pesa cada lado: Precision@5 por `alpha`

### Método

**Consultas.** Diez, en dos grupos:

| # | Consulta | Grupo | Relevantes en el catálogo | Criterio de relevancia |
|---|---|---|---|---|
| 1 | algo para calentar la sala | necesidad | 3 | Aparato cuya función es calentar un espacio de la casa |
| 2 | mueble para guardar ropa | necesidad | 5 | Mueble cuya función declarada incluye guardar o colgar ropa |
| 3 | para trabajar desde la casa | necesidad | 25 | Equipo o mobiliario de oficina remota |
| 4 | algo para hacer ejercicio en la casa | necesidad | 7 | Equipo de entrenamiento que se usa dentro de la vivienda |
| 5 | donde pongo a dormir al bebe | necesidad | 3 | Mueble o equipo en el que el bebé duerme |
| 6 | algo para refrescar la habitacion cuando hace calor | necesidad | 4 | Aparato que enfría o ventila un espacio |
| 7 | quiero aprender a tocar un instrumento | necesidad | 13 | Instrumento musical que se toca sin accesorios aparte |
| 8 | algo para mantener fria la comida | necesidad | 5 | Aparato de refrigeración de alimentos |
| 9 | iPhone 13 Pro Max 256GB | referencia exacta | 2 | Exactamente ese modelo |
| 10 | botas talla 39 | referencia exacta | 1 | Botas en talla 39 |

**Juicio de relevancia.** Para cada consulta se leyeron las 272 publicaciones y se fijó la lista
completa de relevantes **antes de ejecutar ninguna búsqueda**, con el criterio escrito de la tabla.
Así el juicio no se acomoda a lo que devuelva un `alpha` en particular. Lo que no está en la lista
cuenta como no relevante, también si aparece en el top 5. Los casos discutibles quedaron anotados
junto al juicio; por ejemplo, la pistola de calor no cuenta para "calentar la sala", porque es una
herramienta para despegar vinilos.

**Métricas.**
- **Precision@5**: fracción de los cinco primeros resultados que es relevante. Es lo que ve el
  usuario en la primera fila de la interfaz.
- **Techo**: el máximo Precision@5 posible para esa consulta. Con 3 relevantes en todo el catálogo,
  ni un buscador perfecto pasa de 0.6. Sin el techo, la tabla castigaría a la consulta y no al
  método.
- **MRR** (*mean reciprocal rank*): 1 dividido por la posición del primer relevante. Distingue
  "lo puso primero" de "lo puso quinto", algo que Precision@5 no ve cuando hay uno o dos relevantes.

**Puntos medidos.** `alpha` = 0, 0.25, 0.5, 0.65, 0.75 y 1: los tres que pedía el plan, el valor
por defecto que traía la API (0.65) y sus vecinos. Cada búsqueda pasa por la misma función que
atiende a la interfaz, con el mismo `limit` de 12.

### Resultados

| α | Operador | Precision@5 | P@5 / techo | P@5 necesidad | P@5 exacta | MRR | MRR necesidad | MRR exacta |
|---|---|---|---|---|---|---|---|---|
| 0 | bm25 | 0.18 | 0.33 | 0.15 | 0.30 | 0.45 | 0.31 | 1.00 |
| 0.25 | hybrid | 0.24 | 0.39 | 0.23 | 0.30 | 0.55 | 0.43 | 1.00 |
| 0.5 | hybrid | 0.30 | 0.45 | 0.30 | 0.30 | 0.64 | 0.55 | 1.00 |
| 0.65 | hybrid | 0.32 | 0.47 | 0.33 | 0.30 | 0.71 | 0.64 | 1.00 |
| 0.75 | hybrid | 0.36 | 0.53 | 0.38 | 0.30 | 0.72 | 0.65 | 1.00 |
| **1** | **vector** | **0.42** | **0.60** | **0.45** | 0.30 | **0.73** | **0.67** | 1.00 |

Precision@5 de cada consulta:

| Consulta | Techo | α=0 | α=0.25 | α=0.5 | α=0.65 | α=0.75 | α=1 |
|---|---|---|---|---|---|---|---|
| algo para calentar la sala | 0.6 | 0.0 | 0.0 | 0.0 | 0.0 | 0.2 | **0.4** |
| mueble para guardar ropa | 1.0 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |
| para trabajar desde la casa | 1.0 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 |
| algo para hacer ejercicio en la casa | 1.0 | 0.0 | 0.4 | 0.4 | 0.4 | 0.4 | **0.6** |
| donde pongo a dormir al bebe | 0.6 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |
| algo para refrescar la habitacion cuando hace calor | 0.8 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| quiero aprender a tocar un instrumento | 1.0 | 0.2 | 0.4 | 0.6 | 0.6 | 0.8 | **1.0** |
| algo para mantener fria la comida | 1.0 | 0.0 | 0.0 | 0.4 | 0.6 | 0.6 | 0.6 |
| iPhone 13 Pro Max 256GB | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 | 0.4 |
| botas talla 39 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 |

El top 5 de cada una de las 60 corridas, con cada resultado marcado como relevante o no, está en
`api/evaluacion/resultados/precision.md`.

### Lo que muestran los datos

**1. Precision@5 crece con `alpha` y el vector puro no pierde en ninguna consulta.** De 0.18 con
palabras exactas a 0.42 con significado. En ninguna de las diez consultas un `alpha` menor obtuvo
más Precision@5 que `alpha` = 1.

**2. En una consulta por necesidad, BM25 encuentra las palabras del contexto, no las del
producto.** Quien busca "algo para calentar la sala" escribe *sala*, y BM25 pone primero una
*alfombra grande para sala*. "Para trabajar desde la casa" sube una *casa para perro*. El caso más
claro es "algo para mantener fria la comida": BM25 devuelve un dispensador de agua fría, una cobija
térmica, un juego de sábanas, un abrigo de invierno y una jaula para aves. La cobija y las sábanas
aparecen porque su descripción dice que se lavan *en agua fría*; el abrigo, porque se compró para
*tierra fría*. Cada punto de `alpha` que se le
quita al vector le devuelve peso a esas coincidencias. Con el valor que traía la API (0.65), la
consulta de la demo, "algo para calentar la sala", no tenía **ningún** resultado relevante en el
top 5.

**3. Las consultas de referencia exacta no le dieron ventaja a BM25.** Esperábamos que en
"iPhone 13 Pro Max 256GB" ganaran las palabras exactas. No fue así: los seis valores de `alpha`
encuentran las dos publicaciones del iPhone en los dos primeros puestos. El vector las ubica a 0.309
y 0.343, y el siguiente celular a 0.779. En "botas talla 39" pasa lo mismo: las botas talla 39 están
a 0.41 y las talla 42 a 0.567. Creemos que el motivo es el tamaño del catálogo: con 272 publicaciones
no hay modelos casi idénticos que el vector pueda confundir, y el modelo de embeddings es sensible a
fragmentos literales como "13 Pro Max". Lo reportamos como resultado y no lo maquillamos cambiando
las consultas después de ver los números.

**4. El vector también falla, y sus fallos son instructivos.**
- "algo para refrescar la habitacion cuando hace calor" obtiene **0 en todos los `alpha`**. El vector
  devuelve una pistola de calor, un humidificador y un calefactor. El embedding captura el *tema*
  (temperatura), pero no la *dirección* (enfriar o calentar).
- En "algo para calentar la sala" pasa lo inverso, aunque más leve: la pistola de calor y una
  plancha para el cabello quedan antes que los dos calefactores, que ocupan los puestos 3 y 4.
- En "mueble para guardar ropa" el armario sale primero con cualquier `alpha`, pero el closet de dos
  puertas, que es el mismo mueble republicado, no entra en el top 5. Su texto habla de *tubo para
  colgar* y nunca dice *ropa*.

### Conclusión: `alpha` = 1 por defecto

La API trae ahora **`alpha` = 1** por defecto, en lugar de 0.65. Es el punto con mejor Precision@5
(0.42), mejor Precision@5 relativa al techo (0.60) y mejor MRR (0.73), y no pierde en ninguna
consulta, ni siquiera en las de referencia exacta.

Lo que esta medición **no** demuestra, y lo dejamos dicho:

- Son diez consultas sobre 272 publicaciones. La ventaja de 1 sobre 0.75 se apoya en tres consultas.
  La tendencia es consistente, pero no es una prueba estadística.
- En un catálogo con decenas de celulares casi iguales (iPhone 13, 13 Pro, 14…), el lado léxico
  probablemente recuperaría valor. Por eso el deslizador se mantiene: el usuario que escribe un
  modelo exacto puede moverlo a la izquierda, y la vista comparativa sigue mostrando los dos
  extremos.
- El lado léxico tiene margen de mejora que no exploramos: BM25 usa la lista de palabras vacías del
  inglés y en español cuenta "para", "la" o "en". Configurar palabras vacías en español o dar más
  peso al título son trabajo futuro, y habría que volver a medir después.

---

## 3. Detector de republicaciones (F5)

### Cómo funciona

Al abrir una publicación, el motor la busca por su código y ejecuta `nearObject` con su UUID. Esa
operación usa el vector ya guardado de la publicación, así que **el detector no gasta cuota de
embeddings**. El propio objeto, que siempre sale primero a distancia 0, se descarta por UUID y no
por distancia, porque una republicación idéntica también estaría a 0. A cada vecino se le asigna
`posibleDuplicado` con la regla de esta sección. La interfaz solo pinta la insignia; la decisión la
toma el backend.

### Primer intento: el corte de los 20 pares de referencia

El plan pedía calibrar el umbral con 10 pares republicados (el mismo artículo con el texto
reescrito) y 10 pares de control (artículos distintos de la misma categoría), y elegir el corte que
separa ambos grupos.

| Pares republicados | Distancia | | Pares de control | Distancia |
|---|---|---|---|---|
| Moto 125 2019 | 0.095 | | Escritorio / comedor | 0.439 |
| Taladro percutor | 0.099 | | Microondas / licuadora | 0.525 |
| iPhone 13 Pro Max | 0.112 | | Pulidora / caja de herramientas | 0.575 |
| Portátil Lenovo i5 | 0.137 | | Alfombra / cortinas | 0.591 |
| Nevera 92 litros | 0.143 | | Cama doble / biblioteca | 0.645 |
| Bicicleta rin 29 | 0.160 | | Teclado mecánico / televisor | 0.651 |
| Sofá tres puestos | 0.181 | | Caminadora / mancuernas | 0.652 |
| Guitarra de nylon | 0.190 | | Guacal / acuario | 0.655 |
| Closet / armario | 0.249 | | Monitor / impresora | 0.687 |
| Calefactor | 0.271 | | Lavadora / estufa | 0.709 |

Los grupos no se tocan: las republicaciones llegan hasta 0.271 y los controles empiezan en 0.439. El
punto medio del hueco, **0.355**, separa los 20 pares sin un solo error. En las diez republicaciones,
`/api/similares` pone a la copia en el **primer puesto**.

### El catálogo completo desmiente ese corte

Los controles eran demasiado fáciles: una lavadora contra una estufa nunca iba a confundirse. El
vecino que de verdad pone a prueba el umbral es **otro artículo del mismo tipo**, y ese no aparece
en una lista elegida a mano. Calculamos la distancia entre todos los pares del catálogo: 36.856 pares,
de los cuales 36.846 son de artículos distintos.

- El par distinto más cercano está a **0.157**: dos consolas de videojuegos de dos vendedores, una
  con dos mandos en Bogotá y otra con cuatro mandos en Medellín. Está más cerca que la mitad de las
  republicaciones reales.
- Con el corte de 0.355, **36 pares distintos** recibirían la insignia, y **59 de las 272
  publicaciones** (el 22 %) mostrarían al menos una acusación falsa de republicación.

Revisamos a mano todos los pares distintos por debajo de 0.32, y ninguno es una republicación:

| Distancia | Publicación A | Publicación B |
|---|---|---|
| 0.157 | Consola de videojuegos con 4 mandos · Medellín · $1.250.000 | Consola de videojuegos con dos mandos · Bogotá · $950.000 |
| 0.225 | Colchón sencillo ortopédico · Cali · $280.000 | Colchón doble ortopédico · Bogotá · $680.000 |
| 0.234 | Acuario 60 litros con filtro · Cali · $200.000 | Acuario plantado 100 litros · Bogotá · $780.000 |
| 0.251 | Cama nido con cajones · Bogotá · $520.000 | Base cama sencilla con cajones · Tunja · $280.000 |
| 0.252 | Mesa de comedor 4 sillas · Cali · $400.000 | Juego de comedor 6 puestos · Medellín · $750.000 |
| 0.255 | Cómics y novelas gráficas · Medellín · $200.000 | Saga completa de novelas · Bogotá · $220.000 |
| 0.273 | Teclado musical 61 teclas · Bogotá · $310.000 | Piano digital 88 teclas · Bogotá · $1.600.000 |
| 0.277 | Licuadora industrial · Bucaramanga · $290.000 | Licuadora de vaso de vidrio · Tunja · $65.000 |
| 0.288 | Ventilador de techo · Villavicencio · $160.000 | Ventilador de torre · Cali · $140.000 |
| 0.288 | Estufa industrial 2 puestos · Bogotá · $420.000 | Estufa eléctrica portátil 2 puestos · Sogamoso · $75.000 |
| 0.289 | Lavadora secadora · Bogotá · $1.450.000 | Secadora de ropa · Bogotá · $890.000 |
| 0.291 | Portátil Lenovo i5 · Bogotá · $1.450.000 | Portátil HP · Tunja · $1.100.000 |
| 0.293 | Estufa de leña · Duitama · $450.000 | Estufa industrial · Bogotá · $420.000 |
| 0.295 | Portátil Lenovo · Bogotá · $1.400.000 | Portátil HP · Tunja · $1.100.000 |
| 0.297 | Casco de ciclismo · Bogotá · $85.000 | Casco para moto · Bogotá · $260.000 |
| 0.302 | Microondas 20 litros · Bogotá · $150.000 | Microondas 34 litros · Medellín · $280.000 |
| 0.304 | Mouse inalámbrico · Tunja · $70.000 | Teclado y mouse inalámbricos · Bogotá · $80.000 |
| 0.313 | Silla para carro de bebé · Cali · $150.000 | Asiento elevador · Villavicencio · $80.000 |
| 0.315 | Cama doble con base cama · Bogotá · $620.000 | Colchón doble ortopédico · Bogotá · $680.000 |

La causa es una decisión de diseño que tomamos a propósito: al vector solo entran el título y la
descripción, para que el embedding represente **qué es el artículo**. Por eso dos consolas quedan
casi en el mismo punto. Para el vector, "la misma publicación subida otra vez" y "otro artículo del
mismo tipo" son casi lo mismo.

### La regla: distancia, ciudad y precio

La tabla anterior sugiere la solución. Quien republica sigue viviendo en la misma ciudad y no cambia
mucho el precio. Las diez republicaciones conservan la ciudad y su precio difiere menos de un 7 %.
Los pares distintos casi siempre cambian de ciudad, de precio o de ambos. Ciudad y precio son
justamente los atributos que dejamos **fuera** del vector, de modo que aportan evidencia
independiente de la que ya da la distancia.

**Regla vigente:** una publicación vecina se marca como posible republicación si

1. su distancia es **menor que 0.29**,
2. está en la **misma ciudad**, y
3. su precio está **dentro de ±20 %** (el más barato vale al menos el 80 % del otro).

| Regla | Corte | Republicaciones detectadas | Pares distintos marcados | Publicaciones con insignia falsa |
|---|---|---|---|---|
| Solo distancia, corte de los 20 pares de referencia | 0.355 | 10 de 10 | 36 | 59 |
| Solo distancia, mejor corte sobre todo el catálogo | 0.208 | 8 de 10 | 1 | 2 |
| **Distancia + misma ciudad + precio a ±20 %** | **0.29** | **10 de 10** | **0** | **0** |

El 0.29 sale del mismo procedimiento que el 0.355, pero con negativos honestos. Entre los pares que
cumplen ciudad y precio, la republicación más lejana está a 0.271 y el primer par distinto a 0.315
(una cama doble con base y un colchón doble, ambos en Bogotá, a $620.000 y $680.000). El corte
calculado es el punto medio, 0.293, redondeado a 0.29. Si solo se usa la distancia, el mejor corte
sobre el catálogo completo deja escapar dos republicaciones (el calefactor y el closet) y todavía
acusa a las consolas.

**El resultado no depende de afinar la tolerancia de precio.** Republicaciones detectadas / pares
distintos marcados:

| Corte | Solo distancia | Misma ciudad + precio ≥ 70 % | Misma ciudad + precio ≥ 80 % | Misma ciudad + precio ≥ 90 % |
|---|---|---|---|---|
| 0.20 | 8 / 1 | 8 / 0 | 8 / 0 | 8 / 0 |
| 0.25 | 9 / 3 | 9 / 0 | 9 / 0 | 9 / 0 |
| 0.30 | 10 / 15 | 10 / 0 | 10 / 0 | 10 / 0 |
| 0.35 | 10 / 36 | 10 / 1 | 10 / 1 | 10 / 1 |
| 0.40 | 10 / 87 | 10 / 3 | 10 / 2 | 10 / 2 |

### Falsos positivos y falsos negativos

Con la regla vigente: **0 falsos negativos** entre las 10 republicaciones de referencia y **0 falsos
positivos** entre los 36.846 pares de artículos distintos. El caso más cercano a convertirse en falso
positivo es el de la cama y el colchón dobles de Bogotá, a 0.315, que recibiría la insignia si el
corte subiera de 0.315.

### Límites

- Las diez republicaciones las escribió una misma persona y todas conservan ciudad y precio. La regla
  encaja con ese patrón. Un vendedor real que se muda de ciudad o rebaja más de un 20 % no sería
  detectado. Lo aceptamos porque la insignia es una **sospecha** que se le muestra al comprador:
  acusar de republicación a un vendedor honesto es peor que dejar pasar un duplicado.
- La calibración asume que el catálogo no contiene republicaciones no declaradas. La revisión
  manual de los pares por debajo de 0.32 no encontró ninguna.

---

## 4. Filtros combinados con la búsqueda

### Los filtros son exactos (y al principio no lo eran)

Antes de medir el recall comprobamos que cada filtro devuelve exactamente las publicaciones que
cumplen la condición, contadas a mano sobre el catálogo:

| Filtro | Cumplen | Comparación de igualdad directa | Filtro del motor |
|---|---|---|---|
| estado = nuevo | 3 | **76** | 3 |
| estado = como nuevo | 73 | 73 | 73 |
| estado = usado | 195 | 195 | 195 |
| estado = para repuestos | 1 | 1 | 1 |
| ciudad = "bogotá" (escrita por un usuario) | 75 | **0** | 75 |
| ciudad = Duitama | 15 | | 15 |
| electrodomésticos y precio ≤ $150.000 | 16 | | 16 |
| precio ≤ $50.000 | 12 | | 12 |
| precio ≥ $2.000.000 | 6 | | 6 |

Encontramos dos fallos con la comparación de igualdad directa:

- **`estado = nuevo` devolvía 76 publicaciones en lugar de 3.** La propiedad `estado` se creó con la
  tokenización por defecto de Weaviate, que parte el texto en palabras. Con ella, "igual a *nuevo*"
  significa "contiene la palabra *nuevo*", y eso incluye las 73 publicaciones "como nuevo". El motor
  ahora excluye las que contienen la palabra que distingue a los otros valores de la lista cerrada
  (`nuevo` y no `como`). La solución de fondo es recrear la colección con tokenización `field` en
  `estado`, `ciudad` y `categoria`; queda recomendada para la próxima vez que se recree.
- **`"bogotá"` con tilde devolvía 0.** Las ciudades se ingestaron sin tildes. El motor normaliza el
  valor antes de filtrar.

### ¿Pierde recall el índice cuando el filtro descarta casi todo?

Un filtro muy selectivo puede degradar el recall de un índice vectorial aproximado: el recorrido del
índice esquiva los objetos descartados y puede dejar de encontrar algunos de los que sí cumplen.
Medimos el efecto en lugar de citarlo.

**Método.** Para cada consulta se ejecuta la misma búsqueda **sin filtro** pidiendo el catálogo
entero. Así cada una de las 272 publicaciones trae su distancia exacta a la consulta, y la búsqueda
sin filtro sirve de referencia: se filtra en el código y se toman los 12 primeros. Luego se ejecuta
la búsqueda **con** el filtro en Weaviate y se compara. Se probaron tres consultas con siete
filtros, desde ninguno hasta uno que deja **una sola** publicación de 272.

**Resultado.** Recall **1.00 en las 21 combinaciones**, y en las 21 con el mismo orden que la
referencia. El índice no perdió ningún resultado esperado, ni siquiera con `estado = para
repuestos`, que descarta el 99.6 % del catálogo.

**Por qué no lo vemos.** El efecto se describe para índices HNSW grandes. Weaviate, en HNSW, deja de
recorrer el grafo y compara contra todos los objetos permitidos cuando el filtro deja menos de 40.000
(su parámetro `flatSearchCutoff`), y nuestro catálogo completo cabe 147 veces bajo ese límite. El
clúster usa `hfresh` y no verificamos si aplica una regla equivalente. Lo que sí medimos es el
resultado: con 272 publicaciones, ninguna pérdida. Reproducir la degradación exigiría un catálogo de
cientos de miles de objetos, fuera del alcance del plan gratuito.

**Lo que sí se degrada es la relevancia.** El filtro devuelve todo lo que cumple, se parezca o no a
la consulta. La distancia del primer resultado lo deja ver:

| Filtro | "algo para calentar la sala" | "mueble para guardar ropa" | "para trabajar desde la casa" |
|---|---|---|---|
| sin filtro | 0.592 | 0.513 | 0.768 |
| ciudad = Duitama (15) | 0.749 | 0.625 | 0.783 |
| precio ≤ $50.000 (12) | 0.749 | 0.609 | 0.858 |
| precio ≥ $2.000.000 (6) | 0.817 | 0.879 | 0.917 |
| estado = nuevo (3) | 0.866 | 0.867 | 0.920 |
| estado = para repuestos (1) | 0.822 | 0.990 | 0.966 |

Con `estado = para repuestos`, "mueble para guardar ropa" devuelve una consola dañada a 0.990: el
resultado es correcto para el filtro y no tiene nada que ver con la consulta. Por eso la interfaz
debe mostrar la distancia junto a cada resultado. Es la única señal de que "lo mejor que hay" puede
no ser bueno.

---

## 5. Costo en cuota de embeddings

| Operación | Embeddings |
|---|---|
| Una búsqueda con `alpha` = 0 | 0 |
| Una búsqueda con `alpha` > 0 | 1 |
| Abrir una publicación (detector de republicaciones) | 0 |
| Calibración completa del detector | 0 |
| Medición de filtros | 21 |
| Evaluación de Precision@5 (10 consultas × 5 valores de `alpha` mayores que 0) | 50 |

La evaluación completa cuesta 71 de las 2.000 peticiones diarias del plan gratuito.

---

## 6. Cómo se reproduce

Desde `/api`, con el `.env` de la raíz (basta la clave de solo lectura):

```bash
npm test                # 25 pruebas sin red: filtros, modos, formato, umbral y métricas
npm run calibrar        # sección 3   (0 embeddings)
npm run medir-filtros   # sección 4   (21 embeddings)
npm run evaluar         # sección 2   (50 embeddings)
```

Cada script escribe sus resultados en `api/evaluacion/resultados/` (un `.json` con todo el detalle y
un `.md` legible). Los juicios de relevancia están en `api/evaluacion/consultas.js` y la regla del
detector en `api/src/motor/umbral.js`.

---

## 7. Para el equipo: lo que cambia en la demo y en el contrato

Esta sección no va al informe.

**Cambios en la API** (actualizados en `docs/contrato-api.md`):

1. `alpha` por defecto pasa de 0.65 a **1**.
2. `modo` toma tres valores, `bm25`, `hybrid` y `vector`, y dice qué métrica viene llena: `score` en
   los dos primeros y `distance` en el último. En `hybrid`, `distance` llega siempre en `null`.
3. `posibleDuplicado` ya no depende solo de la distancia: exige además misma ciudad y precio a ±20 %.
   Puede haber un vecino a 0.157 **sin** insignia. Es correcto, y conviene que la ficha muestre la
   ciudad y el precio del vecino para que se entienda por qué.
4. `estado = nuevo` ya no trae los "como nuevo"; ciudad y categoría aceptan tildes y mayúsculas; el
   código de `/api/similares/:codigo` no distingue mayúsculas.

**Consultas para la vista comparativa (α = 0 contra α = 1):**

| Consulta | α = 0 | α = 1 |
|---|---|---|
| quiero aprender a tocar un instrumento | interfaz de audio, libros infantiles, teclado musical… (1 de 5) | teclado, guitarra, piano, saxofón, violín (**5 de 5**) |
| algo para mantener fria la comida | dispensador, cobija térmica, sábanas, abrigo, jaula (**0 de 5**) | nevecón, mini nevera y vitrina refrigerada en el top 5 (3 de 5) |
| mueble para guardar ropa | primero un *mueble para televisión* | primero el armario, a 0.513 |

**Lo que hay que ajustar del guion de la demo (roadmap §10):**

- Paso 3: el contraejemplo de "iPhone 13 Pro Max" **no funciona**; con cualquier `alpha` sale bien.
  Conviene contarlo como resultado: esperábamos que ganara BM25 y no ganó. La conclusión del paso 3
  pasa a ser `alpha` = 1 con el deslizador disponible, no "híbrido con 0.65".
- Paso 6 (F5): abrir el iPhone `REU-E016`. Su republicación `REU-E066` aparece primera a 0.112, con
  insignia. Después, la consola `REU-D043`: su vecina `REU-E051` está a 0.157, **más cerca que muchas
  republicaciones**, y no tiene insignia porque es de otra ciudad y vale un 24 % menos. Ese contraste
  explica toda la sección 3 en veinte segundos.
- "Algo para calentar la sala" con α = 1 pone los calefactores en los puestos 3 y 4, detrás de la
  pistola de calor y de una plancha para el cabello. Si se usa en la demo, hay que mostrarlo como
  límite y no como acierto.

**Para Edwar:** recrear la colección con `tokenization: 'field'` en `estado`, `ciudad` y `categoria`
haría innecesaria la corrección del filtro de estado. No es urgente: el motor ya filtra bien.
