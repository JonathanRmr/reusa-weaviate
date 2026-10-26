import { Router } from 'express';
import { validarLimiteSimilares, ErrorValidacion } from '../validation.js';
import { similares, ErrorNoEncontrado } from '../motor/similares.js';

export const similaresRouter = Router();

similaresRouter.get('/:codigo', async (req, res, next) => {
  try {
    const limit = validarLimiteSimilares(req.query);
    res.json(await similares(req.params.codigo, limit));
  } catch (error) {
    if (error instanceof ErrorValidacion || error instanceof ErrorNoEncontrado) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    next(error);
  }
});
