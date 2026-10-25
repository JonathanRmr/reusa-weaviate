import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { cerrarCliente } from './weaviateClient.js';
import { saludRouter } from './routes/salud.js';
import { buscarRouter } from './routes/buscar.js';
import { similaresRouter } from './routes/similares.js';

const app = express();

app.use(cors({ origin: env.corsOrigin }));

app.use('/api/salud', saludRouter);
app.use('/api/buscar', buscarRouter);
app.use('/api/similares', similaresRouter);

// Manejador final: traduce cualquier error no controlado a un 502 legible,
// sin filtrar detalles de conexión a Weaviate (roadmap: "nunca exponer la API key").
app.use((error, _req, res, _next) => {
  console.error('[error no controlado]', error);
  res.status(502).json({ error: 'El servicio no está disponible en este momento.', codigo: 'WEAVIATE_NO_DISPONIBLE' });
});

// Escuchar en 0.0.0.0, no en localhost: dentro de un contenedor, "localhost" solo
// acepta conexiones desde dentro del propio contenedor y nadie puede alcanzarlo
// desde fuera (roadmap 2.6) — el `docker compose up` "funciona" pero no responde.
const servidor = app.listen(env.port, '0.0.0.0', () => {
  console.log(`[reusa-api] escuchando en 0.0.0.0:${env.port}`);
});

async function apagar(señal) {
  console.log(`[reusa-api] recibido ${señal}, cerrando...`);
  servidor.close();
  await cerrarCliente();
  process.exit(0);
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
