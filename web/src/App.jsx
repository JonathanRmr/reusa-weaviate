import React, { useState, useEffect, useCallback } from 'react';
import { consultarSalud, buscarPublicaciones } from './api';
import { Header } from './components/Header';
import { BuscadorControles } from './components/BuscadorControles';
import { RejillaResultados } from './components/RejillaResultados';
import { VistaComparativa } from './components/VistaComparativa';
import { ModalDetalle } from './components/ModalDetalle';

export function App() {
  // Estado de salud del clúster Weaviate
  const [salud, setSalud] = useState(null);
  const [cargandoSalud, setCargandoSalud] = useState(true);

  // Navegación de vistas: 'explorador' (F1-F3) | 'comparativa' (F4)
  const [vistaActual, setVistaActual] = useState('explorador');

  // Filtros de búsqueda (Roadmap 4.3 y Contrato de la API)
  // Nota: alpha por defecto es 1 según docs/contrato-api.md y docs/evaluacion.md §2
  const [filtros, setFiltros] = useState({
    q: 'algo para calentar la sala',
    alpha: 1,
    limit: 12,
    categoria: '',
    ciudad: '',
    estado: '',
    precioMin: '',
    precioMax: '',
  });

  // Resultados de búsqueda
  const [cargandoResultados, setCargandoResultados] = useState(false);
  const [errorResultados, setErrorResultados] = useState(null);
  const [datosRespuesta, setDatosRespuesta] = useState({
    resultados: [],
    tomoMs: null,
    modo: 'vector',
  });

  // Modal de Ficha de Artículo y Detector de Republicaciones F5
  const [publicacionSeleccionada, setPublicacionSeleccionada] = useState(null);

  // Cargar salud de Weaviate
  const verificarSalud = useCallback(async () => {
    setCargandoSalud(true);
    const estado = await consultarSalud();
    setSalud(estado);
    setCargandoSalud(false);
  }, []);

  useEffect(() => {
    verificarSalud();
  }, [verificarSalud]);

  // Ejecutar búsqueda cuando cambian los filtros
  const ejecutarBusqueda = useCallback(async (paramsActuales) => {
    if (!paramsActuales.q || !paramsActuales.q.trim()) {
      setDatosRespuesta({ resultados: [], tomoMs: null, modo: 'vector' });
      setErrorResultados(null);
      return;
    }

    // Validar rango de precio localmente antes de enviar
    const pMin = paramsActuales.precioMin !== '' ? Number(paramsActuales.precioMin) : undefined;
    const pMax = paramsActuales.precioMax !== '' ? Number(paramsActuales.precioMax) : undefined;
    if (pMin !== undefined && pMax !== undefined && !Number.isNaN(pMin) && !Number.isNaN(pMax) && pMin > pMax) {
      setErrorResultados({
        codigo: 'RANGO_PRECIO_INVALIDO',
        message: 'precioMin no puede ser mayor que precioMax.',
      });
      return;
    }

    setCargandoResultados(true);
    setErrorResultados(null);

    try {
      const respuesta = await buscarPublicaciones(paramsActuales);
      setDatosRespuesta(respuesta);
    } catch (err) {
      setErrorResultados({
        codigo: err.codigo || 'ERROR_BUSQUEDA',
        message: err.message,
      });
      setDatosRespuesta({ resultados: [], tomoMs: null, modo: 'vector' });
    } finally {
      setCargandoResultados(false);
    }
  }, []);

  // Disparar búsqueda al cambiar filtros
  useEffect(() => {
    if (vistaActual === 'explorador') {
      ejecutarBusqueda(filtros);
    }
  }, [filtros, vistaActual, ejecutarBusqueda]);

  const actualizarFiltros = (nuevosValores) => {
    setFiltros((prev) => ({
      ...prev,
      ...nuevosValores,
    }));
  };

  return (
    <div className="aplicacion-reusa">
      {/* Encabezado con Indicador de Salud y Selector de Vistas */}
      <Header
        salud={salud}
        cargandoSalud={cargandoSalud}
        onRefrescarSalud={verificarSalud}
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
      />

      {/* Contenido Principal */}
      <main className="contenedor-principal" id="contenido-principal">
        {vistaActual === 'explorador' ? (
          <>
            {/* Controles de Búsqueda (F1 - F3) con Debounce 350ms */}
            <BuscadorControles
              filtros={filtros}
              onCambioFiltros={actualizarFiltros}
              cargando={cargandoResultados}
              tomoMs={datosRespuesta.tomoMs}
              totalResultados={datosRespuesta.resultados.length}
              modoRespuesta={datosRespuesta.modo}
            />

            {/* Rejilla de Tarjetas de Resultados */}
            <RejillaResultados
              cargando={cargandoResultados}
              error={errorResultados}
              resultados={datosRespuesta.resultados}
              modo={datosRespuesta.modo}
              onSeleccionarPublicacion={setPublicacionSeleccionada}
              terminoBusqueda={filtros.q}
            />
          </>
        ) : (
          /* Vista Comparativa F4: Misma consulta con α=0 vs α=1 */
          <VistaComparativa
            onSeleccionarPublicacion={setPublicacionSeleccionada}
            filtrosGlobales={filtros}
          />
        )}
      </main>

      {/* Ficha de Artículo y Detector de Republicaciones F5 (Modal) */}
      {publicacionSeleccionada && (
        <ModalDetalle
          publicacion={publicacionSeleccionada}
          onCerrar={() => setPublicacionSeleccionada(null)}
          onSeleccionarOtro={(nuevaPub) => setPublicacionSeleccionada(nuevaPub)}
        />
      )}

      {/* Pie de Página de Alto Contraste */}
      <footer className="pie-pagina" role="contentinfo">
        <div className="pie-contenedor">
          <div className="pie-columna">
            <h4 className="pie-titulo">Proyecto Reusa</h4>
            <p className="pie-desc">
              Buscador semántico de artículos de segunda mano con Weaviate Cloud y embeddings multilingües.
            </p>
            <span className="pie-materia">Tendencias Modernas de Bases de Datos</span>
          </div>

          <div className="pie-columna">
            <h4 className="pie-titulo">Equipo de Desarrollo</h4>
            <ul className="pie-lista-equipo">
              <li><strong>David Quijano</strong> — Fase 4: Frontend, UX & Videobeam</li>
              <li><strong>Edwar</strong> — Fase 1: Esquema, Normalización e Ingesta</li>
              <li><strong>Johnatan Romero</strong> — Fase 2: Backend Express & Contrato</li>
              <li><strong>Alejandro Huerfano</strong> — Fase 3: Motor, Evaluación & F5</li>
            </ul>
          </div>

          <div className="pie-columna">
            <h4 className="pie-titulo">Restricciones de Arquitectura</h4>
            <ul className="pie-lista-puntos">
              <li>Colección única <code>Publicacion</code> denormalizada</li>
              <li>Cuota protegida con debounce de 350ms y caché</li>
              <li>Métrica de distancia coseno: 0 = idéntico, 2 = opuesto</li>
              <li>Umbral F5: distancia &lt; 0.29 + ciudad + precio ±20%</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
