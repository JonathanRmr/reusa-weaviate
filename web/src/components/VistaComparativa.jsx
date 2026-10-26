import React, { useState, useEffect, useRef } from 'react';
import { buscarPublicaciones } from '../api';
import { TarjetaPublicacion } from './TarjetaPublicacion';
import { CONSULTAS_DEMO, CATEGORIAS, CIUDADES, ESTADOS } from '../constantes';

export function VistaComparativa({
  onSeleccionarPublicacion,
  filtrosGlobales,
}) {
  const [consulta, setConsulta] = useState('algo para calentar la sala');
  const [consultaEnviada, setConsultaEnviada] = useState('algo para calentar la sala');
  const [cargando, setCargando] = useState(false);
  const [errorBM25, setErrorBM25] = useState(null);
  const [errorVector, setErrorVector] = useState(null);

  const [resultadosBM25, setResultadosBM25] = useState([]);
  const [resultadosVector, setResultadosVector] = useState([]);
  const [tiempoBM25, setTiempoBM25] = useState(null);
  const [tiempoVector, setTiempoVector] = useState(null);

  // Filtros adicionales opcionales para la comparación
  const [categoria, setCategoria] = useState(filtrosGlobales?.categoria || '');
  const [ciudad, setCiudad] = useState(filtrosGlobales?.ciudad || '');
  const [estado, setEstado] = useState(filtrosGlobales?.estado || '');

  const timerDebounceRef = useRef(null);

  // Ejecutar búsquedas en paralelo (α=0 vs α=1)
  const ejecutarComparacion = useCallback(async (texto, cat, ciu, est) => {
    if (!texto || !texto.trim()) {
      setResultadosBM25([]);
      setResultadosVector([]);
      setErrorBM25(null);
      setErrorVector(null);
      return;
    }

    setCargando(true);
    setErrorBM25(null);
    setErrorVector(null);
    setConsultaEnviada(texto);

    const baseParams = {
      q: texto.trim(),
      limit: 10,
      categoria: cat || undefined,
      ciudad: ciu || undefined,
      estado: est || undefined,
    };

    try {
      const [resBM25, resVector] = await Promise.allSettled([
        buscarPublicaciones({ ...baseParams, alpha: 0 }),
        buscarPublicaciones({ ...baseParams, alpha: 1 }),
      ]);

      if (resBM25.status === 'fulfilled') {
        setResultadosBM25(resBM25.value.resultados || []);
        setTiempoBM25(resBM25.value.tomoMs);
      } else {
        setErrorBM25(resBM25.reason);
        setResultadosBM25([]);
      }

      if (resVector.status === 'fulfilled') {
        setResultadosVector(resVector.value.resultados || []);
        setTiempoVector(resVector.value.tomoMs);
      } else {
        setErrorVector(resVector.reason);
        setResultadosVector([]);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial y reactiva
  useEffect(() => {
    ejecutarComparacion(consulta, categoria, ciudad, estado);
  }, [ejecutarComparacion, consulta, categoria, ciudad, estado]);

  const manejarCambioTexto = (e) => {
    const texto = e.target.value;
    setConsulta(texto);

    if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current);
    timerDebounceRef.current = setTimeout(() => {
      ejecutarComparacion(texto, categoria, ciudad, estado);
    }, 350);
  };

  const seleccionarDemo = (demo) => {
    setConsulta(demo.q);
    if (timerDebounceRef.current) clearTimeout(timerDebounceRef.current);
    ejecutarComparacion(demo.q, categoria, ciudad, estado);
  };

  // Cálculo de conjuntos para resaltar exclusividades
  const codigosBM25 = new Set(resultadosBM25.map((r) => r.codigo));
  const codigosVector = new Set(resultadosVector.map((r) => r.codigo));

  const demoActual = CONSULTAS_DEMO.find((d) => d.q.toLowerCase() === consultaEnviada.toLowerCase());

  return (
    <div className="vista-comparativa-modulo" role="region" aria-label="Comparativa Léxico vs Vectorial">
      {/* Banner Explicativo de la Demostración F4 */}
      <div className="banner-demostracion-f4">
        <div className="banner-icono" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="9" height="18" rx="2" />
            <rect x="13" y="3" width="9" height="18" rx="2" />
          </svg>
        </div>
        <div className="banner-texto">
          <h2 className="banner-titulo">Vista Comparativa F4: Misma Consulta en Paralelo</h2>
          <p className="banner-subtitulo">
            Demostración visual central para la sustentación: Columna Izquierda con <strong>α = 0 (BM25 léxico)</strong> frente a
            Columna Derecha con <strong>α = 1 (Vectorial semántico)</strong>. Las insignias destacan publicaciones exclusivas de cada enfoque.
          </p>
        </div>
      </div>

      {/* Controles de la Vista Comparativa */}
      <div className="comparativa-barra-control">
        <div className="input-envoltorio comparativa-input">
          <span className="icono-lupa" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="input-busqueda"
            placeholder="Escribe una consulta para comparar ambos algoritmos en simultáneo..."
            value={consulta}
            onChange={manejarCambioTexto}
            aria-label="Consulta para la vista comparativa"
          />
        </div>

        {/* Filtros rápidos opcionales */}
        <div className="comparativa-filtros-fila">
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              ejecutarComparacion(consulta, e.target.value, ciudad, estado);
            }}
            className="select-filtro-mini"
            aria-label="Filtrar por categoría"
          >
            <option value="">Categorías: Todas</option>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>

          <select
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              ejecutarComparacion(consulta, categoria, e.target.value, estado);
            }}
            className="select-filtro-mini"
            aria-label="Filtrar por ciudad"
          >
            <option value="">Ciudades: Todas</option>
            {CIUDADES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>

          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              ejecutarComparacion(consulta, categoria, ciudad, e.target.value);
            }}
            className="select-filtro-mini"
            aria-label="Filtrar por estado"
          >
            <option value="">Estados: Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botones de Consulta Clave de api/evaluacion/consultas.js */}
      <div className="comparativa-demos">
        <div className="demos-grupo">
          <span className="demos-grupo-etiqueta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Donde gana el Vector (Semántica/Necesidad):
          </span>
          <div className="demos-botones">
            {CONSULTAS_DEMO.filter((d) => d.tipo === 'semantica').map((d, i) => (
              <button
                key={i}
                type="button"
                className={`btn-demo-pill ${consultaEnviada === d.q ? 'activo-vector' : ''}`}
                onClick={() => seleccionarDemo(d)}
                title={d.explicacion}
              >
                ★ {d.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="demos-grupo">
          <span className="demos-grupo-etiqueta exacta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            Referencias Exactas (donde compite BM25):
          </span>
          <div className="demos-botones">
            {CONSULTAS_DEMO.filter((d) => d.tipo === 'exacta').map((d, i) => (
              <button
                key={i}
                type="button"
                className={`btn-demo-pill exacta ${consultaEnviada === d.q ? 'activo-bm25' : ''}`}
                onClick={() => seleccionarDemo(d)}
                title={d.explicacion}
              >
                {d.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      {demoActual && (
        <div className="alerta-analisis-demo" role="status">
          <span className="alerta-icono" aria-hidden="true">💡</span>
          <div className="alerta-texto">
            <strong>Análisis de evaluación para "{demoActual.q}":</strong> {demoActual.explicacion}
          </div>
        </div>
      )}

      {/* Contenedor a Dos Columnas */}
      <div className="comparativa-dos-columnas">
        {/* COLUMNA IZQUIERDA: BM25 Léxico (alpha=0) */}
        <section className="columna-comparativa columna-bm25" aria-labelledby="col-titulo-bm25">
          <header className="columna-cabecera">
            <div className="columna-titulo-fila">
              <span className="badge-algoritmo bm25">BM25 Léxico</span>
              <span className="parametro-alpha">α = 0</span>
            </div>
            <h3 id="col-titulo-bm25" className="columna-nombre">Coincidencia de Palabras</h3>
            <p className="columna-desc">
              Busca términos literales en <code>titulo</code> y <code>descripcionLimpia</code>. 0 peticiones de embeddings.
            </p>
            <div className="columna-estadisticas">
              <span>{resultadosBM25.length} resultados</span>
              {tiempoBM25 !== null && <span>· {tiempoBM25} ms</span>}
              <span className="badge-metrica-nombre">Métrica: Score BM25 crudo</span>
            </div>
          </header>

          <div className="columna-cuerpo">
            {cargando ? (
              <div className="columna-cargando">
                <span className="spinner-comparativa" aria-hidden="true" />
                <span>Ejecutando BM25...</span>
              </div>
            ) : errorBM25 ? (
              <div className="error-columna">
                <p>Error en búsqueda BM25: {errorBM25.message}</p>
              </div>
            ) : resultadosBM25.length === 0 ? (
              <div className="vacio-columna">
                <p>BM25 devolvió 0 resultados.</p>
                <span className="vacio-pista">No comparte palabras textuales con ningún artículo del catálogo.</span>
              </div>
            ) : (
              <div className="lista-tarjetas-columna">
                {resultadosBM25.map((item, idx) => {
                  const esExclusivo = !codigosVector.has(item.codigo);
                  const insignia = esExclusivo
                    ? { tipo: 'insignia-solo-bm25', texto: 'Solo en BM25' }
                    : { tipo: 'insignia-compartido', texto: 'En ambos rankings' };

                  return (
                    <TarjetaPublicacion
                      key={item.codigo}
                      publicacion={item}
                      modo="bm25"
                      posicionRanking={idx + 1}
                      insigniaComparativa={insignia}
                      onSeleccionar={onSeleccionarPublicacion}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: Vectorial Semántico (alpha=1) */}
        <section className="columna-comparativa columna-vector" aria-labelledby="col-titulo-vector">
          <header className="columna-cabecera">
            <div className="columna-titulo-fila">
              <span className="badge-algoritmo vector">Vectorial Puro</span>
              <span className="parametro-alpha">α = 1</span>
            </div>
            <h3 id="col-titulo-vector" className="columna-nombre">Similitud por Significado</h3>
            <p className="columna-desc">
              Embeddings con <code>text2vec-weaviate</code> (Snowflake Arctic). Captura necesidad sin palabras compartidas.
            </p>
            <div className="columna-estadisticas">
              <span>{resultadosVector.length} resultados</span>
              {tiempoVector !== null && <span>· {tiempoVector} ms</span>}
              <span className="badge-metrica-nombre">Métrica: Distancia Coseno (0=idéntico, 2=opuesto)</span>
            </div>
          </header>

          <div className="columna-cuerpo">
            {cargando ? (
              <div className="columna-cargando">
                <span className="spinner-comparativa" aria-hidden="true" />
                <span>Vectorizando con Weaviate...</span>
              </div>
            ) : errorVector ? (
              <div className="error-columna">
                <p>Error en búsqueda vectorial: {errorVector.message}</p>
              </div>
            ) : resultadosVector.length === 0 ? (
              <div className="vacio-columna">
                <p>Vectorial devolvió 0 resultados.</p>
              </div>
            ) : (
              <div className="lista-tarjetas-columna">
                {resultadosVector.map((item, idx) => {
                  const esExclusivo = !codigosBM25.has(item.codigo);
                  const insignia = esExclusivo
                    ? { tipo: 'insignia-solo-vector', texto: 'Solo en Vectorial' }
                    : { tipo: 'insignia-compartido', texto: 'En ambos rankings' };

                  return (
                    <TarjetaPublicacion
                      key={item.codigo}
                      publicacion={item}
                      modo="vector"
                      posicionRanking={idx + 1}
                      insigniaComparativa={insignia}
                      onSeleccionar={onSeleccionarPublicacion}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
