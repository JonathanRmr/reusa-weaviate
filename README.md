# Reusa — buscador semántico de artículos de segunda mano

Proyecto de la asignatura *Tendencias Modernas de Bases de Datos*. Una base de datos vectorial
(Weaviate, capa gratuita) para que la gente encuentre lo que necesita aunque no sepa cómo se llama:
quien busca *"algo para calentar la sala"* debe encontrar el anuncio titulado
*"VENDO CALEFACTOR CASI NUEVO BARATO"*, con el que no comparte una sola palabra.

El plan completo está en [`roadmap-reusa-weaviate.md`](roadmap-reusa-weaviate.md).
El manual de usuario de la aplicación está en [`docs/manual.md`](docs/manual.md).

---

## Para evaluar este proyecto

Solo hace falta **Docker con Compose v2** (`docker compose version`). No hay que crear cuentas, ni
pedir credenciales, ni editar ningún archivo.

### Opción 1 — un comando (recomendada)

```bash
docker compose up
```

Abrir **http://localhost:8080**

La primera vez construye las imágenes: unos 2–4 minutos según la conexión. Está listo cuando la
consola muestra `Container reusa-api  Healthy` seguido de `Container reusa-web  Started`.

**Cómo saber que funcionó:** en la esquina superior derecha de la página, el indicador debe estar
en verde y decir **272 objetos indexados**. Si prefiere comprobarlo sin abrir el navegador:

```bash
curl localhost:8080/api/salud
# {"weaviate":true,"objetos":272}
```

Para apagarlo: `Ctrl+C`, y `docker compose down` para eliminar los contenedores.

> **Si el puerto 8080 está ocupado** en su máquina, cambie `"8080:80"` por `"9090:80"` en el
> servicio `web` del `docker-compose.yml` y abra http://localhost:9090.

> **Sobre la credencial incluida en el repositorio:** el `docker-compose.yml` trae la URL del clúster
> y una API key para que esto funcione sin configuración. **No es la clave de administrador.**
> Pertenece a un rol RBAC con dos permisos de lectura sobre la colección `Publicacion`: no puede
> escribir, ni borrar, ni crear colecciones. Está comprobado con una prueba automatizada
> (`npm run probar-lectura`, ver [`docs/esquema.md`](docs/esquema.md) §5) y se rota tras la
> sustentación.

### Opción 2 — sin internet ni cuentas

```bash
docker compose --profile local up
```

Levanta un Weaviate propio con su modelo de embeddings, ingesta los datos y arranca la aplicación,
todo en la máquina del evaluador. **La primera vez descarga alrededor de 1 GB** del modelo y la
ingesta de las 272 publicaciones en CPU tarda varios minutos. Es el respaldo para una sala sin
conexión, no el camino recomendado: el modelo local es distinto al de la nube, así que las
distancias no coinciden con las que reporta el informe.

### Consultas sugeridas para probar

- `"mueble para guardar ropa"` → con el deslizador a la izquierda (palabras exactas) no aparece el
  armario; a la derecha (significado) sale **primero**, a distancia 0.513, aunque su título no
  contiene ninguna de esas palabras tal como las escribió el comprador. Es el contraste más limpio
  entre búsqueda léxica y semántica.
- `"algo para calentar la sala"` → con palabras exactas trae alfombras; con significado aparecen los
  calefactores. Aparecen en segundo y tercer lugar: el primero es una *pistola de calor*, un vecino
  semántico legítimo que el modelo no distingue de la calefacción de ambiente. Es un límite real y
  está explicado en [`docs/informe-datos.md`](docs/informe-datos.md) §4.
- `"iPhone 13 Pro Max"` → aquí las palabras exactas rinden igual de bien, porque el comprador ya sabe
  el nombre del producto. Es el contraejemplo que justifica ofrecer el deslizador completo.
- Abrir cualquier publicación y mirar la franja de **parecidos**: las republicaciones del mismo
  artículo aparecen marcadas con su distancia.

---

## Estructura

```
/ingesta    limpieza, normalización y carga de datos   (Fase 1 — Edwar)
/api        servidor Express, proxy hacia Weaviate     (Fase 2 — Johnatan)
            + motor de búsqueda                        (Fase 3 — Alejandro)
/web        aplicación React + Vite en alto contraste  (Fase 4 — David)
/datos      semilla.csv y la verdad de referencia para F5
/docs       contrato-api.md, esquema.md, evaluacion.md, manual.md, informe-datos.md
docker-compose.yml  perfil "nube" (por defecto) y perfil "local" (Fase 5 — David)
```

## Puesta en marcha para desarrollo manual

Las credenciales van en **un solo `.env` en la raíz**, que leen tanto `/api` como `/ingesta`:

```bash
cp .env.example .env     # y rellenar WEAVIATE_URL y WEAVIATE_API_KEY
```

El `.env` nunca se sube: está en `.gitignore`. Para **ingestar** hace falta la *Admin API key*;
el perfil `nube` de `docker-compose.yml` utiliza la clave de **solo lectura** gestionada por RBAC (roadmap 5.1).

### Ingesta (Fase 1)

```bash
cd ingesta && npm install
npm test                    # 28 pruebas del pipeline de limpieza, sin red
npm run cargar -- --seco    # normaliza y escribe el reporte sin gastar cuota
npm run esquema             # crea la colección Publicacion
npm run cargar              # ingesta real
npm run consultar           # nearText de control con sus distancias
```

El catálogo son **280 publicaciones** en `datos/semilla.csv`, 70 por integrante, de las que 272
superan la limpieza. El pipeline y sus cifras están en
[`docs/informe-datos.md`](docs/informe-datos.md).

Detalle de cada comando en [`ingesta/README.md`](ingesta/README.md) y las decisiones de diseño en
[`docs/esquema.md`](docs/esquema.md).

### API (Fase 2)

```bash
cd api && npm install
npm run dev                 # http://localhost:3001
curl localhost:3001/api/salud
```

El contrato de los tres endpoints está en [`docs/contrato-api.md`](docs/contrato-api.md). Los tres
responden ya contra el clúster real: los *stubs* de la Fase 2 se reemplazaron por el motor de la
Fase 3.

### Motor de búsqueda y evaluación (Fase 3)

El motor vive en `api/src/motor/`: `buscar.js` (BM25, híbrido o vectorial según `alpha`, con
filtros) y `similares.js` (detector de republicaciones). Su evaluación se reproduce desde `/api`:

```bash
npm test                    # 25 pruebas sin red
npm run calibrar            # umbral del detector de republicaciones (0 embeddings)
npm run medir-filtros       # filtros exactos y recall con filtros selectivos (21 embeddings)
npm run evaluar             # Precision@5 por alpha (50 embeddings)
```

Resultados y conclusiones en [`docs/evaluacion.md`](docs/evaluacion.md): `alpha` = 1 por defecto, y
una republicación se marca por distancia < 0.29 + misma ciudad + precio a ±20 %, con 10 de 10
detectadas y 0 falsas alarmas en los 36.846 pares del catálogo.

### Frontend y UX (Fase 4)

La interfaz en React + Vite vive en `/web` y está diseñada con alto contraste pensado para videobeam:

```bash
cd web && npm install
npm run dev                 # http://localhost:5173 con proxy a localhost:3001
npm run build               # compila a /web/dist
```

## Estado del Proyecto

| Fase | Responsable | Estado |
|---|---|---|
| 1 — Esquema, limpieza e ingesta | Edwar | **Completa.** 272 publicaciones ingestadas y verificadas; clave de solo lectura creada |
| 2 — Backend, contrato e infraestructura | Johnatan | **Completa.** Contrato firmado, Express y proxy funcionando |
| 3 — Motor de consultas y evaluación | Alejandro | **Completa.** `buscar` y `similares` contra el clúster; Precision@5, umbral calibrado y filtros medidos |
| 4 — Frontend y presentación | David | **Completa.** UI React + Vite, alto contraste videobeam, buscador con debounce, comparativa F4 y detector F5 |
| 5 — Contenerización | David | **Completa.** Dockerfiles para api, ingesta y web, docker-compose.yml con perfil nube y perfil local |
| 6 — Cierre conjunto e informe | Todos | Manual de usuario en [`docs/manual.md`](docs/manual.md), guion de demo y diapositivas |
