// Qué operador de Weaviate ejecuta /api/buscar según `alpha` (roadmap 3.1 y 3.2).
//
//   alpha = 0  → bm25     palabras exactas. Devuelve `score` (BM25 crudo, no acotado).
//   alpha = 1  → vector   nearText puro. Devuelve `distance` (coseno: 0 idéntico, 2 opuesto).
//   otro       → hybrid   fusión de ambos rankings. Devuelve `score` normalizado en [0, 1].
//
// En los extremos no se usa `hybrid` con alpha 0 o 1 por dos razones:
//   1. La métrica. Un híbrido normaliza los puntajes dentro de cada respuesta, así que
//      con alpha = 1 el primer resultado siempre "vale" 1 aunque esté lejísimos. nearText
//      da la distancia real, que es la que permite decir "esto no se parece a nada".
//   2. La cuota. bm25 no vectoriza la consulta: el extremo izquierdo del deslizador y la
//      columna léxica de F4 no gastan embeddings del plan gratuito.
// El ranking es el mismo que daría `hybrid` en esos extremos; lo que cambia es la métrica
// que se le puede mostrar al usuario, y `modo` le dice al frontend cuál es.

export const MODOS = { LEXICO: 'bm25', VECTORIAL: 'vector', HIBRIDO: 'hybrid' };

export function elegirModo(alpha) {
  if (alpha <= 0) return MODOS.LEXICO;
  if (alpha >= 1) return MODOS.VECTORIAL;
  return MODOS.HIBRIDO;
}
