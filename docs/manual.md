# Manual de Usuario — Buscador Semántico "Reusa"

**Proyecto:** "Reusa" — Marketplace de artículos de segunda mano con Weaviate  
**Asignatura:** Tendencias Modernas de Bases de Datos  
**Autor:** David Quijano (Fase 4: Frontend & UX / Fase 5: Contenerización)  
**URL de acceso local / Docker:** `http://localhost:8080` (o `http://localhost:5173` en desarrollo)

---

## 1. Introducción: El Problema de Negocio

En los marketplaces y clasificados de segunda mano existe una brecha fundamental entre comprador y vendedor:

- **El vendedor** redacta con nombres técnicos, errores ortográficos, mayúsculas sostenidas y ruido de contacto:  
  *`"VENDO CALEFACTOR ELECTRICO CASI NUEVO BARATO ESCRIBIR AL WPP 300 000 0000"`*.
- **El comprador** no conoce la marca ni el modelo exacto, y busca directamente por su necesidad en lenguaje natural:  
  *`"algo para calentar la sala en invierno"`*.

Un buscador tradicional basado en coincidencia de palabras (como BM25 o SQL `LIKE`) devuelve **cero resultados**, porque no comparten ningún término léxico. **Reusa** resuelve este problema utilizando una base de datos vectorial (**Weaviate Cloud**) que indexa el *significado* semántico del artículo mediante modelos de *embeddings* multilingües (`Snowflake/snowflake-arctic-embed-l-v2.0`).

---

## 2. Puesta en Marcha Rápida

La aplicación está completamente contenerizada para ser ejecutada en un solo comando:

```bash
# 1. Clonar el repositorio y entrar
git clone <url-del-repositorio> && cd reusa-weaviate

# 2. Levantar la aplicación con Docker Compose (Perfil Nube por defecto)
docker compose up

# 3. Abrir en el navegador
http://localhost:8080
```

> **Nota para videobeam:** La interfaz cuenta con una paleta de **Alto Contraste** diseñada específicamente para evitar que los elementos visuales se desvanezcan en proyectores de auditorio. Incluye bordes de 2px sólidos, indicadores luminosos y anillos de foco visibles (`:focus-visible`).

---

## 3. Guía de Uso de la Interfaz

### 3.1 Indicador de Salud del Clúster (Encabezado)

En la esquina superior derecha se encuentra el indicador en vivo de la conexión con Weaviate:

- **Punto verde parpadeante ("Weaviate Cloud Activo"):** Indica que la API conectó satisfactoriamente con el clúster en la nube y reporta el total de publicaciones disponibles (ej. **272 objetos indexados**).
- **Punto rojo ("Weaviate Desconectado"):** Indica falta de conexión o credenciales inválidas.
- **Botón de refresco:** Permite consultar nuevamente el endpoint `/api/salud`.

---

### 3.2 Buscador Principal con Debounce (350 ms)

La barra de búsqueda principal cuenta con un mecanismo de **debounce de 350 ms**:

- **Por qué existe:** En la capa gratuita de Weaviate Cloud disponemos de una cuota diaria de **2.000 peticiones de embeddings**. Si se disparara una búsqueda en cada pulsación del teclado, escribir una consulta de 25 caracteres gastaría 25 peticiones. El debounce espera 350 milisegundos de inactividad antes de consultar al servidor, protegiendo la cuota durante las pruebas y la sustentación.
- **Indicador visual:** En el extremo derecho del input verás el indicador `350 ms...` mientras escribes, pasando a `Buscando...` al ejecutarse la consulta.
- **Botón "×":** Borra inmediatamente el texto de búsqueda.

---

### 3.3 El Deslizador Alpha (α): Búsqueda Híbrida

El control deslizante de **Alpha (α)** regula el balance entre la coincidencia léxica tradicional y la búsqueda semántica vectorial:

```
[ 0 = Palabras exactas (BM25) ] <─────────[ α ]─────────> [ 1 = Significado (Vectorial) ]
```

| Posición de α | Modo | Operador Weaviate | Métrica que muestra | Consumo de Embeddings | Cuándo usarlo |
|---|---|---|---|---|---|
| **α = 0** | **`bm25`** | `col.query.bm25` | **Score BM25** (escala abierta sin acotar) | **0 peticiones** | Referencias textuales exactas, números de parte, códigos de producto. |
| **0 < α < 1** | **`hybrid`** | `col.query.hybrid` | **Score Híbrido** normalizado en [0, 1] | **1 petición** | Búsqueda combinada cuando el usuario escribe una marca junto a una necesidad. |
| **α = 1 (Default)** | **`vector`** | `col.query.nearText` | **Distancia Coseno** (0 idéntico, 2 opuesto) | **1 petición** | Búsquedas por necesidad cotidiana en lenguaje natural. |

> **¿Por qué α = 1 viene por defecto?**  
> En la evaluación rigurosa del sistema (`docs/evaluacion.md §2`), `α = 1` obtuvo el mayor **Precision@5 (0.42)** y **MRR (0.73)** de todas las configuraciones probadas, superando holgadamente a `0.65` (que sacaba 0 de 5 relevantes en la consulta estrella del calefactor).

---

### 3.4 Filtros de Metadatos y Rango de Precios

Los filtros se combinan con un `Y` lógico con la búsqueda vectorial:

1. **Rango de Precios (COP):** Permite ingresar `precioMin` y `precioMax`. Si el usuario ingresa un mínimo mayor al máximo, el sistema resalta el error en rojo y bloquea la petición antes de enviarla.
2. **Selector de Categoría:** Lista cerrada de 12 categorías reales (`electrodomésticos`, `muebles`, `tecnología`, `hogar`, etc.).
3. **Selector de Ciudad:** Lista cerrada de 8 ciudades (`Bogotá`, `Medellín`, `Cali`, `Tunja`, etc.).
4. **Selector de Estado:** `nuevo`, `como nuevo`, `usado` y `para repuestos`.
5. **Botón "Restablecer filtros":** Devuelve todos los selectores a sus valores por defecto en un solo clic.

---

### 3.5 Rejilla de Tarjetas y Lectura de Métricas

Cada tarjeta presenta:
- **Imagen del artículo:** Con mecanismo de *fallback* visual limpio en caso de fallo de red.
- **Título y precio formateado:** Formato en pesos colombianos con separador de miles (ej. `$ 85.000 COP`).
- **Insignias:** Ciudad, categoría y estado del artículo.
- **Caja de Métrica Estricta:**
  - Si el modo es `vector`: Muestra `Distancia Coseno: 0.513` con la leyenda explicativa *`0 = idéntico · 2 = opuesto`*. **Nunca se muestra como porcentaje falso**.
  - Si el modo es `bm25`: Muestra `Score BM25: 4.78`.
  - Si el modo es `hybrid`: Muestra `Score Híbrido: 0.734`.

---

## 4. Vista Comparativa F4 (Léxico vs Vectorial)

Accesible desde la pestaña superior **"Vista Comparativa F4: Léxico vs Vectorial"**:

### ¿Qué hace?
Ejecuta la misma consulta del usuario **en paralelo** en dos peticiones simultáneas:
- **Columna Izquierda:** Ejecutada con `α = 0` (BM25 léxico puro).
- **Columna Derecha:** Ejecutada con `α = 1` (Vectorial por significado puro).

### Insignias de Exclusividad
- **`Solo en BM25` (Insignia Amarilla):** Artículos que únicamente aparecen en el ranking léxico.
- **`Solo en Vectorial` (Insignia Cyan):** Artículos que el vector encontró por significado pero que no comparten palabras con la consulta.
- **`En ambos rankings` (Insignia Gris):** Artículos recuperados por ambos métodos.

### Botones de Pruebas Rápidas para la Sustentación

En la parte superior de la vista comparativa hay botones interactivos para demostrar los resultados documentados en `docs/evaluacion.md`:

1. **`algo para calentar la sala` (Gana Vector):**  
   - BM25 devuelve una alfombra para sala, un microondas y un ventilador.  
   - Vectorial ubica los calefactores en las primeras posiciones.
2. **`mueble para guardar ropa` (Gana Vector):**  
   - BM25 devuelve un mueble para televisión (por la palabra "mueble").  
   - Vectorial ubica el armario en madera `REU-E064` en el primer puesto con distancia `0.513`.
3. **`quiero aprender a tocar un instrumento` (Gana Vector):**  
   - Precision@5 salta de 0.2 en BM25 a 1.0 en Vectorial (recupera teclado, guitarra, piano, saxofón y violín).
4. **`algo para mantener fria la comida` (Gana Vector):**  
   - BM25 saca 0/5 porque devuelve cobijas lavadas en "agua fría"; Vectorial devuelve neveras y minibares.
5. **`iPhone 13 Pro Max 256GB` (Referencia Exacta):**  
   - Ambos algoritmos ubican el teléfono en las primeras posiciones.

---

## 5. Ficha de Artículo y Detector de Republicaciones (F5)

Al hacer clic en cualquier tarjeta de la rejilla o de la vista comparativa, se abre el modal de detalle:

### 5.1 Información Completa y Ruido Original
- Muestra el **código de publicación** (`REU-E001`), fecha, precio, ciudad y categoría.
- **Descripción Original:** Muestra el texto tal como lo redactó el usuario, con mayúsculas sostenidas, emojis y teléfonos de contacto.  
  *Explicación técnica para el jurado:* Se muestra la descripción original al comprador, pero se explica que el pipeline de la Fase 1 vectorizó `descripcionLimpia` sin teléfonos ni muletillas para evitar que anuncios no relacionados se agrupen falsamente por decir *"escribir al wpp"*.

### 5.2 Detector de Republicaciones (F5)
En la parte inferior de la ficha se consumen los vecinos más cercanos vía `GET /api/similares/:codigo` (utilizando `nearObject(UUID)` en Weaviate, lo cual consume **0 peticiones de embeddings**).

### La Regla Calibrada (docs/evaluacion.md §3)
Si un vecino es sospechoso de ser el mismo artículo republicado, se resalta con una **insignia roja de alto contraste: `⚠️ POSIBLE REPUBLICACIÓN`**.

La insignia se activa **únicamente** si se cumplen conjuntamente tres condiciones:
1. **Distancia Coseno < 0.29**: Medida de cercanía en el espacio vectorial.
2. **Misma Ciudad**: El vendedor sigue viviendo en la misma ciudad.
3. **Precio dentro de ±20%**: El precio más bajo es al menos el 80% del más alto.

> **¿Por qué la distancia sola no basta?**  
> Dos consolas de videojuegos distintas de diferentes ciudades se ubican a una distancia de `0.157` (más cerca que muchas republicaciones reales). Si solo usáramos la distancia, 59 publicaciones tendrían acusaciones falsas de duplicado. La combinación de distancia + ciudad + precio logró **10 de 10 duplicados detectados y 0 falsas alarmas**.

---

## 6. Solución de Problemas Frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| Indicador de Weaviate en rojo | El backend no puede comunicarse con Weaviate Cloud. | Verifica que `.env` tenga `WEAVIATE_URL` y `WEAVIATE_API_KEY` válidos, o inicia en modo local con `--profile local`. |
| Error `RANGO_PRECIO_INVALIDO` | El precio mínimo es superior al máximo. | Corrige los valores en los campos de precio para que `precioMin <= precioMax`. |
| Error de CORS en el navegador | Estás accediendo directamente a la API en un puerto no permitido. | Abre la aplicación en `http://localhost:8080` (en Docker con Nginx) o `http://localhost:5173` (en Vite dev con proxy). |
| Docker falla en `docker compose up` | El puerto 8080 está ocupado por otra aplicación. | Libera el puerto 8080 o cambia el mapeo en `docker-compose.yml` (ej. `8081:80`). |
