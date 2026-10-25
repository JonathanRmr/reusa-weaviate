import { Router } from 'express';
import { validarLimiteSimilares, ErrorValidacion } from '../validation.js';

export const similaresRouter = Router();

// STUB (roadmap 2.2 / 3.4): Alejandro reemplaza esto por nearObject + umbral calibrado.
// Par real del catálogo ingestado: REU-E001 y su republicación REU-E061, con la
// distancia medida de verdad (0.271). El stub traía 0.08, un valor que no se da en
// este catálogo: el artículo distinto más parecido está a 0.556, así que la frontera
// entre "republicación" y "parecido" vive cerca de 0.40, no de 0.10. Importa porque
// el frontend calibra contra estos números la insignia de posible republicación.
// El umbral definitivo lo fija Alejandro en 3.4 con datos/pares-republicados.csv.
const BASE_STUB = {
  codigo: 'REU-E001',
  titulo: 'Vendo calefactor casi nuevo barato',
  categoria: 'electrodomesticos',
  precio: 120000,
  ciudad: 'Tunja',
};

const SIMILARES_STUB = [
  {
    codigo: 'REU-E061',
    titulo: 'Calefactor ceramico para habitacion',
    descripcionOriginal:
      'Vendo calefactor ceramico con dos niveles de temperatura y apagado automatico si se voltea. Lo compre el invierno pasado y lo use poquito porque me cambie de casa. Calienta una habitacion mediana en diez minutos',
    categoria: 'electrodomesticos',
    precio: 115000,
    ciudad: 'Tunja',
    estado: 'como nuevo',
    fechaPublicacion: '2025-10-08T00:00:00.000Z',
    imagenUrl: 'https://picsum.photos/seed/REU-E061/600/400',
    distance: 0.271,
    posibleDuplicado: true,
  },
  {
    codigo: 'REU-E047',
    titulo: 'Estufa electrica portatil 2 puestos',
    descripcionOriginal:
      'ESTUFA ELECTRICA PORTATIL DE DOS PUESTOS, LAS RESISTENCIAS CALIENTAN RAPIDO Y LA PERILLA REGULA BIEN LA TEMPERATURA. SIRVE PARA HABITACION O FINCA DONDE NO HAY GAS. PESA POCO Y CABE EN UNA MALETA 🍳',
    categoria: 'electrodomesticos',
    precio: 75000,
    ciudad: 'Sogamoso',
    estado: 'usado',
    fechaPublicacion: '2025-09-24T00:00:00.000Z',
    imagenUrl: 'https://picsum.photos/seed/REU-E047/600/400',
    distance: 0.558,
    posibleDuplicado: false,
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
