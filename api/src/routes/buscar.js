import { Router } from 'express';
import { validarBusqueda, ErrorValidacion } from '../validation.js';
import { clave, obtener, guardar } from '../cache.js';
import { buscar } from '../motor/buscar.js';

export const buscarRouter = Router();

buscarRouter.get('/', async (req, res, next) => {
  try {
    const params = validarBusqueda(req.query);
    const key = clave('buscar', params);

    const enCache = obtener(key);
    if (enCache) {
      return res.json(enCache);
    }

    const cuerpo = await buscar(params);

    guardar(key, cuerpo);
    res.json(cuerpo);
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    next(error);
  }
});
