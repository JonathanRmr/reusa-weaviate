import { Router } from 'express';
import { validarBusqueda, ErrorValidacion } from '../validation.js';
import { clave, obtener, guardar } from '../cache.js';

export const buscarRouter = Router();

// STUB (roadmap 2.2): hasta que Alejandro (Fase 3) conecte col.query.hybrid(), esta
// ruta responde datos fijos que ya cumplen el contrato, para que David pueda construir
// el frontend completo desde el día 1 sin esperar al motor de búsqueda real.
const RESULTADOS_STUB = [
  {
    codigo: 'REU-0042',
    titulo: 'Calefactor eléctrico 1500W',
    descripcionOriginal: 'VENDO CALEFACTOR CASI NUEVO BARATO ESCRIBIR WPP 300 000 0000',
    categoria: 'hogar',
    precio: 85000,
    ciudad: 'Tunja',
    estado: 'usado',
    fechaPublicacion: '2026-09-12',
    imagenUrl: 'https://via.placeholder.com/300x200?text=REU-0042',
    score: 0.734,
    distance: 0.41,
  },
  {
    codigo: 'REU-0105',
    titulo: 'Estufa de gas 4 puestos',
    descripcionOriginal: 'Estufa en buen estado, poco uso, se vende por mudanza.',
    categoria: 'hogar',
    precio: 250000,
    ciudad: 'Bogotá',
    estado: 'como nuevo',
    fechaPublicacion: '2026-08-30',
    imagenUrl: 'https://via.placeholder.com/300x200?text=REU-0105',
    score: 0.611,
    distance: 0.52,
  },
];

buscarRouter.get('/', async (req, res, next) => {
  try {
    const params = validarBusqueda(req.query);
    const key = clave('buscar', params);

    const enCache = obtener(key);
    if (enCache) {
      return res.json(enCache);
    }

    const inicio = Date.now();
    // TODO(Fase 3 - Alejandro): reemplazar por col.query.hybrid(params.q, {...}).
    const cuerpo = {
      resultados: RESULTADOS_STUB.slice(0, params.limit),
      tomoMs: Date.now() - inicio,
      modo: 'hybrid',
    };

    guardar(key, cuerpo);
    res.json(cuerpo);
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    next(error);
  }
});
