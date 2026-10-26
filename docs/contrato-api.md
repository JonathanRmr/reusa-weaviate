# Contrato de la API — "Reusa"

**Responsable:** Jonathan Romero (Fase 2)
**Estado:** 🔒 Cerrado — cualquier cambio debe acordarse con los cuatro integrantes (ver roadmap, sección 8).
**Base URL (local/docker):** `http://localhost:3001` · tras nginx (producción/demo): `http://localhost:8080/api`

> **Cambios propuestos por la Fase 3 (Alejandro), pendientes del visto bueno de los cuatro.** No
> cambian la forma de ninguna respuesta; sí cambian valores. Justificación y cifras en
> [`docs/evaluacion.md`](evaluacion.md).
>
> 1. `alpha` por defecto pasa de `0.65` a **`1`** (evaluación §2).
> 2. `modo` deja de ser siempre `"hybrid"`: vale `"bm25"`, `"hybrid"` o `"vector"` según `alpha`, y
>    dice cuál de `score` / `distance` viene lleno.
> 3. `posibleDuplicado` exige distancia < 0.29 **y** misma ciudad **y** precio a ±20 % (evaluación §3).
> 4. Los filtros de `categoria`, `ciudad` y `estado` aceptan tildes y mayúsculas; `estado=nuevo` ya no
>    incluye los "como nuevo". El `:codigo` de `/api/similares` no distingue mayúsculas.



---

## Formato común de error

Cualquier endpoint que falle responde así, con el código HTTP correspondiente:

```json
{
  "error": "mensaje legible para mostrar o loguear",
  "codigo": "Q_VACIO | LIMIT_INVALIDO | RANGO_PRECIO_INVALIDO | WEAVIATE_NO_DISPONIBLE | NO_ENCONTRADO"
}
```

| HTTP | Cuándo |
|---|---|
| 400 | Parámetros inválidos (ver validaciones de cada endpoint) |
| 404 | `codigo` no existe en `/api/similares/:codigo` |
| 502 | Weaviate no responde o devuelve error |

---

## `GET /api/buscar`

Búsqueda híbrida (vectorial + léxica) con filtros.

### Query params

| Parámetro | Tipo | Obligatorio | Default | Validación |
|---|---|---|---|---|
| `q` | string | sí | — | no vacío tras `trim()` → si falta o vacío: `400 Q_VACIO` |
| `alpha` | number (0–1) | no | `1` | fuera de rango → clamp a [0,1], no error |
| `categoria` | string | no | — | debe existir en el set cerrado de categorías (ver `/docs/esquema.md`); sin distinguir tildes ni mayúsculas |
| `precioMin` | number | no | — | entero ≥ 0 |
| `precioMax` | number | no | — | entero ≥ 0 |
| `ciudad` | string | no | — | sin distinguir tildes ni mayúsculas (`bogotá` = `Bogota`) |
| `estado` | string | no | — | uno de `nuevo`, `como nuevo`, `usado`, `para repuestos`; coincidencia exacta |
| `limit` | number | no | `12` | entero, `1 ≤ limit ≤ 25` → si `limit > 25`: `400 LIMIT_INVALIDO` |

Si `precioMin > precioMax` ambos presentes → `400 RANGO_PRECIO_INVALIDO`.

### Respuesta `200`

```json
{
  "resultados": [
    {
      "codigo": "REU-0042",
      "titulo": "Calefactor eléctrico 1500W",
      "descripcionOriginal": "VENDO CALEFACTOR CASI NUEVO BARATO ESCRIBIR WPP 300 000 0000",
      "categoria": "hogar",
      "precio": 85000,
      "ciudad": "Tunja",
      "estado": "usado",
      "fechaPublicacion": "2026-09-12",
      "imagenUrl": "https://.../0042.jpg",
      "score": 0.734,
      "distance": 0.41
    }
  ],
  "tomoMs": 182,
  "modo": "hybrid"
}
```

**Nota de contrato (ver roadmap 3.2):** `score` y `distance` **no son comparables entre sí**
(escalas distintas). El frontend muestra uno u otro según corresponda, nunca ambos como si fueran
lo mismo. `modo` dice cuál viene lleno; el otro llega en `null`:

| `alpha` | `modo` | Viene lleno | Qué es |
|---|---|---|---|
| `0` | `"bm25"` | `score` | BM25 crudo, no acotado (20.7 casi literal, 2.4 flojo) |
| entre 0 y 1 | `"hybrid"` | `score` | Fusión normalizada en [0, 1] **dentro de cada respuesta** |
| `1` | `"vector"` | `distance` | Coseno: 0 idéntico, 2 opuesto. **No es un porcentaje** |

En `"hybrid"` la `distance` llega siempre en `null`: Weaviate no la devuelve para el resultado
fusionado. Con `alpha = 0` la búsqueda no gasta cuota de embeddings.

---

## `GET /api/similares/:codigo`

Detector de republicaciones (F5). Dado el código de una publicación, devuelve las más parecidas.

### Path param

| Parámetro | Tipo | Validación |
|---|---|---|
| `codigo` | string | debe existir → si no: `404 NO_ENCONTRADO` |

### Query params

| Parámetro | Tipo | Default | Validación |
|---|---|---|---|
| `limit` | number | `5` | entero, `1 ≤ limit ≤ 25` |

### Respuesta `200`

```json
{
  "base": {
    "codigo": "REU-0042",
    "titulo": "Calefactor eléctrico 1500W",
    "categoria": "hogar",
    "precio": 85000,
    "ciudad": "Tunja"
  },
  "similares": [
    {
      "codigo": "REU-0199",
      "titulo": "Calentador electrico nuevo",
      "descripcionOriginal": "...",
      "categoria": "hogar",
      "precio": 90000,
      "ciudad": "Tunja",
      "estado": "nuevo",
      "fechaPublicacion": "2026-09-20",
      "imagenUrl": "https://.../0199.jpg",
      "distance": 0.08,
      "posibleDuplicado": true
    }
  ]
}
```

`posibleDuplicado` lo calcula el backend con la regla calibrada en la Fase 3 (roadmap 3.4): distancia
< 0.29 **y** misma ciudad que la base **y** precio a ±20 %. La distancia sola no basta: dos
artículos distintos del mismo tipo pueden quedar a 0.157 (ver `docs/evaluacion.md` §3). El frontend
solo pinta la insignia, no decide la regla; un vecino muy cercano **sin** insignia es correcto.

---

## `GET /api/salud`

Healthcheck. Usado también por Docker (`healthcheck` del compose, roadmap 5.5).

- Debe responder **rápido** y **sin depender de que haya datos cargados**, solo de que Weaviate
  esté alcanzable.

### Respuesta `200`

```json
{ "weaviate": true, "objetos": 312 }
```

### Respuesta `502` (Weaviate no disponible)

```json
{ "weaviate": false, "objetos": 0 }
```

---

## Reglas transversales

1. **CORS:** controlado por `CORS_ORIGIN` (variable de entorno). En el perfil `nube` de Docker,
   nginx sirve frontend y backend bajo el mismo origen, así que en producción no debería ni hacer
   falta — pero el servidor lo soporta para desarrollo local (`vite` en otro puerto).
2. **Caché:** `/api/buscar` cachea en memoria por 5 minutos, con clave = `q + alpha + todos los
   filtros`. Un cambio en cualquier filtro es una clave distinta (roadmap 2.5).
3. **Nunca se expone la API key de Weaviate** ni ningún detalle de conexión en las respuestas o en
   los mensajes de error.
4. **Versionado del contrato:** cualquier cambio de forma (agregar/quitar campos, renombrar) se
   anuncia a los cuatro antes de implementarse, porque rompe tanto los stubs como el frontend ya
   construido contra ellos.
