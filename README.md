# Reusa — buscador semántico de artículos de segunda mano

Proyecto de la asignatura *Tendencias Modernas de Bases de Datos*. Una base de datos vectorial
(Weaviate, capa gratuita) para que la gente encuentre lo que necesita aunque no sepa cómo se llama:
quien busca *"algo para calentar la sala"* debe encontrar el anuncio titulado
*"VENDO CALEFACTOR CASI NUEVO BARATO"*, con el que no comparte una sola palabra.

El plan completo está en [`roadmap-reusa-weaviate.md`](roadmap-reusa-weaviate.md).

## Estructura

```
/ingesta    limpieza, normalización y carga de datos   (Fase 1 — Edwar)
/api        servidor Express, proxy hacia Weaviate     (Fase 2 — Johnatan)
            + motor de búsqueda                        (Fase 3 — Alejandro)
/web        aplicación React                           (Fase 4 — David)
/datos      semilla.csv y la verdad de referencia para F5
/docs       contrato-api.md, esquema.md, evaluacion.md, manual.md
```

## Puesta en marcha

Las credenciales van en **un solo `.env` en la raíz**, que leen tanto `/api` como `/ingesta`:

```bash
cp .env.example .env     # y rellenar WEAVIATE_URL y WEAVIATE_API_KEY
```

El `.env` nunca se sube: está en `.gitignore`. Para **ingestar** hace falta la *Admin API key*;
el perfil `nube` del futuro `docker-compose.yml` usará la clave de **solo lectura** (roadmap 5.1).

### Ingesta (Fase 1)

```bash
cd ingesta && npm install
npm test                    # 28 pruebas del pipeline de limpieza, sin red
npm run cargar -- --seco    # normaliza y escribe el reporte sin gastar cuota
npm run esquema             # crea la colección Publicacion
npm run cargar              # ingesta real
npm run consultar           # nearText de control con sus distancias
```

Detalle de cada comando en [`ingesta/README.md`](ingesta/README.md) y las decisiones de diseño en
[`docs/esquema.md`](docs/esquema.md).

### API (Fase 2)

```bash
cd api && npm install
npm run dev                 # http://localhost:3001
curl localhost:3001/api/salud
```

El contrato de los tres endpoints está en [`docs/contrato-api.md`](docs/contrato-api.md). `/api/buscar`
y `/api/similares/:codigo` responden todavía con datos fijos que cumplen el contrato, para que el
frontend se construya en paralelo; los valores de esos *stubs* están copiados de objetos reales ya
ingestados, así que coinciden con lo que devolverá la búsqueda de verdad.

## Estado

| Fase | Responsable | Estado |
|---|---|---|
| 1 — Esquema, limpieza e ingesta | Edwar | Funcionando contra el clúster: colección creada y catálogo cargado |
| 2 — Backend, contrato e infraestructura | Johnatan | Contrato firmado y Express en pie con *stubs* |
| 3 — Motor de consultas y evaluación | Alejandro | Pendiente |
| 4 — Frontend y presentación | David | Pendiente |
| 5 — Contenerización | David | Pendiente |

> La sección "Para evaluar este proyecto" (`docker compose up`) la añade David en la Fase 5.7.
