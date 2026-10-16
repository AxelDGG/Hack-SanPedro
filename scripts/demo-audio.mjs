/**
 * Audio del video demo, sintetizado aquí mismo (sin archivos externos ni licencias):
 * efectos para cada toque, transición y aviso, y una pista alegre de ukulele, bajo y batería ligera.
 *
 * renderizarAudio({ duracion, eventos: [{ t, tipo }] }) → Buffer WAV estéreo a 48 kHz.
 */
const SR = 48_000;
const TAU = 2 * Math.PI;
const nota = (midi) => 440 * 2 ** ((midi - 69) / 12);
const muestras = (segundos) => new Float32Array(Math.round(segundos * SR));

// Azar con semilla: el audio sale idéntico en cada grabación.
let semilla = 20261009;
function azar() {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ruido = () => azar() * 2 - 1;

/** Filtro biquad (recetas RBJ): pasa bajos, pasa altos o pasa banda. */
class Biquad {
  constructor(tipo, f, q = 0.707) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.ajustar(tipo, f, q);
  }
  ajustar(tipo, f, q = 0.707) {
    const w = (TAU * f) / SR;
    const cos = Math.cos(w);
    const alfa = Math.sin(w) / (2 * q);
    const a0 = 1 + alfa;
    let b0, b1, b2;
    if (tipo === "lp") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (tipo === "hp") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alfa, 0, -alfa];
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alfa) / a0;
  }
  paso(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// ─── Instrumentos y efectos (mono) ─────────────────────────────────────────────

/** "Tap" de un botón: un golpecito con tono que cae rápido y un clic suave. */
function toque() {
  const y = muestras(0.08);
  const clic = new Biquad("hp", 2500);
  let fase = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    fase += (TAU * (520 + 1300 * Math.exp(-t / 0.009))) / SR;
    const cuerpo = Math.sin(fase) * Math.min(1, t / 0.0008) * Math.exp(-t / 0.02);
    y[i] = cuerpo * 0.8 + clic.paso(ruido()) * Math.exp(-t / 0.0025) * 0.35;
  }
  return y;
}

/** "Pop" de algo que aparece (el pin nuevo en el mapa). */
function burbuja() {
  const y = muestras(0.16);
  let fase = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    fase += (TAU * (300 + 700 * (1 - Math.exp(-t / 0.03)))) / SR;
    y[i] = Math.sin(fase) * Math.min(1, t / 0.002) * Math.exp(-t / 0.05);
  }
  return y;
}

/** "Whoosh" de transición: ruido filtrado cuya banda sube y baja. */
function barrido(dur = 0.42) {
  const y = muestras(dur);
  const banda = new Biquad("bp", 600, 0.9);
  const suave = new Biquad("lp", 4500);
  for (let i = 0; i < y.length; i++) {
    const p = i / y.length;
    if (i % 32 === 0) banda.ajustar("bp", 450 + 2600 * Math.sin(Math.PI * p) ** 2, 0.9);
    y[i] = suave.paso(banda.paso(ruido())) * Math.sin(Math.PI * p) ** 2 * 1.8;
  }
  return y;
}

/** Marimba: tono cálido con un armónico corto de ataque. */
function marimba(f, decae = 0.35) {
  const y = muestras(decae * 4);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] =
      Math.min(1, t / 0.002) *
      (Math.sin(TAU * f * t) * Math.exp(-t / decae) +
        0.25 * Math.sin(TAU * 4 * f * t) * Math.exp(-t / (decae * 0.12)) +
        0.1 * Math.sin(TAU * 10 * f * t) * Math.exp(-t / 0.01));
  }
  return y;
}

/** Glockenspiel: parciales inarmónicos que suenan a campanita. */
function glock(f, decae = 0.5) {
  const y = muestras(Math.max(0.15, decae * 4));
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] =
      Math.min(1, t / 0.001) *
      (Math.sin(TAU * f * t) * Math.exp(-t / decae) +
        0.3 * Math.sin(TAU * 2.76 * f * t) * Math.exp(-t / (decae * 0.4)) +
        0.12 * Math.sin(TAU * 5.4 * f * t) * Math.exp(-t / (decae * 0.15)));
  }
  return y;
}

/** Cuerda pulsada (Karplus-Strong): suena a ukulele. */
function pulsar(f, dur = 1.2, brillo = 0.6) {
  const y = muestras(dur);
  // El promedio de dos muestras añade medio ciclo de retraso: se compensa al elegir el largo.
  const largo = Math.max(2, Math.round(SR / f - 0.5));
  const cuerda = new Float32Array(largo);
  let previo = 0;
  for (let i = 0; i < largo; i++) cuerda[i] = previo += brillo * (ruido() - previo);
  let j = 0;
  for (let i = 0; i < y.length; i++) {
    const a = cuerda[j];
    const b = cuerda[(j + 1) % largo];
    y[i] = a;
    cuerda[j] = 0.996 * 0.5 * (a + b);
    j = (j + 1) % largo;
  }
  const cola = Math.round(0.05 * SR);
  for (let i = 0; i < cola; i++) y[y.length - 1 - i] *= i / cola;
  return y;
}

function bombo() {
  const y = muestras(0.35);
  let fase = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    fase += (TAU * (45 + 95 * Math.exp(-t / 0.035))) / SR;
    y[i] = Math.sin(fase) * Math.exp(-t / 0.12) + ruido() * Math.exp(-t / 0.003) * 0.15;
  }
  return y;
}

/** Palmas: tres ráfagas de ruido muy juntas y una cola corta. */
function palmas() {
  const y = muestras(0.25);
  const banda = new Biquad("bp", 1400, 1.2);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const inicio of [0, 0.011, 0.022]) if (t >= inicio) env = Math.max(env, Math.exp(-(t - inicio) / 0.006));
    if (t >= 0.022) env = Math.max(env, 0.5 * Math.exp(-(t - 0.022) / 0.06));
    y[i] = banda.paso(ruido()) * env * 2.2;
  }
  return y;
}

function shaker() {
  const y = muestras(0.07);
  const agudo = new Biquad("hp", 6000);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] = agudo.paso(ruido()) * Math.min(1, t / 0.004) * Math.exp(-t / 0.018);
  }
  return y;
}

function bajo(f, dur) {
  const y = muestras(dur);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.008) * Math.exp(-t / 0.6) * Math.min(1, (dur - t) / 0.03);
    y[i] = (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) + 0.1 * Math.sin(TAU * 3 * f * t)) * env;
  }
  return y;
}

/** Reverberación tipo Freeverb (8 peines + 4 pasa todo) para darle espacio a la música. */
function reverb(x, desfase) {
  const salida = new Float32Array(x.length);
  for (const base of [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]) {
    const d = Math.round(((base + desfase) * SR) / 44100);
    const buf = new Float32Array(d);
    let j = 0;
    let filtro = 0;
    for (let i = 0; i < x.length; i++) {
      const y = buf[j];
      filtro = y * 0.75 + filtro * 0.25;
      buf[j] = x[i] * 0.015 + filtro * 0.82;
      j = (j + 1) % d;
      salida[i] += y;
    }
  }
  for (const base of [556, 441, 341, 225]) {
    const d = Math.round(((base + desfase) * SR) / 44100);
    const buf = new Float32Array(d);
    let j = 0;
    for (let i = 0; i < salida.length; i++) {
      const b = buf[j];
      buf[j] = salida[i] + b * 0.5;
      salida[i] = b - salida[i];
      j = (j + 1) % d;
    }
  }
  return salida;
}

// ─── Mezcla ────────────────────────────────────────────────────────────────────

function pista(duracion) {
  const n = Math.ceil(duracion * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  /** Suma un sonido mono en `t` con ganancia, paneo (-1 izq. … 1 der.) y envío a reverb opcional. */
  const poner = (t, x, ganancia, pan = 0, envio = null, cuanto = 0) => {
    const i0 = Math.round(t * SR);
    const gl = ganancia * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = ganancia * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = Math.max(0, -i0); i < x.length && i0 + i < n; i++) {
      L[i0 + i] += x[i] * gl;
      R[i0 + i] += x[i] * gr;
      if (envio) envio[i0 + i] += x[i] * ganancia * cuanto;
    }
  };
  return { n, L, R, poner };
}

function normalizar(p, pico) {
  let max = 0;
  for (let i = 0; i < p.n; i++) max = Math.max(max, Math.abs(p.L[i]), Math.abs(p.R[i]));
  const k = max > 0 ? pico / max : 1;
  for (let i = 0; i < p.n; i++) {
    p.L[i] *= k;
    p.R[i] *= k;
  }
}

/** Pista alegre a 112 BPM: Do – Sol – Lam – Fa con rasgueo de ukulele, bajo, palmas y una melodía de campanitas. */
function musica(duracion) {
  const p = pista(duracion);
  const envio = new Float32Array(p.n);
  const negra = 60 / 112;
  const corchea = negra / 2;
  const compas = negra * 4;
  const ACORDES = [
    [60, 64, 67, 72],
    [59, 62, 67, 74],
    [57, 64, 69, 72],
    [57, 60, 65, 69],
  ];
  const RAICES = [48, 43, 45, 41];
  const MELODIA = [
    [[0, 76], [1, 79], [1.5, 81], [2.5, 79], [3, 76]],
    [[0, 74], [1, 76], [1.5, 79], [3, 74]],
    [[0, 72], [1, 76], [1.5, 81], [2.5, 79], [3, 76]],
    [[0, 72], [1, 74], [1.5, 76], [2, 72]],
  ];
  // Rasgueo "isleño": abajo, abajo-arriba, arriba-abajo-arriba (corchea, dirección).
  const RASGUEO = [[0, 1], [2, 1], [3, -1], [5, -1], [6, 1], [7, -1]];

  for (let c = 0; c * compas < duracion; c++) {
    const t0 = c * compas;
    const k = c % 4;
    for (const [pos, dir] of RASGUEO) {
      const notas = dir > 0 ? ACORDES[k] : [...ACORDES[k]].reverse();
      notas.forEach((m, j) =>
        p.poner(
          t0 + pos * corchea + j * (dir > 0 ? 0.012 : 0.008),
          pulsar(nota(m), 1.2, dir > 0 ? 0.62 : 0.45),
          dir > 0 ? 0.09 : 0.055,
          (j - 1.5) * 0.3,
          envio,
          0.25,
        ),
      );
    }
    for (let e = 0; e < 8; e++) p.poner(t0 + e * corchea, shaker(), e % 2 ? 0.06 : 0.035, 0.35);
    if (c === 0) continue; // el primer compás entra solo con ukulele y shaker

    p.poner(t0, bombo(), 0.55);
    p.poner(t0 + 2 * negra, bombo(), 0.5);
    p.poner(t0 + 2.5 * negra, bombo(), 0.3);
    p.poner(t0 + negra, palmas(), 0.2, -0.1, envio, 0.3);
    p.poner(t0 + 3 * negra, palmas(), 0.2, -0.1, envio, 0.3);
    const raiz = nota(RAICES[k]);
    p.poner(t0, bajo(raiz, negra * 1.4), 0.26);
    p.poner(t0 + 2 * negra, bajo(raiz, negra * 1.2), 0.24);
    p.poner(t0 + 3.5 * negra, bajo(raiz * 2, negra * 0.45), 0.14);
    if (c >= 4) for (const [b, m] of MELODIA[k]) p.poner(t0 + b * negra, glock(nota(m), 0.35), 0.07, 0.25, envio, 0.5);
  }

  const [rl, rr] = [reverb(envio, 0), reverb(envio, 23)];
  for (let i = 0; i < p.n; i++) {
    p.L[i] += rl[i] * 0.35;
    p.R[i] += rr[i] * 0.35;
  }
  // Entra suave y se desvanece en los últimos 2 s.
  for (let i = 0; i < p.n; i++) {
    const t = i / SR;
    const g = Math.min(1, t / 0.3) * Math.min(1, (duracion - t) / 2);
    p.L[i] *= Math.max(0, g);
    p.R[i] *= Math.max(0, g);
  }
  normalizar(p, 0.42);
  return p;
}

/** Cada efecto: lista de [retraso, sonido, ganancia, paneo]. */
const EFECTOS = {
  toque: () => [[0, toque(), 0.5, 0]],
  pop: () => [[0, burbuja(), 0.45, 0.2]],
  whoosh: () => [[0, barrido(), 0.24, 0]],
  desliza: () => [[0, barrido(0.3), 0.16, 0]],
  aviso: () => [
    [0, marimba(nota(84)), 0.32, -0.1],
    [0.1, marimba(nota(91)), 0.32, 0.1],
  ],
  exito: () => [
    ...[84, 88, 91, 96].map((m, i) => [i * 0.07, glock(nota(m), 0.45), 0.22, -0.3 + i * 0.2]),
    [0.3, glock(nota(100), 0.7), 0.1, 0.3],
  ],
  monedas: () => [84, 86, 88, 91, 93, 96].map((m, i) => [i * 0.05, glock(nota(m), 0.09), 0.16, -0.25 + i * 0.1]),
  magia: () => [
    ...[79, 84, 88, 91, 95].map((m, i) => [i * 0.045, glock(nota(m), 0.25), 0.14, -0.4 + i * 0.2]),
    [0, barrido(0.35), 0.1, 0],
  ],
  intro: () => [
    [0, barrido(0.5), 0.22, 0],
    ...[72, 79, 84, 88].map((m, i) => [0.25 + i * 0.08, glock(nota(m), 0.6), 0.18, -0.3 + i * 0.2]),
  ],
  final: () => [
    ...[72, 76, 79, 84].map((m, i) => [i * 0.03, glock(nota(m), 1.2), 0.15, -0.3 + i * 0.2]),
    [0.18, glock(nota(96), 0.9), 0.08, 0.2],
  ],
};

function wav(p) {
  const datos = Buffer.alloc(p.n * 4);
  for (let i = 0; i < p.n; i++) {
    datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, p.L[i])) * 32767), i * 4);
    datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, p.R[i])) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + datos.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(datos.length, 40);
  return Buffer.concat([h, datos]);
}

export function renderizarAudio({ duracion, eventos, conMusica = true }) {
  const mezcla = conMusica ? musica(duracion) : pista(duracion);
  for (const { t, tipo } of eventos) {
    for (const [retraso, sonido, ganancia, pan] of EFECTOS[tipo]()) mezcla.poner(t + retraso, sonido, ganancia, pan);
  }
  // Saturación suave para que ningún golpe recorte.
  for (let i = 0; i < mezcla.n; i++) {
    mezcla.L[i] = Math.tanh(mezcla.L[i] * 1.1);
    mezcla.R[i] = Math.tanh(mezcla.R[i] * 1.1);
  }
  normalizar(mezcla, 0.95);
  return wav(mezcla);
}
