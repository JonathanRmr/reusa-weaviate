/**
 * Precision@5 por alpha sobre las consultas de demostración (roadmap 3.5).
 *
 *   npm run evaluar
 *
 * Gasta 1 embedding por consulta y por alpha > 0 (alpha = 0 es BM25 y no vectoriza):
 * con 10 consultas y 6 puntos del deslizador, 50 de las 2.000 diarias.
 */
import { buscar } from '../src/motor/buscar.js';
import { ALPHAS, CONSULTAS, K } from './consultas.js';
import { ejecutar, fijo, guardarResultado, leerCatalogo } from './comun.js';
import { precisionEnK, promedio, rangoReciproco, techoPrecision } from './metricas.js';

async function principal() {
  // Un juicio que nombra un código que no está en la nube mediría contra nada.
  const catalogo = await leerCatalogo();
  const titulos = new Map(catalogo.map((p) => [p.codigo, p.titulo]));
  const huerfanos = CONSULTAS.flatMap((c) => c.relevantes).filter((codigo) => !titulos.has(codigo));
  if (huerfanos.length > 0) throw new Error(`Relevantes que no existen en la colección: ${huerfanos.join(', ')}`);

  const filas = [];
  for (const consulta of CONSULTAS) {
    for (const alpha of ALPHAS) {
      // limit 12 = lo que pide la interfaz; se juzgan los primeros K.
      const { resultados, modo, tomoMs } = await buscar({ q: consulta.q, alpha, limit: 12 });
      const codigos = resultados.map((r) => r.codigo);
      filas.push({
        q: consulta.q,
        grupo: consulta.grupo,
        alpha,
        modo,
        tomoMs,
        precision: precisionEnK(codigos, consulta.relevantes, K),
        techo: techoPrecision(consulta.relevantes, K),
        rr: rangoReciproco(codigos, consulta.relevantes),
        top: resultados.slice(0, K).map((r) => ({
          codigo: r.codigo,
          titulo: r.titulo,
          relevante: consulta.relevantes.includes(r.codigo),
          score: r.score,
          distance: r.distance,
        })),
      });
      const ultima = filas[filas.length - 1];
      console.log(
        `α=${alpha.toFixed(2)} ${modo.padEnd(6)} P@${K}=${ultima.precision.toFixed(2)}/${ultima.techo.toFixed(2)} ` +
          `RR=${ultima.rr.toFixed(2)}  "${consulta.q}"`
      );
    }
  }

  const resumen = ALPHAS.map((alpha) => {
    const deAlpha = filas.filter((f) => f.alpha === alpha);
    const de = (grupo) => deAlpha.filter((f) => f.grupo === grupo);
    return {
      alpha,
      precision: promedio(deAlpha.map((f) => f.precision)),
      precisionNormalizada: promedio(deAlpha.map((f) => f.precision / f.techo)),
      precisionSemantica: promedio(de('semantica').map((f) => f.precision)),
      precisionExacta: promedio(de('exacta').map((f) => f.precision)),
      mrr: promedio(deAlpha.map((f) => f.rr)),
      mrrSemantica: promedio(de('semantica').map((f) => f.rr)),
      mrrExacta: promedio(de('exacta').map((f) => f.rr)),
      tomoMsMediana: [...deAlpha.map((f) => f.tomoMs)].sort((a, b) => a - b)[Math.floor(deAlpha.length / 2)],
    };
  });

  console.log('\nα      P@5   P@5/techo  P@5 sem  P@5 exac  MRR   MRR sem  MRR exac');
  for (const r of resumen) {
    console.log(
      `${r.alpha.toFixed(2)}   ${fijo(r.precision, 2)}  ${fijo(r.precisionNormalizada, 2)}       ` +
        `${fijo(r.precisionSemantica, 2)}     ${fijo(r.precisionExacta, 2)}      ${fijo(r.mrr, 2)}  ` +
        `${fijo(r.mrrSemantica, 2)}     ${fijo(r.mrrExacta, 2)}`
    );
  }

  guardarResultado('precision', { k: K, alphas: ALPHAS, consultas: CONSULTAS, resumen, filas }, markdown(resumen, filas));
}

function markdown(resumen, filas) {
  const l = [];
  l.push(`# Precision@${K} por alpha`, '');
  l.push(`| α | modo | P@${K} | P@${K} / techo | P@${K} semántica | P@${K} exacta | MRR | MRR semántica | MRR exacta | mediana ms |`);
  l.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of resumen) {
    const modo = filas.find((f) => f.alpha === r.alpha).modo;
    l.push(
      `| ${r.alpha} | ${modo} | ${fijo(r.precision, 2)} | ${fijo(r.precisionNormalizada, 2)} | ${fijo(r.precisionSemantica, 2)} | ` +
        `${fijo(r.precisionExacta, 2)} | ${fijo(r.mrr, 2)} | ${fijo(r.mrrSemantica, 2)} | ${fijo(r.mrrExacta, 2)} | ${r.tomoMsMediana} |`
    );
  }

  l.push('', `## Por consulta (P@${K}, techo entre paréntesis)`, '');
  l.push(`| Consulta | grupo | techo | ${ALPHAS.map((a) => `α=${a}`).join(' | ')} |`);
  l.push(`|---|---|---|${ALPHAS.map(() => '---').join('|')}|`);
  for (const consulta of CONSULTAS) {
    const deConsulta = filas.filter((f) => f.q === consulta.q);
    l.push(
      `| ${consulta.q} | ${consulta.grupo} | ${fijo(deConsulta[0].techo, 1)} | ` +
        `${deConsulta.map((f) => fijo(f.precision, 1)).join(' | ')} |`
    );
  }

  l.push('', `## Top ${K} de cada corrida`, '', '✓ = relevante según el juicio de `evaluacion/consultas.js`.', '');
  for (const f of filas) {
    l.push(`### "${f.q}" — α = ${f.alpha} (${f.modo}) — P@${K} ${fijo(f.precision, 2)}, RR ${fijo(f.rr, 2)}`, '');
    if (f.top.length === 0) l.push('_Sin resultados._');
    for (const [i, r] of f.top.entries()) {
      const metrica = f.modo === 'vector' ? `dist ${fijo(r.distance)}` : `score ${fijo(r.score)}`;
      l.push(`${i + 1}. ${r.relevante ? '✓' : '✗'} \`${r.codigo}\` ${r.titulo} — ${metrica}`);
    }
    l.push('');
  }
  return l.join('\n');
}

ejecutar(principal);
