import { Router } from 'express';
import { obtenerCliente } from '../weaviateClient.js';

export const saludRouter = Router();

saludRouter.get('/', async (_req, res) => {
  try {
    const cliente = await obtenerCliente();
    const listo = await cliente.isReady();
    if (!listo) {
      return res.status(502).json({ weaviate: false, objetos: 0 });
    }

    let objetos = 0;
    try {
      const coleccion = cliente.collections.get('Publicacion');
      const agregado = await coleccion.aggregate.overAll();
      objetos = agregado.totalCount ?? 0;
    } catch {
      // La colección puede no existir todavía (Fase 1 en curso): Weaviate sí está
      // vivo, pero no hay esquema cargado aún. No es un fallo de salud del servicio.
      objetos = 0;
    }

    res.json({ weaviate: true, objetos });
  } catch {
    res.status(502).json({ weaviate: false, objetos: 0 });
  }
});
