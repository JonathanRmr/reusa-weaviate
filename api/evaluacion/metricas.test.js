import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanciaCoseno,
  elegirCorte,
  percentil,
  precisionEnK,
  promedio,
  rangoReciproco,
  recall,
  techoPrecision,
} from './metricas.js';
import { CONSULTAS } from './consultas.js';

test('Precision@5 cuenta lo que falta como fallo', () => {
  assert.equal(precisionEnK(['a', 'x', 'b', 'y', 'z', 'c'], ['a', 'b', 'c'], 5), 0.4);
  assert.equal(precisionEnK(['a'], ['a'], 5), 0.2);
  assert.equal(precisionEnK([], ['a'], 5), 0);
});

test('el techo refleja cuántos relevantes existen', () => {
  assert.equal(techoPrecision(['a', 'b', 'c'], 5), 0.6);
  assert.equal(techoPrecision(['a', 'b', 'c', 'd', 'e', 'f'], 5), 1);
});

test('rango recíproco: primer relevante en la posición 3 vale 1/3', () => {
  assert.equal(rangoReciproco(['x', 'y', 'a', 'b'], ['a', 'b']), 1 / 3);
  assert.equal(rangoReciproco(['x', 'y'], ['a']), 0);
});

test('recall con y sin esperados', () => {
  assert.equal(recall(['a', 'b'], ['a', 'b', 'c', 'd']), 0.5);
  assert.equal(recall([], []), 1);
});

test('distancia coseno: 0 idéntico, 1 ortogonal, 2 opuesto, sin importar la norma', () => {
  assert.equal(distanciaCoseno([1, 2, 3], [2, 4, 6]), 0);
  assert.equal(distanciaCoseno([1, 0], [0, 5]), 1);
  assert.equal(distanciaCoseno([1, 0], [-3, 0]), 2);
});

test('percentil por rango más cercano', () => {
  assert.equal(percentil([5, 1, 4, 2, 3], 50), 3);
  assert.equal(percentil([5, 1, 4, 2, 3], 100), 5);
  assert.equal(percentil([5, 1, 4, 2, 3], 0), 1);
  assert.equal(promedio([1, 2, 3]), 2);
});

test('con grupos separables el corte cae en la mitad del hueco y no hay errores', () => {
  const corte = elegirCorte([0.1, 0.2, 0.27], [0.45, 0.6]);
  assert.equal(corte.separables, true);
  assert.ok(Math.abs(corte.corte - 0.36) < 1e-9);
  assert.equal(corte.falsosNegativos, 0);
  assert.equal(corte.falsosPositivos, 0);
});

test('con grupos solapados gana el corte de menos errores y, a igualdad, el de menos falsos positivos', () => {
  const corte = elegirCorte([0.1, 0.2, 0.5], [0.3, 0.6, 0.7]);
  assert.equal(corte.separables, false);
  assert.equal(corte.falsosNegativos + corte.falsosPositivos, 1);
  assert.equal(corte.falsosPositivos, 0);
  assert.ok(corte.corte > 0.2 && corte.corte < 0.3);
});

test('los juicios de relevancia están bien formados', () => {
  assert.equal(CONSULTAS.filter((c) => c.grupo === 'semantica').length, 8);
  assert.equal(CONSULTAS.filter((c) => c.grupo === 'exacta').length, 2);
  for (const consulta of CONSULTAS) {
    assert.ok(consulta.relevantes.length > 0, consulta.q);
    assert.equal(new Set(consulta.relevantes).size, consulta.relevantes.length, `duplicados en "${consulta.q}"`);
    for (const codigo of consulta.relevantes) assert.match(codigo, /^REU-[EJAD]\d{3}$/);
  }
});
