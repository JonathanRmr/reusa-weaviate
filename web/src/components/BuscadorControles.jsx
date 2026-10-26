import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIAS, CIUDADES, ESTADOS, CONSULTAS_DEMO } from '../constantes';

export function BuscadorControles({
  filtros,
  onCambioFiltros,
  cargando,
  tomoMs,
  totalResultados,
  modoRespuesta,
}) {
  // Input local para debounce de 350ms
  const [textoLocal, setTextoLocal] = useState(filtros.q || '');
  const [estaEscribiendo, setEstaEscribiendo] = useState(false);
  const timerRef = useRef(null);

  // Sincronizar si cambia desde afuera (ej: botón de consulta de prueba)
  useEffect(() => {
    setTextoLocal(filtros.q || '');
  }, [filtros.q]);

  // Manejo de debounce obligatorio de 350ms (Roadmap 4.2)
  const manejarCambioTexto = (e) => {
    const nuevoTexto = e.target.value;
    setTextoLocal(nuevoTexto);
    setEstaEscribiendo(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setEstaEscribiendo(false);
      onCambioFiltros({ q: nuevoTexto });
    }, 350);
  };

  const limpiarTexto = () => {
    setTextoLocal('');
    if (timerRef.current) clearTimeout(timerRef.current);
    setEstaEscribiendo(false);
    onCambioFiltros({ q: '' });
  };

  const seleccionarConsultaDemo = (consulta) => {
    setTextoLocal(consulta.q);
    if (timerRef.current) clearTimeout(timerRef.current);
    setEstaEscribiendo(false);
    onCambioFiltros({ q: consulta.q });
  };

  // Validar rango de precios
  const precioMinNum = filtros.precioMin !== '' ? Number(filtros.precioMin) : undefined;
  const precioMaxNum = filtros.precioMax !== '' ? Number(filtros.precioMax) : undefined;
  const errorRangoPrecios =
    precioMinNum !== undefined &&
    precioMaxNum !== undefined &&
    !Number.isNaN(precioMinNum) &&
    !Number.isNaN(precioMaxNum) &&
    precioMinNum > precioMaxNum;

  // Determinar explicación del modo según alpha
  const alphaVal = Number(filtros.alpha ?? 1);
  let modoTexto = '';
  let modoEtiqueta = '';
  let modoClase = '';

  if (alphaVal <= 0) {
    modoTexto = 'BM25 Léxico puro · Coincidencia de palabras exactas · 0 consumo de embeddings';
    modoEtiqueta = 'bm25';
    modoClase = 'modo-bm25';
  } else if (alphaVal >= 1) {
    modoTexto = 'Vectorial nearText · Similitud semántica por significado · 1 embedding';
    modoEtiqueta = 'vector';
    modoClase = 'modo-vector';
  } else {
    modoTexto = `Híbrido fusionado (α = ${alphaVal.toFixed(2)}) · Combina léxico y semántica · 1 embedding`;
    modoEtiqueta = 'hybrid';
    modoClase = 'modo-hybrid';
  }

  const hayFiltrosActivos =
    filtros.categoria ||
    filtros.ciudad ||
    filtros.estado ||
    filtros.precioMin !== '' ||
    filtros.precioMax !== '' ||
    filtros.alpha !== 1;

  const restablecerFiltros = () => {
    onCambioFiltros({
      categoria: '',
      ciudad: '',
      estado: '',
      precioMin: '',
      precioMax: '',
      alpha: 1,
    });
  };

  return (
    <section className="seccion-buscador-controles" aria-labelledby="titulo-controles">
      {/* Barra de Búsqueda Principal con Debounce */}
      <div className="barra-busqueda-contenedor">
        <label htmlFor="input-busqueda-principal" className="sr-only">
          Buscar por necesidad o palabra clave
        </label>
        <div className="input-envoltorio">
          <span className="icono-lupa" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            id="input-busqueda-principal"
            type="text"
            className="input-busqueda"
            placeholder="¿Qué estás buscando? Ej: 'algo para calentar la sala' o 'mueble para guardar ropa'"
            value={textoLocal}
            onChange={manejarCambioTexto}
            autoComplete="off"
            spellCheck="false"
          />

          {textoLocal && (
            <button
              type="button"
              className="btn-limpiar"
              onClick={limpiarTexto}
              aria-label="Borrar texto de búsqueda"
              title="Borrar búsqueda"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          <div className="indicador-debounce" title="Debounce de 350ms activo para cuidar la cuota diaria de 2.000 embeddings">
            {estaEscribiendo ? (
              <span className="debounce-activo">
                <span className="spinner-mini" aria-hidden="true" /> 350 ms...
              </span>
            ) : cargando ? (
              <span className="debounce-listo">Buscando...</span>
            ) : (
              <span className="debounce-espera">Debounce 350ms</span>
            )}
          </div>
        </div>
      </div>

      {/* Consultas Rápidas de Demostración (Evaluación §2 y Roadmap 7.4) */}
      <div className="consultas-rapidas">
        <span className="consultas-titulo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Pruebas Rápidas:
        </span>
        <div className="pildoras-demo-lista">
          {CONSULTAS_DEMO.map((demo, idx) => (
            <button
              key={idx}
              type="button"
              className={`pildora-demo ${textoLocal === demo.q ? 'activa' : ''} ${demo.tipo === 'exacta' ? 'demo-exacta' : 'demo-semantica'}`}
              onClick={() => seleccionarConsultaDemo(demo)}
              title={`${demo.q} — ${demo.explicacion}`}
            >
              <span className="pildora-tipo">{demo.tipo === 'exacta' ? 'LÉX' : 'SEM'}</span>
              <span className="pildora-texto">{demo.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel de Controles Avanzados (Alpha + Filtros) */}
      <div className="panel-controles">
        {/* Deslizador de Alpha (Roadmap 4.3 y Contrato §3.2) */}
        <div className="control-bloque control-alpha">
          <div className="alpha-cabecera">
            <div className="alpha-rotulo-contenedor">
              <label htmlFor="deslizador-alpha" className="alpha-etiqueta">
                Balance Híbrido: Alpha (α)
              </label>
              <span className={`badge-modo-alpha ${modoClase}`}>
                {modoEtiqueta.toUpperCase()} = {alphaVal.toFixed(2)}
              </span>
            </div>
            <div className="alpha-resumen-modo" aria-live="polite">
              {modoTexto}
            </div>
          </div>

          <div className="deslizador-envoltorio">
            <span className="extremo-rotulo extremo-izq">
              <strong>0</strong> Palabras exactas (BM25)
            </span>
            <input
              id="deslizador-alpha"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={alphaVal}
              onChange={(e) => onCambioFiltros({ alpha: parseFloat(e.target.value) })}
              className="deslizador-rango"
              aria-valuemin="0"
              aria-valuemax="1"
              aria-valuenow={alphaVal}
              aria-valuetext={`Alpha ${alphaVal.toFixed(2)}: ${modoTexto}`}
            />
            <span className="extremo-rotulo extremo-der">
              Significado (Vectorial) <strong>1</strong>
            </span>
          </div>

          <div className="alpha-marcas">
            <button
              type="button"
              className={`btn-marca-alpha ${alphaVal === 0 ? 'activo' : ''}`}
              onClick={() => onCambioFiltros({ alpha: 0 })}
            >
              α = 0 (BM25)
            </button>
            <button
              type="button"
              className={`btn-marca-alpha ${alphaVal === 0.5 ? 'activo' : ''}`}
              onClick={() => onCambioFiltros({ alpha: 0.5 })}
            >
              α = 0.5 (Equilibrado)
            </button>
            <button
              type="button"
              className={`btn-marca-alpha ${alphaVal === 1 ? 'activo' : ''}`}
              onClick={() => onCambioFiltros({ alpha: 1 })}
              title="Recomendado por docs/evaluacion.md §2"
            >
              α = 1 (Vectorial por Defecto)
            </button>
          </div>
        </div>

        {/* Filtros de Rango de Precio y Metadatos */}
        <div className="control-bloque control-filtros-meta">
          <div className="fila-filtros">
            {/* Rango de Precios */}
            <div className="grupo-input-precio">
              <label className="filtro-etiqueta" htmlFor="precio-min">
                Rango de Precio (COP)
              </label>
              <div className="inputs-rango-precios">
                <input
                  id="precio-min"
                  type="number"
                  placeholder="Mínimo ($)"
                  min="0"
                  step="10000"
                  value={filtros.precioMin ?? ''}
                  onChange={(e) => onCambioFiltros({ precioMin: e.target.value })}
                  className={`input-numero ${errorRangoPrecios ? 'input-error' : ''}`}
                />
                <span className="separador-rango" aria-hidden="true">—</span>
                <input
                  id="precio-max"
                  type="number"
                  placeholder="Máximo ($)"
                  min="0"
                  step="10000"
                  value={filtros.precioMax ?? ''}
                  onChange={(e) => onCambioFiltros({ precioMax: e.target.value })}
                  className={`input-numero ${errorRangoPrecios ? 'input-error' : ''}`}
                />
              </div>
              {errorRangoPrecios && (
                <span className="mensaje-error-campo" role="alert">
                  ⚠ precioMin no puede ser mayor que precioMax
                </span>
              )}
            </div>

            {/* Selector de Categoría */}
            <div className="grupo-selector">
              <label className="filtro-etiqueta" htmlFor="selector-categoria">
                Categoría
              </label>
              <select
                id="selector-categoria"
                value={filtros.categoria || ''}
                onChange={(e) => onCambioFiltros({ categoria: e.target.value })}
                className="select-filtro"
              >
                <option value="">Todas las categorías (12)</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat.valor} value={cat.valor}>
                    {cat.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Ciudad */}
            <div className="grupo-selector">
              <label className="filtro-etiqueta" htmlFor="selector-ciudad">
                Ciudad
              </label>
              <select
                id="selector-ciudad"
                value={filtros.ciudad || ''}
                onChange={(e) => onCambioFiltros({ ciudad: e.target.value })}
                className="select-filtro"
              >
                <option value="">Todas las ciudades (8)</option>
                {CIUDADES.map((ciu) => (
                  <option key={ciu.valor} value={ciu.valor}>
                    {ciu.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Estado */}
            <div className="grupo-selector">
              <label className="filtro-etiqueta" htmlFor="selector-estado">
                Estado
              </label>
              <select
                id="selector-estado"
                value={filtros.estado || ''}
                onChange={(e) => onCambioFiltros({ estado: e.target.value })}
                className="select-filtro"
              >
                <option value="">Todos los estados (4)</option>
                {ESTADOS.map((est) => (
                  <option key={est.valor} value={est.valor}>
                    {est.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barra de estado de filtros y restablecimiento */}
          <div className="barra-filtros-inferior">
            <div className="info-resultados-en-vivo">
              {cargando ? (
                <span className="estado-cargando-texto">Consultando Weaviate...</span>
              ) : (
                <span>
                  Resultados: <strong>{totalResultados}</strong> publicaciones
                  {tomoMs !== undefined && tomoMs !== null && (
                    <span className="tomo-ms"> en {tomoMs} ms</span>
                  )}
                  {modoRespuesta && (
                    <span className={`badge-modo-res ${modoRespuesta}`}>
                      modo: {modoRespuesta}
                    </span>
                  )}
                </span>
              )}
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                className="btn-restablecer"
                onClick={restablecerFiltros}
                title="Restablecer todos los filtros a sus valores por defecto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Restablecer filtros
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
