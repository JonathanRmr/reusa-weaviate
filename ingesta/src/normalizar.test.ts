import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarCategoria,
  normalizarCiudad,
  normalizarCodigo,
  normalizarEstado,
  normalizarFecha,
  normalizarPrecio,
  RE_CODIGO,
} from './normalizar.ts';

test('precio: todos los formatos que aparecen en el CSV', () => {
  const casos: Array<[string, number]> = [
    ['$ 120.000', 120000],
    ['$450.000', 450000],
    ['780000', 780000],
    ['350.000', 350000],
    ['$280,000', 280000],
    ['80 mil', 80000],
    ['$ 4.800.000', 4800000],
    ["$1'200.000", 1200000],
    ['2.5 millones', 2500000],
    ['1 millon', 1000000],
    ['  $ 60.000 COP ', 60000],
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(normalizarPrecio(entrada), esperado, `fallo con "${entrada}"`);
  }
});

test('precio: el orden numerico no es el alfabetico', () => {
  const precios = ['1.000.000', '90.000'].map((p) => normalizarPrecio(p)!);
  assert.ok(precios[0] > precios[1], 'un millon debe ser mayor que noventa mil');
});

test('precio: rechaza lo que no es un precio', () => {
  for (const basura of ['', '   ', 'negociable', '$', '999.999.999.999']) {
    assert.equal(normalizarPrecio(basura), null, `deberia rechazar "${basura}"`);
  }
});

test('fecha: acepta los cuatro formatos del CSV', () => {
  const casos: Array<[string, string]> = [
    ['2025-09-14', '2025-09-14'],
    ['2025/09/08', '2025-09-08'],
    ['12/09/2025', '2025-09-12'],
    ['14-09-2025', '2025-09-14'],
    ['5/3/2025', '2025-03-05'],
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(normalizarFecha(entrada)!.toISOString().slice(0, 10), esperado, `fallo con "${entrada}"`);
  }
});

test('fecha: rechaza fechas imposibles y basura', () => {
  for (const basura of ['', '31/02/2025', '2025-13-01', '14 de septiembre', '2025-09']) {
    assert.equal(normalizarFecha(basura), null, `deberia rechazar "${basura}"`);
  }
});

test('estado: mapea sinonimos a los cuatro valores del esquema', () => {
  assert.equal(normalizarEstado('NUEVO'), 'nuevo');
  assert.equal(normalizarEstado('Casi nuevo'), 'como nuevo');
  assert.equal(normalizarEstado('como  nuevo'), 'como nuevo');
  assert.equal(normalizarEstado('de segunda'), 'usado');
  assert.equal(normalizarEstado('Para Repuestos'), 'para repuestos');
  assert.equal(normalizarEstado('dañado'), 'para repuestos');
  assert.equal(normalizarEstado('regular'), null);
});

test('categoria: lista cerrada, tolera acentos y mayusculas', () => {
  assert.equal(normalizarCategoria('Tecnología'), 'tecnologia');
  assert.equal(normalizarCategoria('ELECTRODOMESTICOS'), 'electrodomesticos');
  assert.equal(normalizarCategoria('vehículos'), 'vehiculos');
  assert.equal(normalizarCategoria('otros'), null);
});

test('ciudad: queda canonica para filtrar exacto', () => {
  assert.equal(normalizarCiudad('bogotá'), 'Bogota');
  assert.equal(normalizarCiudad('  MEDELLIN '), 'Medellin');
  assert.equal(normalizarCiudad('villa de leyva'), 'Villa De Leyva');
});

test('codigo: se canoniza y se valida el formato', () => {
  assert.equal(normalizarCodigo(' reu-e001 '), 'REU-E001');
  assert.ok(RE_CODIGO.test('REU-E001'));
  assert.ok(RE_CODIGO.test('REU-J012'));
  assert.ok(!RE_CODIGO.test('E001'));
});
