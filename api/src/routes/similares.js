import { Router } from 'express';
import { validarLimiteSimilares, ErrorValidacion } from '../validation.js';

export const similaresRouter = Router();

// STUB (roadmap 2.2 / 3.4): Alejandro reemplaza esto por nearObject + umbral calibrado.
const BASE_STUB = {
  codigo: 'REU-0042',
  titulo: 'Calefactor eléctrico 1500W',
  categoria: 'hogar',
  precio: 85000,
  ciudad: 'Tunja',
};

const SIMILARES_STUB = [
  {
    codigo: 'REU-0199',
    titulo: 'Calentador electrico nuevo',
    descripcionOriginal: 'Vendo calentador nuevo, nunca usado, con factura.',
    categoria: 'hogar',
    precio: 90000,
    ciudad: 'Tunja',
    estado: 'nuevo',
    fechaPublicacion: '2026-09-20',
    imagenUrl: 'https://via.placeholder.com/300x200?text=REU-0199',
    distance: 0.08,
    posibleDuplicado: true,
  },
];

similaresRouter.get('/:codigo', async (req, res, next) => {
  try {
    const limit = validarLimiteSimilares(req.query);
    const { codigo } = req.params;

    // Mientras no exista el motor real, cualquier código distinto al de la base
    // de prueba se trata como no encontrado, para que el frontend ejercite también
    // el camino de error 404 que exige el contrato.
    if (codigo !== BASE_STUB.codigo) {
      return res.status(404).json({ error: `No existe la publicación "${codigo}".`, codigo: 'NO_ENCONTRADO' });
    }

    res.json({
      base: BASE_STUB,
      similares: SIMILARES_STUB.slice(0, limit),
    });
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    next(error);
  }
});
