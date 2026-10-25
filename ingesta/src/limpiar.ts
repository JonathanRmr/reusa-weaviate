/**
 * Pipeline de normalizacion de descripciones (Fase 1.4 del roadmap).
 *
 * Funciones puras, sin red ni disco: se pueden probar con `npm test`.
 *
 * Por que existe: las descripciones reales traen telefonos, "ESCRIBIR AL WHATSAPP",
 * emojis y mayusculas sostenidas. Si el 60 % del texto es informacion de contacto,
 * el embedding representa mayoritariamente ruido. Vectorizamos la version limpia
 * y al usuario le mostramos la original.
 */

/** Minimo de palabras utiles que debe conservar una descripcion para ser ingestada. */
export const MINIMO_PALABRAS_UTILES = 15;

/** Fraccion de letras en mayuscula a partir de la cual se considera "mayuscula sostenida". */
const UMBRAL_MAYUSCULAS = 0.6;

export type Etapa =
  | 'fragmentos'
  | 'correos'
  | 'telefonos'
  | 'emojis'
  | 'adornos'
  | 'mayusculas'
  | 'muletillas'
  | 'colas'
  | 'espacios';

export type ResultadoLimpieza = {
  /** Texto normalizado, listo para vectorizar. Vacio si la publicacion se descarta. */
  descripcionLimpia: string;
  /** true si no conserva suficiente contenido util y no debe ingestarse. */
  descartada: boolean;
  /** Motivo del descarte, para el reporte de limpieza. */
  motivo?: string;
  /** Etapas que efectivamente modificaron el texto. Alimenta el reporte. */
  etapas: Etapa[];
  caracteresOriginales: number;
  caracteresFinales: number;
  palabrasUtiles: number;
};

// --- Expresiones regulares del pipeline -------------------------------------

const RE_CORREO = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * Importes escritos con separador de miles: "$ 450.000", "1.200.000", "$1'200.000".
 * Se protegen ANTES de borrar telefonos, porque un precio tambien es una secuencia
 * larga de digitos y perderlo degradaria la descripcion. En Colombia los celulares
 * no se escriben con punto de miles, asi que el formato los distingue.
 */
const RE_IMPORTE = /\$?\s?\d{1,3}(?:[.']\d{3})+/g;

/**
 * Secuencia de digitos con separadores tipicos de telefono. No cruza letras, asi que
 * "nevera 300 litros modelo 2019" no se ve afectada. El filtro final por cantidad de
 * digitos lo decide `esTelefono`.
 */
const RE_SECUENCIA_DIGITOS = /\+?\d[\d\s().\-]{4,}\d/g;

/**
 * Palabras que delatan que un fragmento es informacion de contacto y no una
 * descripcion del articulo. Deliberadamente inequivocas: "numero de serie" o
 * "mando por correo certificado" no deben activar nada.
 */
const RE_MARCADOR_CONTACTO =
  /wpp|whatsapp|wasap|whats\b|inbox|\bdm\b|\bprivado\b|\binterno\b|curios[oa]s|solo\s+interesad|no\s+cambios|no\s+permutas|gracias\s+por\s+(?:leer|su)|ver\s+mis\s+(?:otras|dem[aá]s)\s+publicaciones|\bremate\b|aprovech\w*\s+ya|escrib\w*\s+(?:al|por|me)|llam\w*\s+al|contact\w*\s+(?:solo|al|por)|atiendo\s+solo|@/i;

/**
 * Hasta cuantas palabras utiles puede tener un fragmento para borrarlo completo.
 * Un fragmento corto con un telefono dentro es puro contacto; uno largo puede
 * mezclar contacto y descripcion, y entonces se limpia por reglas en vez de perderse.
 */
const LIMITE_FRAGMENTO_CORTO = 10;

/** Emojis y pictogramas. */
const RE_EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{20E3}]/gu;

/**
 * En los clasificados los emojis y las vinetas no decoran: separan ideas, igual
 * que un punto ("... porque viajo ⬇️⬇️ CONTACTO SOLO POR WHATSAPP ..."). Se
 * convierten en coma antes de fragmentar para que el bloque de contacto quede
 * aislado y se pueda borrar completo.
 */
const RE_SEPARADOR_DECORATIVO =
  /(?:[\p{Extended_Pictographic}\u{FE0F}★☆✦✧✪✩❤♥♡♦◆◼▪▫■□●○➤➜➡⬅⬆⬇]|[!¡?¿*=_~^|·]{2,}|\s)*(?:[\p{Extended_Pictographic}★☆✦✧✪✩❤♥♡♦◆◼▪▫■□●○➤➜➡⬅⬆⬇]|[!¡?¿*=_~^|·]{2,})(?:[\p{Extended_Pictographic}\u{FE0F}★☆✦✧✪✩❤♥♡♦◆◼▪▫■□●○➤➜➡⬅⬆⬇]|[!¡?¿*=_~^|·]{2,}|\s)*/gu;

/** Adornos: vinetas, flechas, signos repetidos y lineas decorativas. */
const RE_ADORNO = /[★☆✦✧✪✩❤♥♡♦◆◼▪▫■□●○◊➤➜➡⬅⬆⬇†‡¤¡¿»«]|[!¡?¿*=_~^|·.\-]{3,}/g;

/** Muletillas de contacto y relleno comercial que no describen el articulo. */
const MULETILLAS: RegExp[] = [
  /\b(?:escrib(?:ir|ame|eme|anme|an)|mand(?:ar|eme|enme)|hablame|contact(?:ar|eme|enme))\s+(?:me\s+)?(?:al|por|a)\s+(?:el\s+)?(?:wpp|whatsapp|wasap|whats|interno|privado|inbox|dm|chat|numero|cel(?:ular)?|tel(?:efono)?)\b/gi,
  /\b(?:solo|unicamente)\s+(?:personas\s+)?(?:interesad[oa]s|serios?)\b/gi,
  /\b(?:mas|m[aá]s)\s+info(?:rmaci[oó]n)?\s+(?:al|por|en)\s+(?:el\s+)?(?:wpp|whatsapp|interno|privado|inbox|dm|chat|cel(?:ular)?|tel(?:efono)?)\b/gi,
  /\b(?:no\s+(?:atiendo|contesto|respondo))\s+(?:llamadas|mensajes|preguntas|curiosos)\b/gi,
  /\bno\s+pregunte(?:n)?\s+si\s+no\s+(?:va|van)\s+a\s+comprar\b/gi,
  /\b(?:atiendo|respondo)\s+(?:solo\s+)?(?:por\s+)?(?:wpp|whatsapp|interno|privado|inbox)\b/gi,
  /\b(?:preguntas|dudas|detalles)\s+(?:al|por)\s+(?:privado|interno|wpp|whatsapp|inbox|dm)\b/gi,
  /\b(?:llam(?:ar|eme|enme|ame))\s+(?:al|a)\s+(?:el\s+)?(?:numero|cel(?:ular)?|tel(?:efono)?)\b/gi,
  /\b(?:gracias\s+por\s+(?:leer|su\s+atenci[oó]n|visitar(?:me)?))\b/gi,
  /\b(?:ver\s+mis\s+(?:otras|dem[aá]s)\s+publicaciones)\b/gi,
  /\b(?:aprovech[ae]|corr[ae])\s+(?:ya|que\s+se\s+(?:va|acaba))\b/gi,
  /\b(?:ofert[ao]n?|remate)\s+(?:del\s+)?(?:dia|unica|unico)\b/gi,
  /\b(?:o|y)?\s*(?:al|por|en)\s+(?:el\s+)?correo(?:\s+electr[oó]nico)?\b/gi,
  /\bwpp\b|\bwhatsapp\b|\bwasap\b/gi,
];

/**
 * Palabras funcionales que pueden quedar colgando cuando una muletilla se recorta
 * en medio de la frase ("... Entrego en Chapinero. o al correo" -> "o al").
 */
const RE_COLA_FUNCIONAL =
  /[\s,.;:]*\b(?:o|y|e|u|ni|al|a|por|en|el|la|los|las|de|del|mi|mis|su|sus|con|para|que|un|una|lo|se)\b[\s,.;:]*$/i;

// --- Etapas -----------------------------------------------------------------

function cuentaDigitos(texto: string): number {
  return (texto.match(/\d/g) ?? []).length;
}

/**
 * Una secuencia numerica se considera telefono si acumula 7 o mas digitos:
 * en Colombia los fijos tienen 7 (o 10 con indicativo) y los celulares 10.
 */
function esTelefono(secuencia: string): boolean {
  return cuentaDigitos(secuencia) >= 7;
}

/** Igual que `esTelefono`, pero sobre un fragmento y protegiendo los importes. */
function tieneTelefono(fragmento: string): boolean {
  const sinImportes = fragmento.replace(RE_IMPORTE, ' ');
  const secuencias = sinImportes.match(RE_SECUENCIA_DIGITOS) ?? [];
  return secuencias.some(esTelefono);
}

/**
 * Borra de una vez los fragmentos dedicados al contacto ("MAS INFO AL WPP 300 000
 * 0000"), en lugar de recortarles palabras y dejar restos sin sentido como
 * "CONTACTO SOLO POR AL DE CURIOSOS" pegados al final de la descripcion.
 */
function quitarFragmentosDeContacto(texto: string): string {
  const conSeparadores = texto.replace(RE_SEPARADOR_DECORATIVO, ', ');

  // El separador exige espacio o fin de texto: asi un correo ("ventas.usado@...")
  // o un precio ("1.200.000") no se parte por la mitad.
  const trozos = conSeparadores.split(/([.!?;]+(?:\s+|$)|,\s+)/);
  const conservados: string[] = [];

  for (let i = 0; i < trozos.length; i += 2) {
    const fragmento = trozos[i] ?? '';
    const separador = trozos[i + 1] ?? '';
    const esContacto = RE_MARCADOR_CONTACTO.test(fragmento) || tieneTelefono(fragmento);
    if (esContacto && palabrasUtiles(fragmento).length <= LIMITE_FRAGMENTO_CORTO) continue;
    conservados.push(fragmento, separador);
  }

  return conservados.join('');
}

function quitarTelefonos(texto: string): string {
  const importes: string[] = [];

  // 1. Guardar los importes tras un marcador sin digitos.
  const protegido = texto.replace(RE_IMPORTE, (importe) => {
    importes.push(importe);
    return `\u0000IMPORTE${String.fromCharCode(97 + importes.length - 1)}\u0000`;
  });

  // 2. Borrar las secuencias que parezcan numero de contacto.
  const sinTelefonos = protegido.replace(RE_SECUENCIA_DIGITOS, (secuencia) =>
    esTelefono(secuencia) ? ' ' : secuencia
  );

  // 3. Devolver los importes a su lugar.
  return sinTelefonos.replace(/\u0000IMPORTE([a-z])\u0000/g, (_, letra: string) => {
    const indice = letra.charCodeAt(0) - 97;
    return importes[indice] ?? '';
  });
}

/** Mide que fraccion de las letras del texto esta en mayuscula. */
export function proporcionMayusculas(texto: string): number {
  const letras = texto.match(/\p{L}/gu) ?? [];
  if (letras.length === 0) return 0;
  const mayusculas = letras.filter((letra) => letra !== letra.toLowerCase()).length;
  return mayusculas / letras.length;
}

/**
 * Baja las mayusculas sostenidas y recapitaliza el inicio de cada oracion.
 * El embedding no distingue "NEVERA" de "nevera", pero el texto en mayuscula
 * se tokeniza peor y se ve mal en la interfaz.
 */
function bajarMayusculas(texto: string): string {
  const minusculas = texto.toLowerCase();
  return minusculas.replace(
    /(^|[.!?]\s+)(\p{Ll})/gu,
    (_, prefijo: string, letra: string) => prefijo + letra.toUpperCase()
  );
}

function quitarMuletillas(texto: string): string {
  return MULETILLAS.reduce((acumulado, regla) => acumulado.replace(regla, ' '), texto);
}

/** Quita del final las palabras funcionales que quedaron sin su frase. */
function podarColas(texto: string): string {
  let actual = texto;
  let previo: string;
  do {
    previo = actual;
    actual = actual.replace(RE_COLA_FUNCIONAL, '');
  } while (actual !== previo);
  return actual;
}

function colapsarEspacios(texto: string): string {
  return texto
    // Puntuacion que quedo duplicada al recortar una muletilla intermedia.
    .replace(/([.,;:])(?:\s*[.,;:])+/g, '$1')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,;:])(?=\S)/g, '$1 ')
    .replace(/^[\s,.;:]+|[\s,;:]+$/g, '')
    .trim();
}

/**
 * Palabra util: token con al menos dos letras. Excluye numeros sueltos y simbolos,
 * que no aportan significado al vector.
 */
export function palabrasUtiles(texto: string): string[] {
  return texto.split(/\s+/).filter((token) => (token.match(/\p{L}/gu) ?? []).length >= 2);
}

/**
 * Que ruido traia el texto ORIGINAL, sin importar que etapa lo acabo quitando.
 * Las etapas se solapan a proposito (la de fragmentos se lleva emojis y telefonos
 * de una sola pasada), asi que para el informe la incidencia hay que medirla aqui.
 */
export type Ruido = {
  emojis: boolean;
  telefono: boolean;
  correo: boolean;
  mayusculaSostenida: boolean;
  muletilla: boolean;
  adornos: boolean;
};

export function detectarRuido(original: string): Ruido {
  const texto = String(original ?? '');
  return {
    emojis: new RegExp(RE_EMOJI.source, 'u').test(texto),
    telefono: tieneTelefono(texto),
    correo: new RegExp(RE_CORREO.source).test(texto),
    mayusculaSostenida: proporcionMayusculas(texto) > UMBRAL_MAYUSCULAS,
    muletilla: MULETILLAS.some((regla) => new RegExp(regla.source, 'i').test(texto)),
    adornos: new RegExp(RE_ADORNO.source, 'u').test(texto),
  };
}

// --- Pipeline ---------------------------------------------------------------

export function limpiarDescripcion(
  original: string,
  minimoPalabras: number = MINIMO_PALABRAS_UTILES
): ResultadoLimpieza {
  const entrada = original ?? '';
  const etapas: Etapa[] = [];
  let texto = entrada;

  const aplicar = (etapa: Etapa, transformar: (t: string) => string) => {
    const siguiente = transformar(texto);
    if (siguiente !== texto) etapas.push(etapa);
    texto = siguiente;
  };

  // Primero los bloques completos de contacto: el telefono y el arroba son la
  // señal, asi que esta etapa va antes de borrarlos.
  aplicar('fragmentos', quitarFragmentosDeContacto);
  aplicar('correos', (t) => t.replace(RE_CORREO, ' '));
  aplicar('telefonos', quitarTelefonos);
  aplicar('emojis', (t) => t.replace(RE_EMOJI, ' '));
  aplicar('adornos', (t) => t.replace(RE_ADORNO, ' '));
  // El ratio de mayusculas se mide despues de quitar ruido: los emojis y los
  // numeros de contacto distorsionan el conteo.
  aplicar('mayusculas', (t) => (proporcionMayusculas(t) > UMBRAL_MAYUSCULAS ? bajarMayusculas(t) : t));
  aplicar('muletillas', quitarMuletillas);
  aplicar('espacios', colapsarEspacios);
  aplicar('colas', podarColas);

  const utiles = palabrasUtiles(texto);
  const descartada = utiles.length < minimoPalabras;

  return {
    descripcionLimpia: descartada ? '' : texto,
    descartada,
    motivo: descartada
      ? `Solo ${utiles.length} palabras utiles tras la limpieza (minimo ${minimoPalabras})`
      : undefined,
    etapas,
    caracteresOriginales: entrada.length,
    caracteresFinales: descartada ? 0 : texto.length,
    palabrasUtiles: utiles.length,
  };
}
