import React from 'react';
import { TarjetaPublicacion } from './TarjetaPublicacion';
import { ERRORES_API } from '../constantes';

export function RejillaResultados({
  cargando,
  error,
  resultados,
  modo,
  onSeleccionarPublicacion,
  terminoBusqueda,
}) {
  // Estado de Carga: Skeletons de Alto Contraste
  if (cargando) {
    return (
      <div className="rejilla-carga" aria-busy="true" aria-label="Cargando resultados de Weaviate">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="esqueleto-tarjeta">
            <div className="esqueleto-imagen" />
            <div className="esqueleto-linea corta" />
            <div className="esqueleto-linea larga" />
            <div className="esqueleto-linea mediana" />
            <div className="esqueleto-metrica" />
          </div>
        ))}
      </div>
    );
  }

  // Estado de Error: Mensajes legibles según el contrato de la API
  if (error) {
    const mensajeAmigable = ERRORES_API[error.codigo] || error.message || 'Ocurrió un error inesperado.';

    return (
      <div className="estado-mensaje estado-error" role="alert">
        <div className="icono-estado-error" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="contenido-estado">
          <h3 className="titulo-estado">No fue posible completar la búsqueda</h3>
          <p className="descripcion-estado">{mensajeAmigable}</p>
          {error.codigo && (
            <span className="codigo-error-badge">Código: {error.codigo}</span>
          )}
        </div>
      </div>
    );
  }

  // Estado Vacío: Término de búsqueda vacío o sin resultados
  if (!resultados || resultados.length === 0) {
    if (!terminoBusqueda || !terminoBusqueda.trim()) {
      return (
        <div className="estado-mensaje estado-inicial">
          <div className="icono-estado" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="titulo-estado">Comienza a buscar en Reusa</h3>
          <p className="descripcion-estado">
            Escribe lo que necesitas en lenguaje natural (ej: <em>"algo para calentar la sala"</em>) o
            haz clic en las <strong>Pruebas Rápidas</strong> arriba para ver la magia de los embeddings.
          </p>
        </div>
      );
    }

    return (
      <div className="estado-mensaje estado-vacio">
        <div className="icono-estado" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15h8" />
            <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
            <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
          </svg>
        </div>
        <h3 className="titulo-estado">Sin coincidencias para "{terminoBusqueda}"</h3>
        <p className="descripcion-estado">
          No se encontraron publicaciones con los filtros seleccionados. Intenta:
        </p>
        <ul className="sugerencias-vacio">
          <li>Aumentar el deslizador <strong>Alpha hacia 1</strong> para buscar por similitud semántica.</li>
          <li>Ampliar o limpiar los filtros de precio, ciudad o estado.</li>
          <li>Describir la necesidad con otras palabras o un término más general.</li>
        </ul>
      </div>
    );
  }

  // Rejilla de Resultados
  return (
    <div className="rejilla-publicaciones" role="region" aria-label="Resultados de búsqueda">
      {resultados.map((item, index) => (
        <TarjetaPublicacion
          key={item.codigo}
          publicacion={item}
          modo={modo}
          posicionRanking={index + 1}
          onSeleccionar={onSeleccionarPublicacion}
        />
      ))}
    </div>
  );
}
