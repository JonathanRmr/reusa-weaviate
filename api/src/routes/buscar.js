import { Router } from 'express';
import { validarBusqueda, ErrorValidacion } from '../validation.js';
import { clave, obtener, guardar } from '../cache.js';

export const buscarRouter = Router();

// STUB (roadmap 2.2): hasta que Alejandro (Fase 3) conecte col.query.hybrid(), esta
// ruta responde datos fijos que ya cumplen el contrato, para que David pueda construir
// el frontend completo desde el día 1 sin esperar al motor de búsqueda real.
// Valores copiados de objetos reales ya ingestados (Fase 1), para que el frontend
// se construya contra lo que la colección devuelve de verdad y no haya sorpresas al
// cambiar el stub por la búsqueda real. Tres detalles que importan:
//   - `ciudad` va sin tilde ("Bogota"): es clave de filtrado exacto, no texto libre.
//   - `categoria` sale de la lista cerrada de 12 valores (ver docs/esquema.md §3.5).
//   - `fechaPublicacion` es un instante ISO completo, que es como viaja un campo
//     `date` de Weaviate; formatearlo como "2026-09-12" engañaría al frontend.
const RESULTADOS_STUB = [
  {
    codigo: 'REU-E001',
    titulo: 'Vendo calefactor casi nuevo barato',
    descripcionOriginal:
      'VENDO CALEFACTOR ELECTRICO CASI NUEVO!!! 🔥🔥 DOS NIVELES DE CALOR Y TERMOSTATO REGULABLE, LO USE UN SOLO INVIERNO Y QUEDO COMO NUEVO, NO HUMEA NI HUELE A QUEMADO. ESCRIBIR AL WPP 300 000 0000, SOLO INTERESADOS!!! ★★★ GRACIAS POR LEER',
    categoria: 'electrodomesticos',
    precio: 120000,
    ciudad: 'Tunja',
    estado: 'como nuevo',
    fechaPublicacion: '2025-09-14T00:00:00.000Z',
    imagenUrl: 'https://picsum.photos/seed/REU-E001/600/400',
    score: 0.734,
    distance: 0.662,
  },
  {
    codigo: 'REU-E004',
    titulo: 'Estufa de 4 puestos a gas',
    descripcionOriginal:
      'ESTUFA DE SOBREPONER 4 PUESTOS, GAS NATURAL, LOS 4 QUEMADORES PRENDEN BIEN Y LAS PARRILLAS ESTAN COMPLETAS. TIENE EL VIDRIO DE LA TAPA UN POCO OPACO POR EL USO PERO NADA ROTO. PRECIO $ 180.000 NEGOCIABLE 📞 3010000000',
    categoria: 'electrodomesticos',
    precio: 180000,
    ciudad: 'Sogamoso',
    estado: 'usado',
    fechaPublicacion: '2025-09-21T00:00:00.000Z',
    imagenUrl: 'https://picsum.photos/seed/REU-E004/600/400',
    score: 0.611,
    distance: 0.731,
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
