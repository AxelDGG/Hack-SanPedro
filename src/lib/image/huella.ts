/**
 * Huella perceptual de una foto (dHash): compara el brillo de cada píxel con el de su vecino
 * en una versión diminuta de la imagen. La misma foto reenviada, recortada un poco o
 * recomprimida por WhatsApp da casi la misma huella; dos fotos distintas difieren en muchos bits.
 *
 * Son 48 bits (8 × 6) para que quepa exacta en un número de JSON; en la base va como bigint y
 * `distancia_hash` cuenta los bits distintos (≤ 5 = la misma foto).
 */
export const HUELLA_ANCHO = 9;
export const HUELLA_ALTO = 6;
/**
 * Diferencia mínima de brillo (0–255) para contar un bit. Sin ella, las zonas lisas (pared,
 * cielo, fondo) cambian de bit con cualquier recompresión o redimensionado distinto.
 */
const TOLERANCIA = 4;

/** Calcula la huella a partir de los grises de una imagen de HUELLA_ANCHO × HUELLA_ALTO. */
export function huellaDesdeGrises(grises: ArrayLike<number>): number {
  let huella = 0;
  for (let y = 0; y < HUELLA_ALTO; y++) {
    for (let x = 0; x < HUELLA_ANCHO - 1; x++) {
      const i = y * HUELLA_ANCHO + x;
      // Multiplicar en vez de desplazar bits: los operadores de bits de JS solo usan 32.
      huella = huella * 2 + (grises[i] > grises[i + 1] + TOLERANCIA ? 1 : 0);
    }
  }
  return huella;
}

/** Bits distintos entre dos huellas (los operadores de bits de JS son de 32: se parte en dos). */
export function distanciaHuellas(a: number, b: number): number {
  const contar = (n: number) => {
    let k = 0;
    for (; n; n >>>= 1) k += n & 1;
    return k;
  };
  const alto = (x: number) => Math.floor(x / 2 ** 24);
  return contar(alto(a) ^ alto(b)) + contar((a % 2 ** 24) ^ (b % 2 ** 24));
}

/** Huella y color promedio [r, g, b] de una foto, en el navegador. */
export async function huellaFoto(foto: Blob): Promise<{ huella: number; color: [number, number, number] }> {
  const bitmap = await createImageBitmap(foto);
  // Dos pasos: reducir de golpe a 9 × 6 deja pasar ruido de unos cuantos píxeles.
  const intermedio = document.createElement("canvas");
  intermedio.width = 72;
  intermedio.height = 48;
  const ci = intermedio.getContext("2d")!;
  ci.imageSmoothingQuality = "high";
  ci.drawImage(bitmap, 0, 0, intermedio.width, intermedio.height);
  bitmap.close();

  const final = document.createElement("canvas");
  final.width = HUELLA_ANCHO;
  final.height = HUELLA_ALTO;
  const cf = final.getContext("2d", { willReadFrequently: true })!;
  cf.imageSmoothingQuality = "high";
  cf.drawImage(intermedio, 0, 0, HUELLA_ANCHO, HUELLA_ALTO);

  const { data } = cf.getImageData(0, 0, HUELLA_ANCHO, HUELLA_ALTO);
  const grises = new Float32Array(HUELLA_ANCHO * HUELLA_ALTO);
  const suma = [0, 0, 0];
  for (let i = 0; i < grises.length; i++) {
    grises[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    for (let c = 0; c < 3; c++) suma[c] += data[i * 4 + c];
  }
  const color = suma.map((s) => Math.round(s / grises.length)) as [number, number, number];
  return { huella: huellaDesdeGrises(grises), color };
}
