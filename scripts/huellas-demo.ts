/**
 * Huellas de las ilustraciones demo (public/placeholders) con su descripción, para que el
 * análisis simulado (AI_MOCK) "reconozca" las fotos de la demo y las pruebas.
 *
 *   npm run huellas-demo   → escribe src/lib/ai/huellas-demo.json
 *
 * Imita lo que hace el navegador: foto de celular → 1280 px en JPEG → 72×48 → 9×6.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { HUELLA_ALTO, HUELLA_ANCHO, huellaDesdeGrises } from "../src/lib/image/huella";
import type { Analisis } from "../src/lib/ai/schema";

type Demo = Omit<Analisis, "es_animal" | "confianza" | "resumen"> & { resumen: string };

const perro = (color: string, tamano: Analisis["tamano"], rasgos: string, extra: Partial<Demo> = {}): Demo => ({
  especie: "perro",
  raza: "Mestizo",
  color,
  tamano,
  sexo: "desconocido",
  collar: false,
  rasgos,
  condiciones: ["sano"],
  urgencia: 2,
  resumen: `Perro ${tamano} ${color.toLowerCase()} en la calle, se ve tranquilo.`,
  ...extra,
});
const gato = (color: string, rasgos: string, extra: Partial<Demo> = {}): Demo => ({
  especie: "gato",
  raza: "Doméstico pelo corto",
  color,
  tamano: "mediano",
  sexo: "desconocido",
  collar: false,
  rasgos,
  condiciones: ["sano"],
  urgencia: 2,
  resumen: `Gato ${color.toLowerCase()} en buen estado aparente.`,
  ...extra,
});

// Mismo orden de colores que el seed (scripts/seed.ts).
const DEMOS: Record<string, Demo> = {
  "perro-1": perro("Café claro", "mediano", "Orejas caídas más oscuras, mancha café en el ojo"),
  "perro-2": perro("Negro", "grande", "Hocico claro, orejas paradas", { condiciones: ["flaco"], urgencia: 3, resumen: "Perro grande negro, se nota delgado." }),
  "perro-3": perro("Beige", "chico", "Pelo corto, orejas redondas"),
  "perro-4": perro("Café oscuro", "mediano", "Hocico beige, orejas caídas", { condiciones: ["flaco"], urgencia: 3, resumen: "Perro mediano café oscuro, se nota con hambre." }),
  "perro-5": perro("Blanco con manchas cafés", "chico", "Manchas cafés en las orejas", { collar: true, resumen: "Perrito blanco con manchas, bien cuidado: parece tener dueño." }),
  "perro-6": perro("Gris", "grande", "Pelo gris, orejas largas", { raza: "Schnauzer", collar: true, resumen: "Perro gris de raza con collar; probablemente está perdido." }),
  "perro-7": perro("Rojizo", "mediano", "Pelo rojizo, orejas caídas"),
  "perro-8": perro("Beige con orejas negras", "mediano", "Orejas negras y hocico oscuro", { raza: "Pastor Alemán", resumen: "Perro tipo pastor, orejas negras." }),
  "gato-1": gato("Naranja atigrado", "Ojos verdes, rayas en la frente"),
  "gato-2": gato("Negro", "Ojos amarillos"),
  "gato-3": gato("Gris claro", "Pelo esponjado"),
  "gato-4": gato("Blanco con naranja", "Manchas naranjas en la cabeza", { condiciones: ["cachorro"], urgencia: 3, resumen: "Gatito blanco con naranja, solo; conviene atenderlo." }),
  "gato-5": gato("Café", "Ojos verdes"),
  "gato-6": gato("Gris oscuro", "Pelo corto, muy arisco"),
};

async function huella(svg: string) {
  // Como una foto de celular reducida por el navegador.
  const foto = await sharp(svg).resize(1280, 960, { fit: "fill" }).jpeg({ quality: 82 }).toBuffer();
  const intermedio = await sharp(foto).resize(72, 48, { fit: "fill" }).toBuffer();
  const { data } = await sharp(intermedio).resize(HUELLA_ANCHO, HUELLA_ALTO, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = HUELLA_ANCHO * HUELLA_ALTO;
  const grises = Array.from({ length: n }, (_, i) => 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]);
  const color = [0, 1, 2].map((c) => Math.round(Array.from({ length: n }, (_, i) => data[i * 3 + c]).reduce((s, x) => s + x, 0) / n));
  return { huella: huellaDesdeGrises(grises), color };
}

async function main() {
  const salida = [];
  for (const [nombre, demo] of Object.entries(DEMOS)) {
    const h = await huella(`public/placeholders/${nombre}.svg`);
    salida.push({ nombre, huella: h.huella, color: h.color, analisis: { es_animal: true, confianza: 0.93, ...demo } });
  }
  writeFileSync("src/lib/ai/huellas-demo.json", `${JSON.stringify(salida, null, 2)}\n`);
  console.log(`✅ ${salida.length} huellas demo en src/lib/ai/huellas-demo.json`);
}

main();
