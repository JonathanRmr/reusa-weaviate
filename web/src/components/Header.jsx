import React from 'react';

export function Header({
  salud,
  cargandoSalud,
  onRefrescarSalud,
  vistaActual,
  onCambiarVista,
}) {
  const conectado = salud && salud.weaviate;
  const objetos = salud?.objetos ?? 0;

  return (
    <header className="cabecera-principal" role="banner">
      <div className="cabecera-contenedor">
        <div className="cabecera-marca">
          <div className="logo-icono" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <div className="titulo-fila">
              <h1 className="logo-texto">Reusa</h1>
              <span className="insignia-fase" title="Fase 4: Frontend y UX">Fase 4 · Weaviate</span>
            </div>
            <p className="logo-subtexto">Marketplace de segunda mano con búsqueda semántica vectorial</p>
          </div>
        </div>

        <div className="cabecera-acciones">
          {/* Indicador de estado GET /api/salud */}
          <div
            className={`indicador-salud ${conectado ? 'conectado' : 'desconectado'}`}
            title={conectado ? 'Weaviate Cloud en línea y listo' : 'Weaviate Cloud no responde'}
            aria-live="polite"
          >
            <span className="punto-pulso" aria-hidden="true" />
            <div className="info-salud">
              <span className="estado-texto">
                {cargandoSalud ? 'Verificando...' : conectado ? 'Weaviate Cloud Activo' : 'Weaviate Desconectado'}
              </span>
              <span className="objetos-texto">
                <strong>{objetos}</strong> objetos indexados
              </span>
            </div>
            <button
              type="button"
              className="btn-icono-salud"
              onClick={onRefrescarSalud}
              title="Refrescar estado de Weaviate"
              aria-label="Refrescar estado de Weaviate"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </div>

          <div className="videobeam-tag" title="Paleta optimizada con contraste reforzado y foco visible para proyectores">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
            </svg>
            <span>Alto Contraste Videobeam</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación de Vistas */}
      <nav className="navegacion-vistas" aria-label="Navegación de módulos">
        <button
          type="button"
          className={`pestana-btn ${vistaActual === 'explorador' ? 'activa' : ''}`}
          onClick={() => onCambiarVista('explorador')}
          aria-selected={vistaActual === 'explorador'}
          role="tab"
          id="tab-explorador"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Búsqueda Principal & Filtros (F1–F3)</span>
        </button>

        <button
          type="button"
          className={`pestana-btn ${vistaActual === 'comparativa' ? 'activa' : ''}`}
          onClick={() => onCambiarVista('comparativa')}
          aria-selected={vistaActual === 'comparativa'}
          role="tab"
          id="tab-comparativa"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="9" height="18" rx="2" />
            <rect x="13" y="3" width="9" height="18" rx="2" />
          </svg>
          <span>Vista Comparativa F4: Léxico vs Vectorial</span>
          <span className="badge-demo">Demo Clave</span>
        </button>
      </nav>
    </header>
  );
}
