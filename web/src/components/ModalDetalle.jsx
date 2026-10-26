import React, { useState, useEffect } from 'react';
import { consultarSimilares } from '../api';
import { formatearCOP } from '../constantes';

export function ModalDetalle({ publicacion, onCerrar, onSeleccionarOtro }) {
  const [datosSimilares, setDatosSimilares] = useState(null);
  const [cargandoSimilares, setCargandoSimilares] = useState(true);
  const [errorSimilares, setErrorSimilares] = useState(null);
  const [errorImagenPrincipal, setErrorImagenPrincipal] = useState(false);

  const codigoPublicacion = publicacion?.codigo;

  useEffect(() => {
    if (!codigoPublicacion) return;

    let cancelado = false;
    setCargandoSimilares(true);
    setErrorSimilares(null);

    consultarSimilares(codigoPublicacion, 6)
      .then((data) => {
        if (!cancelado) {
          setDatosSimilares(data);
          setCargandoSimilares(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorSimilares(err.message || 'Error al obtener similares');
          setCargandoSimilares(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [codigoPublicacion]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [onCerrar]);

  if (!publicacion) return null;

  const {
    codigo,
    titulo,
    precio,
    ciudad,
    categoria,
    estado,
    fechaPublicacion,
    descripcionOriginal,
    imagenUrl,
  } = publicacion;

  const fechaFormateada = fechaPublicacion
    ? new Date(fechaPublicacion).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No especificada';

  const similares = datosSimilares?.similares || [];

  return (
    <div
      className="modal-superposicion"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="modal-contenido">
        {/* Botón de Cierre */}
        <button
          type="button"
          className="modal-btn-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar ficha de publicación"
          title="Cerrar (Esc)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Sección Superior: Información Principal del Artículo */}
        <div className="modal-articulo-grid">
          {/* Imagen Grande */}
          <div className="modal-imagen-seccion">
            {!errorImagenPrincipal && imagenUrl ? (
              <img
                src={imagenUrl}
                alt={titulo}
                className="modal-imagen-principal"
                onError={() => setErrorImagenPrincipal(true)}
              />
            ) : (
              <div className="modal-imagen-fallback">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{categoria}</span>
              </div>
            )}
            <div className="modal-codigo-tag" title="Clave natural en Weaviate (tokenization: field)">
              <span>Código:</span> <strong>{codigo}</strong>
            </div>
          </div>

          {/* Datos y Metadatos */}
          <div className="modal-datos-seccion">
            <div className="modal-insignias-superiores">
              <span className="badge-categoria">{categoria}</span>
              <span className={`badge-estado estado-${estado.replace(/\s+/g, '-')}`}>{estado}</span>
              <span className="modal-ciudad-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {ciudad}
              </span>
            </div>

            <h2 id="modal-titulo" className="modal-titulo">
              {titulo}
            </h2>

            <div className="modal-precio-bloque">
              <span className="modal-precio-etiqueta">Precio de venta:</span>
              <span className="modal-precio-valor">{formatearCOP(precio)}</span>
              <span className="modal-precio-moneda">COP</span>
            </div>

            <div className="modal-fecha-fila">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Publicado el {fechaFormateada}</span>
            </div>

            {/* Descripción Original con Ruido Real */}
            <div className="modal-bloque-descripcion">
              <div className="descripcion-cabecera">
                <h3 className="descripcion-titulo">Descripción Original de la Publicación</h3>
                <span className="insignia-ruido" title="Contiene el texto tal como lo redactó el vendedor">
                  Texto Real sin Filtro
                </span>
              </div>
              <div className="descripcion-caja-texto">
                {descripcionOriginal || 'Sin descripción disponible.'}
              </div>
              <p className="descripcion-nota-tecnica">
                <strong>Nota técnica (docs/esquema.md §2.3):</strong> Weaviate indexó una versión normalizada
                (<code>descripcionLimpia</code>) que removió números de contacto, mayúsculas sostenidas y emojis para evitar
                que publicaciones no relacionadas se agrupen por coincidencia de muletillas como "escribir al wpp".
              </p>
            </div>
          </div>
        </div>

        {/* Sección Inferior: Detector de Republicaciones F5 */}
        <section className="modal-detector-republicaciones" aria-labelledby="titulo-similares">
          <div className="detector-cabecera">
            <div className="detector-titulo-fila">
              <div className="detector-icono" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <h3 id="titulo-similares" className="detector-titulo">
                  Detector de Republicaciones F5 & Artículos Similares
                </h3>
                <p className="detector-subtitulo">
                  Consulta de vecinos más cercanos vía <code>nearObject(UUID)</code> en Weaviate (0 consumo de embeddings).
                </p>
              </div>
            </div>

            {/* Explicación de la Regla Calibrada */}
            <div className="regla-explicacion-caja">
              <span className="regla-badge">Regla Calibrada (docs/evaluacion.md §3)</span>
              <p className="regla-texto">
                Un vecino se marca como posible republicación si cumple conjuntamente:
                <strong> Distancia coseno &lt; 0.29</strong> + <strong>Misma ciudad</strong> +{' '}
                <strong>Precio a ±20%</strong>. Esta combinación logró 10/10 detecciones y 0 falsos positivos en el catálogo.
              </p>
            </div>
          </div>

          {/* Listado de Similares */}
          <div className="detector-cuerpo">
            {cargandoSimilares ? (
              <div className="detector-cargando">
                <span className="spinner-comparativa" aria-hidden="true" />
                <span>Buscando vecinos en el espacio vectorial...</span>
              </div>
            ) : errorSimilares ? (
              <div className="detector-error">
                <p>No fue posible cargar publicaciones similares: {errorSimilares}</p>
              </div>
            ) : similares.length === 0 ? (
              <div className="detector-vacio">
                <p>No se encontraron publicaciones parecidas en la base de datos.</p>
              </div>
            ) : (
              <div className="franja-similares-grid">
                {similares.map((sim) => {
                  const esDuplicado = sim.posibleDuplicado === true;
                  const distFormateada = typeof sim.distance === 'number' ? sim.distance.toFixed(3) : '—';
                  const mismaCiudad = sim.ciudad === ciudad;
                  const ratioPrecio = precio > 0 && sim.precio > 0
                    ? Math.min(precio, sim.precio) / Math.max(precio, sim.precio)
                    : 1;
                  const precioEnRango = ratioPrecio >= 0.8;

                  return (
                    <div
                      key={sim.codigo}
                      className={`tarjeta-similar ${esDuplicado ? 'sospechosa-duplicado' : ''}`}
                      onClick={() => {
                        if (onSeleccionarOtro) onSeleccionarOtro(sim);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (onSeleccionarOtro) onSeleccionarOtro(sim);
                        }
                      }}
                      title={`Ver detalles de ${sim.titulo}`}
                    >
                      {/* Insignia de Posible Duplicado de Alto Contraste */}
                      {esDuplicado ? (
                        <div className="alerta-duplicado-banner">
                          <span className="alerta-duplicado-icono" aria-hidden="true">⚠️</span>
                          <strong>POSIBLE REPUBLICACIÓN</strong>
                        </div>
                      ) : (
                        <div className="distinto-banner">
                          <span>Artículo Similar</span>
                        </div>
                      )}

                      <div className="similar-imagen-wrap">
                        {sim.imagenUrl ? (
                          <img
                            src={sim.imagenUrl}
                            alt={sim.titulo}
                            className="similar-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="similar-img-fallback">
                            <span>{sim.categoria}</span>
                          </div>
                        )}
                      </div>

                      <div className="similar-info">
                        <div className="similar-codigo-fila">
                          <span className="similar-codigo">{sim.codigo}</span>
                          <span className="similar-ciudad">{sim.ciudad}</span>
                        </div>

                        <h4 className="similar-titulo" title={sim.titulo}>
                          {sim.titulo}
                        </h4>

                        <div className="similar-precio">{formatearCOP(sim.precio)}</div>

                        <div className="similar-distancia-box">
                          <span className="sim-dist-label">Distancia:</span>
                          <strong className="sim-dist-val">{distFormateada}</strong>
                        </div>

                        {/* Desglose de la Regla de Duplicado */}
                        <div className="similar-criterios-check">
                          <span className={`criterio-item ${typeof sim.distance === 'number' && sim.distance < 0.29 ? 'cumple' : 'no-cumple'}`}>
                            {typeof sim.distance === 'number' && sim.distance < 0.29 ? '✓' : '✗'} dist &lt; 0.29
                          </span>
                          <span className={`criterio-item ${mismaCiudad ? 'cumple' : 'no-cumple'}`}>
                            {mismaCiudad ? '✓' : '✗'} misma ciudad
                          </span>
                          <span className={`criterio-item ${precioEnRango ? 'cumple' : 'no-cumple'}`}>
                            {precioEnRango ? '✓' : '✗'} precio ±20%
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn-ver-similar"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSeleccionarOtro) onSeleccionarOtro(sim);
                          }}
                        >
                          Examinar publicación →
                        </button>
                      </div>
                    </div>
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
