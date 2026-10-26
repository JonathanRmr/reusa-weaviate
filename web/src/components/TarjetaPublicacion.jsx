import React, { useState } from 'react';
import { formatearCOP } from '../constantes';

export function TarjetaPublicacion({
  publicacion,
  modo,
  onSeleccionar,
  insigniaComparativa,
  posicionRanking,
}) {
  const [errorImagen, setErrorImagen] = useState(false);

  const {
    codigo,
    titulo,
    precio,
    ciudad,
    categoria,
    estado,
    imagenUrl,
    score,
    distance,
  } = publicacion;

  // Renderizar la métrica según el modo devuelto por Weaviate (Roadmap 3.2 y 4.3)
  const renderizarMetrica = () => {
    if (modo === 'vector') {
      const distNum = typeof distance === 'number' ? distance.toFixed(3) : '—';
      return (
        <div className="metrica-caja metrica-vector" title="Distancia coseno: 0 es idéntico y 2 es opuesto. Métrica absoluta de disimilitud, NUNCA porcentaje.">
          <span className="metrica-etiqueta">Distancia Coseno</span>
          <span className="metrica-valor">{distNum}</span>
          <span className="metrica-ayuda">0 = idéntico · 2 = opuesto</span>
        </div>
      );
    }

    if (modo === 'bm25') {
      const scoreNum = typeof score === 'number' ? score.toFixed(2) : '—';
      return (
        <div className="metrica-caja metrica-bm25" title="Puntaje de coincidencia léxica BM25 (escala abierta sin acotar).">
          <span className="metrica-etiqueta">Score BM25</span>
          <span className="metrica-valor">{scoreNum}</span>
          <span className="metrica-ayuda">coincidencia exacta</span>
        </div>
      );
    }

    // Por defecto modo hybrid
    const scoreNum = typeof score === 'number' ? score.toFixed(3) : '—';
    return (
      <div className="metrica-caja metrica-hybrid" title="Score híbrido fusionado normalizado en [0, 1] dentro de esta consulta.">
        <span className="metrica-etiqueta">Score Híbrido</span>
        <span className="metrica-valor">{scoreNum}</span>
        <span className="metrica-ayuda">fusión normalizada [0, 1]</span>
      </div>
    );
  };

  return (
    <article
      className="tarjeta-publicacion"
      onClick={() => onSeleccionar && onSeleccionar(publicacion)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSeleccionar) {
            onSeleccionar(publicacion);
          }
        }
      }}
      aria-label={`Ver detalles de ${titulo}, precio ${formatearCOP(precio)}`}
    >
      {/* Contenedor de Imagen con Fallback */}
      <div className="tarjeta-imagen-contenedor">
        {!errorImagen && imagenUrl ? (
          <img
            src={imagenUrl}
            alt={titulo}
            className="tarjeta-imagen"
            loading="lazy"
            onError={() => setErrorImagen(true)}
          />
        ) : (
          <div className="tarjeta-imagen-fallback" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="fallback-cat">{categoria}</span>
          </div>
        )}

        {posicionRanking !== undefined && (
          <span className="insignia-ranking" title={`Posición en ranking: #${posicionRanking}`}>
            #{posicionRanking}
          </span>
        )}

        {insigniaComparativa && (
          <span className={`insignia-comparativa ${insigniaComparativa.tipo}`}>
            {insigniaComparativa.texto}
          </span>
        )}
      </div>

      {/* Contenido de la Tarjeta */}
      <div className="tarjeta-cuerpo">
        <div className="tarjeta-encabezado-fila">
          <span className="tarjeta-codigo">{codigo}</span>
          <span className="tarjeta-ciudad">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {ciudad}
          </span>
        </div>

        <h3 className="tarjeta-titulo" title={titulo}>
          {titulo}
        </h3>

        <div className="tarjeta-precio-fila">
          <span className="tarjeta-precio">{formatearCOP(precio)}</span>
          <span className="tarjeta-moneda">COP</span>
        </div>

        {/* Badges de Categoría y Estado */}
        <div className="tarjeta-insignias-fila">
          <span className="badge-categoria">{categoria}</span>
          <span className={`badge-estado estado-${estado.replace(/\s+/g, '-')}`}>
            {estado}
          </span>
        </div>

        {/* Caja de Métrica Estricta según modo */}
        <div className="tarjeta-metrica-contenedor">
          {renderizarMetrica()}
        </div>
      </div>
    </article>
  );
}
