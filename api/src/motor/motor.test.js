// Pruebas sin red de las piezas puras del motor: `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import weaviate from 'weaviate-client';
import { construirFiltros, condicionesExactas, ESTADOS, normalizarCiudad, normalizarValor } from './filtros.js';
import { elegirModo } from './modo.js';
import { aResultado, normalizarCodigo, redondear } from './publicacion.js';
import { esPosibleDuplicado, proporcionPrecio, TOLERANCIA_PRECIO, UMBRAL_DISTANCIA } from './umbral.js';

const f = weaviate.filter;
const resumen = (filtro) =>
  (filtro.filters ?? [filtro]).map(({ operator, target, value }) => `${target.property} ${operator} ${value}`);

test('sin parámetros de filtro no se manda filtro', () => {
  assert.equal(construirFiltros(f, {}), undefined);
  assert.equal(construirFiltros(f, { categoria: undefined, precioMin: undefined }), undefined);
});

test('un solo filtro no se envuelve en un And', () => {
  assert.deepEqual(resumen(construirFiltros(f, { categoria: 'muebles' })), ['categoria Equal muebles']);
});

test('los filtros se combinan con And y el precio usa rangos inclusivos', () => {
  const filtro = construirFiltros(f, { categoria: 'hogar', precioMin: 1000, precioMax: 50000 });
  assert.equal(filtro.operator, 'And');
  assert.deepEqual(resumen(filtro), [
    'categoria Equal hogar',
    'precio GreaterThanEqual 1000',
    'precio LessThanEqual 50000',
  ]);
});

test('precio 0 es un filtro válido, no ausencia de filtro', () => {
  assert.deepEqual(resumen(construirFiltros(f, { precioMin: 0 })), ['precio GreaterThanEqual 0']);
});

test('los valores de filtro se llevan a la forma en que se ingestaron', () => {
  assert.equal(normalizarValor(' Tecnología '), 'tecnologia');
  assert.equal(normalizarValor('Como  Nuevo'), 'como nuevo');
  assert.equal(normalizarCiudad('bogotá'), 'Bogota');
  assert.equal(normalizarCiudad('VILLAVICENCIO'), 'Villavicencio');
  assert.deepEqual(resumen(construirFiltros(f, { ciudad: 'medellín', categoria: 'Electrodomésticos' })), [
    'categoria Equal electrodomesticos',
    'ciudad Equal Medellin',
  ]);
});

test('estado "nuevo" excluye los "como nuevo" que la tokenización por palabras dejaría pasar', () => {
  assert.deepEqual(resumen(construirFiltros(f, { estado: 'Nuevo' })), ['estado Equal nuevo', 'estado NotEqual como']);
});

test('los demás estados no necesitan exclusión: ninguno está contenido en otro', () => {
  for (const estado of ['como nuevo', 'usado', 'para repuestos']) {
    assert.deepEqual(resumen(construirFiltros(f, { estado })), [`estado Equal ${estado}`]);
  }
});

test('la exclusión es general para cualquier lista cerrada', () => {
  const condiciones = condicionesExactas(f, 'x', 'rojo', ['rojo', 'rojo oscuro', 'azul', 'rojo claro']);
  assert.deepEqual(
    condiciones.map(({ operator, value }) => `${operator} ${value}`),
    ['Equal rojo', 'NotEqual oscuro', 'NotEqual claro']
  );
  assert.equal(ESTADOS.length, 4);
});

test('alpha decide el operador: bm25 en 0, nearText en 1, híbrido en medio', () => {
  assert.equal(elegirModo(0), 'bm25');
  assert.equal(elegirModo(0.01), 'hybrid');
  assert.equal(elegirModo(0.65), 'hybrid');
  assert.equal(elegirModo(0.99), 'hybrid');
  assert.equal(elegirModo(1), 'vector');
});

test('el resultado cumple el contrato y deja en null la métrica que el modo no calcula', () => {
  const resultado = aResultado({
    properties: {
      codigo: 'REU-E001',
      titulo: 'Vendo calefactor casi nuevo barato',
      descripcionOriginal: 'VENDO CALEFACTOR',
      descripcionLimpia: 'no debe salir',
      categoria: 'electrodomesticos',
      precio: 120000,
      ciudad: 'Tunja',
      estado: 'como nuevo',
      fechaPublicacion: new Date('2025-09-14T00:00:00.000Z'),
      imagenUrl: 'https://picsum.photos/seed/REU-E001/600/400',
    },
    metadata: { distance: 0.66234 },
  });
  assert.deepEqual(Object.keys(resultado), [
    'codigo', 'titulo', 'descripcionOriginal', 'categoria', 'precio', 'ciudad',
    'estado', 'fechaPublicacion', 'imagenUrl', 'score', 'distance',
  ]);
  assert.equal(resultado.fechaPublicacion, '2025-09-14T00:00:00.000Z');
  assert.equal(resultado.distance, 0.662);
  assert.equal(resultado.score, null);
});

test('una publicación sin fecha sale con null, no con undefined', () => {
  const resultado = aResultado({ properties: { codigo: 'REU-X1' }, metadata: { score: 0.5 } });
  assert.equal(resultado.fechaPublicacion, null);
  assert.equal(resultado.imagenUrl, null);
  assert.equal(resultado.distance, null);
});

test('redondeo a tres decimales y null para lo que no es número', () => {
  assert.equal(redondear(0.12345), 0.123);
  assert.equal(redondear(undefined), null);
  assert.equal(redondear(Number.NaN), null);
});

test('el código se normaliza igual que en la ingesta', () => {
  assert.equal(normalizarCodigo('  reu-e001 '), 'REU-E001');
});

test('posible duplicado: distancia estrictamente por debajo del umbral', () => {
  const base = { ciudad: 'Tunja', precio: 120000 };
  const igual = { ciudad: 'Tunja', precio: 115000 };
  assert.equal(esPosibleDuplicado(UMBRAL_DISTANCIA - 0.001, base, igual), true);
  assert.equal(esPosibleDuplicado(UMBRAL_DISTANCIA, base, igual), false);
  assert.equal(esPosibleDuplicado(undefined, base, igual), false);
});

test('posible duplicado: otra ciudad o un precio muy distinto lo descartan aunque el texto sea casi igual', () => {
  // Las dos consolas del catálogo: 0.157 de distancia, pero Medellín/Bogotá y $1.250.000/$950.000.
  const consola4 = { ciudad: 'Medellin', precio: 1250000 };
  assert.equal(esPosibleDuplicado(0.157, consola4, { ciudad: 'Bogota', precio: 1250000 }), false);
  assert.equal(esPosibleDuplicado(0.157, consola4, { ciudad: 'Medellin', precio: 950000 }), false);
  assert.equal(esPosibleDuplicado(0.157, consola4, { ciudad: 'Medellin', precio: 1000000 }), true);
});

test('proporción de precio simétrica y tolerante a precio 0', () => {
  assert.equal(proporcionPrecio(80, 100), 0.8);
  assert.equal(proporcionPrecio(100, 80), 0.8);
  assert.equal(proporcionPrecio(0, 0), 1);
  assert.equal(TOLERANCIA_PRECIO, 0.8);
});
