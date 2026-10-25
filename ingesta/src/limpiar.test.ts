import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarDescripcion, palabrasUtiles, proporcionMayusculas } from './limpiar.ts';

const LARGO = 'Articulo en buen estado, funciona perfectamente, se entrega con todos sus accesorios originales y manual de uso incluido para el comprador.';

test('quita telefonos escritos de varias formas', () => {
  for (const telefono of ['300 000 0000', '3000000000', '+57 300 000 0000', '300-000-0000', '(300) 0000000', '604 000 0000']) {
    const r = limpiarDescripcion(`${LARGO} Mi numero es ${telefono}`);
    assert.ok(!/\d{7}/.test(r.descripcionLimpia.replace(/[\s.()-]/g, '')), `quedo el telefono ${telefono}`);
    // El numero puede salir con su fragmento completo o por la regla de telefonos.
    assert.ok(r.etapas.includes('telefonos') || r.etapas.includes('fragmentos'));
  }
});

test('conserva los importes con separador de miles', () => {
  const r = limpiarDescripcion(`${LARGO} El precio es $ 450.000 negociable, costo nuevo 1.200.000`);
  assert.match(r.descripcionLimpia, /450\.000/);
  assert.match(r.descripcionLimpia, /1\.200\.000/);
});

test('conserva medidas y modelos que no son telefonos', () => {
  const r = limpiarDescripcion(`${LARGO} Nevera de 300 litros, modelo 2019, mide 170 x 60 cm, iPhone 13 Pro Max 256GB`);
  for (const dato of ['300', '2019', '170', '60', '13', '256']) {
    assert.match(r.descripcionLimpia, new RegExp(dato), `se perdio ${dato}`);
  }
});

test('quita correos electronicos', () => {
  const r = limpiarDescripcion(`${LARGO} Escribame a ventas.usado@correo-falso.com`);
  assert.ok(!r.descripcionLimpia.includes('@'));
  assert.ok(r.etapas.includes('correos') || r.etapas.includes('fragmentos'));
});

test('quita emojis y adornos', () => {
  const r = limpiarDescripcion(`🔥🔥 ${LARGO} ★★★ OFERTA!!!! ⬇️⬇️`);
  assert.ok(!/[\p{Extended_Pictographic}★]/u.test(r.descripcionLimpia));
  assert.ok(!r.descripcionLimpia.includes('!!!!'));
});

test('baja las mayusculas sostenidas y recapitaliza', () => {
  const r = limpiarDescripcion('VENDO CALEFACTOR CASI NUEVO, FUNCIONA PERFECTO, DOS NIVELES DE CALOR Y TERMOSTATO REGULABLE, SE USO POCO EN INVIERNO PASADO.');
  assert.ok(r.etapas.includes('mayusculas'));
  assert.match(r.descripcionLimpia, /^Vendo calefactor casi nuevo/);
});

test('no toca un texto con mayusculas normales', () => {
  const r = limpiarDescripcion(LARGO);
  assert.ok(!r.etapas.includes('mayusculas'));
  assert.equal(r.descripcionLimpia, LARGO);
});

test('recorta muletillas de contacto', () => {
  const r = limpiarDescripcion(`${LARGO} Escribir al wpp, solo interesados, mas info por whatsapp. Gracias por leer`);
  const limpia = r.descripcionLimpia.toLowerCase();
  for (const muletilla of ['wpp', 'whatsapp', 'solo interesados', 'gracias por leer']) {
    assert.ok(!limpia.includes(muletilla), `quedo "${muletilla}"`);
  }
});

test('descarta lo que queda sin contenido util', () => {
  const r = limpiarDescripcion('VENDO!!! 🔥 escribir al wpp 300 000 0000 solo interesados');
  assert.equal(r.descartada, true);
  assert.equal(r.descripcionLimpia, '');
  assert.match(r.motivo!, /palabras utiles/);
});

test('reporta cuantos caracteres se eliminaron', () => {
  const sucia = `☎️ 300 000 0000 ☎️ ${LARGO} ESCRIBIR AL WPP, SOLO INTERESADOS!!!`;
  const r = limpiarDescripcion(sucia);
  assert.equal(r.descartada, false);
  assert.ok(r.caracteresFinales < r.caracteresOriginales);
  assert.equal(r.caracteresOriginales, sucia.length);
});

test('colapsa espacios y saltos repetidos', () => {
  const r = limpiarDescripcion(`${LARGO}\n\n   Entrega   inmediata   en   el   centro`);
  assert.ok(!/ {2}|\n/.test(r.descripcionLimpia));
});

test('es idempotente: limpiar lo limpio no cambia nada', () => {
  const sucia = `🔥 OFERTA 🔥 ${LARGO} contactar al 300 000 0000 o a tienda@correo-falso.com`;
  const unaVez = limpiarDescripcion(sucia).descripcionLimpia;
  assert.equal(limpiarDescripcion(unaVez).descripcionLimpia, unaVez);
});

test('tolera entradas vacias sin lanzar', () => {
  assert.equal(limpiarDescripcion('').descartada, true);
});

test('utilidades de medicion', () => {
  assert.equal(proporcionMayusculas('ABC'), 1);
  assert.equal(proporcionMayusculas('abc'), 0);
  assert.equal(proporcionMayusculas('123 !!!'), 0);
  assert.deepEqual(palabrasUtiles('nevera de 300 litros x'), ['nevera', 'de', 'litros']);
});

test('no deja colas huerfanas al recortar una muletilla intermedia', () => {
  const r = limpiarDescripcion(
    'Sofa de 3 puestos en tela gris, mide 180 x 80 cm, tiene un pequeño desgaste en un brazo pero nada grave. Entrego en Chapinero. Mas info por whatsapp 301 000 0000 o al correo ventas@correo-falso.com'
  );
  assert.ok(r.descripcionLimpia.endsWith('Entrego en Chapinero.'), r.descripcionLimpia);
  assert.ok(!/whatsapp|correo|@/i.test(r.descripcionLimpia), r.descripcionLimpia);
});

test('no deja puntuacion duplicada', () => {
  const r = limpiarDescripcion(
    `Vendo nevera de dos puertas, escribir al wpp, funciona bien y enfria rapido, se entrega limpia y revisada por tecnico. ${LARGO}`
  );
  assert.ok(!/[,.;:]\s*[,.;:]/.test(r.descripcionLimpia), r.descripcionLimpia);
});

test('elimina el bloque de contacto completo, no palabra por palabra', () => {
  const r = limpiarDescripcion(
    `${LARGO} ⬇️⬇️ CONTACTO SOLO POR WHATSAPP AL 300 000 0000 ⬇️⬇️ NO CONTESTO MENSAJES DE CURIOSOS, VER MIS OTRAS PUBLICACIONES`
  );
  assert.equal(r.descripcionLimpia, LARGO);
  assert.ok(r.etapas.includes('fragmentos'));
});

test('no parte correos ni importes al cortar en fragmentos', () => {
  const conImporte = limpiarDescripcion(
    'Nevera de dos puertas con congelador independiente, el precio es de 1.200.000 pesos negociable y la entrego funcionando'
  );
  assert.match(conImporte.descripcionLimpia, /1\.200\.000/);

  const conCorreo = limpiarDescripcion(`${LARGO} Escribame a ventas.usado@correo-falso.com`);
  assert.ok(!/ventas|@|\bcom\b/.test(conCorreo.descripcionLimpia), conCorreo.descripcionLimpia);
});

test('conserva un fragmento largo aunque mencione un contacto', () => {
  const r = limpiarDescripcion(
    'Mi numero es 300 000 0000 y vendo la nevera porque me mude a un apartamento mas pequeño que ya tiene cocina integral con nevera incluida'
  );
  assert.match(r.descripcionLimpia, /apartamento mas pequeño/);
  assert.ok(!/300/.test(r.descripcionLimpia), r.descripcionLimpia);
});
