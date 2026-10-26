# Reusa — Frontend (Fase 4: /web)

Aplicación web desarrollada en **React + Vite** para el marketplace de segunda mano **"Reusa"**, con búsqueda semántica vectorial, búsqueda híbrida y detector de republicaciones sobre Weaviate Cloud.

**Responsable:** David Quijano (Fase 4: Frontend, UX y Presentación)  
**Asignatura:** Tendencias Modernas de Bases de Datos

---

## 1. Características Implementadas (Fase 4)

- **Proxy de Desarrollo Local:** Configurado en `vite.config.js` redirigiendo `/api/*` hacia `http://localhost:3001`.
- **Diseño de Alto Contraste para Videobeam (4.1 y 4.6):**
  - Paleta optimizada para proyectores de auditorio con relaciones de contraste WCAG AAA.
  - Foco visible reforzado (`:focus-visible`) con anillo cyan de 3px.
  - Formato de precios en pesos colombianos (**COP**) con separador de miles (ej. `$ 1.250.000 COP`).
- **Indicador de Salud Weaviate (4.1):**
  - Consume `GET /api/salud`.
  - Muestra en tiempo real si Weaviate Cloud está activo y el conteo de objetos indexados (272 objetos).
- **Buscador con Debounce Obligatorio de 350 ms (4.2):**
  - Protege la cuota diaria de 2.000 peticiones de embeddings del plan gratuito de Weaviate Cloud.
- **Controles de Búsqueda (4.3):**
  - Deslizador de `alpha` de 0 a 1 con valor por defecto en `1` (calibrado en `docs/evaluacion.md §2`), rotulado en los extremos:
    - `0 = Palabras exactas (BM25)` (0 embeddings consumidos)
    - `1 = Significado (Vectorial)` (1 embedding consumido)
    - Valores intermedios = `Híbrido` normalizado [0, 1].
  - Rango de precio (`precioMin`, `precioMax`) con validación cliente de `precioMin <= precioMax`.
  - Selectores de categorías (12), ciudades (8) y estados (4) basados estrictamente en `datos/semilla.csv` y `docs/esquema.md`.
- **Rejilla de Tarjetas de Resultados (4.1 y 4.3):**
  - Imagen con fallback visual SVG si no carga.
  - Título, precio COP, ciudad, categoría y estado.
  - Métrica estricta respetando el campo `modo` del contrato (`bm25` y `hybrid` muestran `score`; `vector` muestra `distance` coseno con explicación de 0 = idéntico y 2 = opuesto, sin mezclar escalas ni falsos porcentajes).
  - Estados de carga (skeletons), vacío y errores tipificados (`Q_VACIO`, `RANGO_PRECIO_INVALIDO`, `WEAVIATE_NO_DISPONIBLE`, etc.).
- **Vista Comparativa F4 (4.4):**
  - Módulo a dos columnas ejecutando la misma consulta en paralelo (`α = 0` vs `α = 1`).
  - Insignias diferenciales: `Solo en BM25`, `Solo en Vectorial` y `En ambos rankings`.
  - Botones de pruebas rápidas con las consultas de `api/evaluacion/consultas.js`.
- **Ficha de Artículo y Detector de Republicaciones F5 (4.5):**
  - Modal con todos los datos del artículo, incluyendo `descripcionOriginal` con el ruido real del vendedor.
  - Consume `GET /api/similares/:codigo`.
  - Franja de artículos parecidos con su `distance`.
  - Insignia destacada para `posibleDuplicado: true` con explicación de la regla calibrada:
    `distancia < 0.29` + `misma ciudad` + `precio a ±20%`.

---

## 2. Comandos para Desarrollo y Compilación

```bash
cd web

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# Compilar para producción (genera /dist)
npm run build

# Previsualizar el build de producción
npm run preview
```
