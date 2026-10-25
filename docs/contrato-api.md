# Contrato de la API — "Reusa"

**Responsable:** Jonathan Romero (Fase 2)
**Estado:** 🔒 Cerrado — cualquier cambio debe acordarse con los cuatro integrantes (ver roadmap, sección 8).
**Base URL (local/docker):** `http://localhost:3001` · tras nginx (producción/demo): `http://localhost:8080/api`



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
| `alpha` | number (0–1) | no | `0.65` | fuera de rango → clamp a [0,1], no error |
| `categoria` | string | no | — | debe existir en el set cerrado de categorías (ver `/docs/esquema.md`) |
| `precioMin` | number | no | — | entero ≥ 0 |
| `precioMax` | number | no | — | entero ≥ 0 |
| `ciudad` | string | no | — | — |
| `estado` | string | no | — | uno de `nuevo`, `como nuevo`, `usado`, `para repuestos` |
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
lo mismo. Con `alpha = 0` (BM25 puro) `distance` puede venir `null`; con `alpha = 1` (vectorial
puro) `score` puede venir `null`. El cliente debe tolerar ambos casos.

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

`posibleDuplicado` lo calcula el backend comparando `distance` contra el umbral calibrado en la
Fase 3 (roadmap 3.4) — el frontend solo pinta la insignia, no decide el umbral.

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
