/**
 * Genera los datos de la simulación (100 % determinista: misma semilla → mismos archivos).
 *
 *   npm run generar
 *
 * Entradas:  data/fuentes/colonias-base.json  (lo produce scripts/investigar-colonias.ts)
 *            public/fotos/*.svg               (ilustraciones de la app principal + gato-siames.svg)
 * Salidas:   data/colonias.json   catálogo ordenado por nombre con claves COL-001…
 *            data/mascotas.json   ~400 mascotas ficticias (folios consecutivos por fecha de registro)
 *            data/fotos.json      las ilustraciones SVG embebidas (para servir /fotos/* desde la función)
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Colonia, Especie, MascotaRegistro, Sexo, Tamano, Vacuna } from "../src/tipos.js";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SEMILLA = 20261015;
const TOTAL_MASCOTAS = 400;
const TOTAL_PERROS = 260; // 65 %
const FECHA_CORTE = "2026-09-30"; // ningún registro ni vacuna posterior a esta fecha

// ---------------------------------------------------------------------------
// PRNG con semilla (mulberry32)
// ---------------------------------------------------------------------------
let estado = SEMILLA >>> 0;
function azar() {
  estado = (estado + 0x6d2b79f5) >>> 0;
  let t = estado;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
const elegir = <T>(xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)];
function ponderado<T>(xs: readonly (readonly [T, number])[]): T {
  const total = xs.reduce((s, [, p]) => s + p, 0);
  let r = azar() * total;
  for (const [x, p] of xs) {
    r -= p;
    if (r < 0) return x;
  }
  return xs[xs.length - 1][0];
}
function barajar<T>(xs: T[]) {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// ---------------------------------------------------------------------------
// Fechas (días UTC)
// ---------------------------------------------------------------------------
const DIA = 86_400_000;
const aDia = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DIA);
const aIso = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);
const CORTE = aDia(FECHA_CORTE);

// ---------------------------------------------------------------------------
// Catálogos: raza → tamaños y (ilustración, color) coherentes con el dibujo
// ---------------------------------------------------------------------------
// Ilustraciones (colores leídos de cada SVG):
//  perro-1 café claro/caramelo, orejas y mancha en el ojo café oscuro, hocico crema
//  perro-2 negro, hocico gris parduzco          perro-3 beige/crema, orejas doradas, mancha en el ojo
//  perro-4 café medio, orejas café oscuro       perro-5 blanco, orejas y mancha beige
//  perro-6 gris, orejas gris oscuro             perro-7 rojizo, orejas café rojizo, mancha en el ojo
//  perro-8 beige/arena con orejas negras
//  gato-1 naranja atigrado    gato-2 negro         gato-3 gris claro atigrado, hocico blanco
//  gato-4 blanco              gato-5 café atigrado gato-6 gris oscuro azulado
//  gato-siames crema con orejas y máscara café oscuro, ojos azules (dibujo nuevo con el mismo estilo)
type Opcion = readonly [foto: string, color: string, peso: number];
type Raza = { raza: string; peso: number; tamanos: readonly (readonly [Tamano, number])[]; opciones: readonly Opcion[] };

const RAZAS: Record<Especie, Raza[]> = {
  perro: [
    {
      raza: "Mestizo",
      peso: 34,
      tamanos: [["chico", 3], ["mediano", 5], ["grande", 2]],
      opciones: [
        ["perro-1.svg", "Café claro", 4], ["perro-1.svg", "Canela con orejas café oscuro", 2],
        ["perro-2.svg", "Negro", 4], ["perro-2.svg", "Negro con hocico canoso", 1],
        ["perro-3.svg", "Beige", 3], ["perro-3.svg", "Crema", 1],
        ["perro-4.svg", "Café oscuro", 3], ["perro-4.svg", "Chocolate", 1],
        ["perro-5.svg", "Blanco con manchas cafés", 3],
        ["perro-6.svg", "Gris", 2],
        ["perro-7.svg", "Rojizo", 2], ["perro-7.svg", "Café rojizo", 1],
        ["perro-8.svg", "Beige con orejas negras", 2], ["perro-8.svg", "Café claro con negro", 1],
      ],
    },
    {
      raza: "Chihuahua",
      peso: 9,
      tamanos: [["chico", 1]],
      opciones: [
        ["perro-1.svg", "Canela", 3], ["perro-3.svg", "Crema", 2], ["perro-4.svg", "Chocolate", 1],
        ["perro-2.svg", "Negro", 1], ["perro-8.svg", "Beige con orejas negras", 1],
        ["perro-5.svg", "Blanco con manchas cafés", 1],
      ],
    },
    {
      raza: "Schnauzer",
      peso: 7,
      tamanos: [["chico", 2], ["mediano", 1]],
      opciones: [["perro-6.svg", "Gris sal y pimienta", 5], ["perro-2.svg", "Negro", 2]],
    },
    {
      raza: "Labrador",
      peso: 6,
      tamanos: [["grande", 1]],
      opciones: [["perro-3.svg", "Dorado claro", 3], ["perro-2.svg", "Negro", 3], ["perro-4.svg", "Chocolate", 2]],
    },
    {
      raza: "Golden Retriever",
      peso: 4,
      tamanos: [["grande", 1]],
      opciones: [["perro-3.svg", "Dorado", 3], ["perro-7.svg", "Dorado rojizo", 1]],
    },
    {
      raza: "Pastor Alemán",
      peso: 4,
      tamanos: [["grande", 1]],
      opciones: [["perro-8.svg", "Café y negro", 4], ["perro-2.svg", "Negro", 1]],
    },
    {
      raza: "French Poodle",
      peso: 6,
      tamanos: [["chico", 3], ["mediano", 1]],
      opciones: [
        ["perro-5.svg", "Blanco con orejas crema", 3], ["perro-3.svg", "Crema", 2], ["perro-2.svg", "Negro", 1],
        ["perro-6.svg", "Gris plata", 1], ["perro-4.svg", "Café", 1], ["perro-7.svg", "Rojizo", 1],
      ],
    },
    {
      raza: "Pug",
      peso: 4,
      tamanos: [["chico", 1]],
      opciones: [["perro-8.svg", "Beige con máscara negra", 4], ["perro-2.svg", "Negro", 1]],
    },
    {
      raza: "Beagle",
      peso: 3,
      tamanos: [["mediano", 1]],
      opciones: [["perro-5.svg", "Blanco con manchas cafés", 2], ["perro-1.svg", "Café claro con hocico blanco", 2]],
    },
    {
      raza: "Husky",
      peso: 4,
      tamanos: [["grande", 2], ["mediano", 1]],
      opciones: [["perro-6.svg", "Gris y blanco", 4], ["perro-7.svg", "Rojizo y blanco", 1]],
    },
    {
      raza: "Pitbull",
      peso: 5,
      tamanos: [["mediano", 2], ["grande", 1]],
      opciones: [
        ["perro-6.svg", "Gris azulado", 3], ["perro-1.svg", "Canela", 2], ["perro-2.svg", "Negro", 2],
        ["perro-7.svg", "Rojizo", 1], ["perro-5.svg", "Blanco con manchas cafés", 1],
      ],
    },
    {
      raza: "Yorkshire",
      peso: 4,
      tamanos: [["chico", 1]],
      opciones: [["perro-8.svg", "Café y negro", 3], ["perro-6.svg", "Gris azulado y dorado", 1]],
    },
    {
      raza: "Bulldog Francés",
      peso: 3,
      tamanos: [["chico", 1]],
      opciones: [["perro-8.svg", "Beige con máscara negra", 2], ["perro-2.svg", "Negro atigrado", 2], ["perro-3.svg", "Crema", 1]],
    },
    {
      raza: "Dachshund",
      peso: 4,
      tamanos: [["chico", 1]],
      opciones: [["perro-7.svg", "Rojizo", 3], ["perro-4.svg", "Chocolate", 2], ["perro-2.svg", "Negro y fuego", 1]],
    },
    {
      raza: "Shih Tzu",
      peso: 5,
      tamanos: [["chico", 1]],
      opciones: [["perro-5.svg", "Blanco con manchas cafés", 3], ["perro-3.svg", "Crema", 2], ["perro-6.svg", "Gris y blanco", 1]],
    },
  ],
  gato: [
    {
      raza: "Doméstico pelo corto",
      peso: 64,
      tamanos: [["chico", 3], ["mediano", 2]],
      opciones: [
        ["gato-1.svg", "Naranja atigrado", 5], ["gato-2.svg", "Negro", 5], ["gato-3.svg", "Gris claro", 2],
        ["gato-3.svg", "Gris atigrado", 2], ["gato-4.svg", "Blanco", 3], ["gato-5.svg", "Café", 2],
        ["gato-5.svg", "Café atigrado", 2], ["gato-6.svg", "Gris oscuro", 3],
      ],
    },
    {
      raza: "Siamés",
      peso: 10,
      tamanos: [["chico", 2], ["mediano", 1]],
      opciones: [["gato-siames.svg", "Crema con puntas café oscuro", 1]],
    },
    {
      raza: "Persa",
      peso: 8,
      tamanos: [["mediano", 1]],
      opciones: [["gato-4.svg", "Blanco", 3], ["gato-6.svg", "Gris azulado", 2], ["gato-1.svg", "Naranja", 1], ["gato-2.svg", "Negro", 1]],
    },
    {
      raza: "Angora",
      peso: 7,
      tamanos: [["mediano", 1]],
      opciones: [["gato-4.svg", "Blanco", 4], ["gato-2.svg", "Negro", 1], ["gato-3.svg", "Gris claro", 1]],
    },
    {
      raza: "Bengalí",
      peso: 4,
      tamanos: [["mediano", 1]],
      opciones: [["gato-5.svg", "Café atigrado con rosetas", 1]],
    },
    {
      raza: "Maine Coon",
      peso: 6,
      tamanos: [["grande", 2], ["mediano", 1]],
      opciones: [["gato-5.svg", "Café atigrado", 2], ["gato-1.svg", "Naranja atigrado", 1], ["gato-3.svg", "Gris atigrado", 1]],
    },
  ],
};

const NOMBRES_MASCOTA: Record<Especie, Record<Sexo, string[]>> = {
  perro: {
    macho: [
      "Max", "Rocky", "Toby", "Bruno", "Thor", "Zeus", "Simba", "Firulais", "Rex", "Lucky", "Benito", "Pancho",
      "Oso", "Duque", "Coco", "Milo", "Bobby", "Tyson", "Scooby", "Pirata", "Güero", "Chato", "Canelo", "Frijol",
      "Taco", "Kiko", "Hachi", "Chester", "Beto", "Panchito", "Rufo", "Tito", "Jack", "Charly", "Bolillo",
    ],
    hembra: [
      "Luna", "Canela", "Kira", "Lola", "Nala", "Princesa", "Chispa", "Mía", "Frida", "Daisy", "Fiona", "Bonita",
      "Pelusa", "Muñeca", "Chiquis", "Bombón", "Perla", "Maya", "Lupita", "Greta", "Mora", "Coqueta", "Estrella",
      "Sasha", "Nena", "Cleo", "Pecas", "Galleta", "Mandarina", "Tita", "Chabela", "Reina",
    ],
  },
  gato: {
    macho: [
      "Michi", "Garfield", "Félix", "Tigre", "Salem", "Simón", "Oreo", "Benito", "Bigotes", "Milo", "Tom", "Panqué",
      "Morris", "Copito", "Mishu", "Pelusín", "Silvestre", "Kiwi", "Chocolate", "Frijol", "Gordo", "Mostaza",
    ],
    hembra: [
      "Mimí", "Luna", "Nieve", "Misha", "Kitty", "Pancha", "Cleo", "Manchita", "Pelusa", "Sol", "Toña", "Frida",
      "Nala", "Canela", "Lili", "Coqueta", "Princesa", "Sombra", "Perla", "Michelle", "Tortilla", "Chispita",
    ],
  },
};

// Propietarios ficticios: sólo nombre de pila + inicial del apellido.
const NOMBRES_PROPIETARIO = [
  "María", "Guadalupe", "Ana", "Sofía", "Fernanda", "Daniela", "Valeria", "Mariana", "Gabriela", "Alejandra",
  "Patricia", "Verónica", "Lucía", "Regina", "Ximena", "Andrea", "Carmen", "Rosa", "Paola", "Elena", "Claudia",
  "Mónica", "Lorena", "Isabel", "Natalia", "Renata", "Camila", "Adriana", "Martha", "Silvia",
  "José", "Juan", "Luis", "Carlos", "Jorge", "Miguel", "Alejandro", "Eduardo", "Fernando", "Ricardo", "Roberto",
  "Javier", "Diego", "Rodrigo", "Arturo", "Héctor", "Sergio", "Raúl", "Mauricio", "Andrés", "Emilio", "Santiago",
  "Mateo", "Pablo", "Óscar", "Gerardo", "Francisco", "Manuel", "Gustavo", "Enrique",
];
const INICIALES: readonly (readonly [string, number])[] = [
  ["G", 14], ["M", 12], ["R", 10], ["L", 9], ["H", 8], ["S", 8], ["C", 8], ["T", 6], ["V", 6], ["P", 5],
  ["D", 5], ["O", 4], ["E", 4], ["F", 4], ["B", 3], ["Z", 3], ["N", 2], ["A", 3], ["Q", 1], ["I", 1], ["J", 1],
];

const SENAS_PERRO = [
  "Collar rojo con placa", "Collar azul sin placa", "Mancha blanca en el pecho", "Cola cortada",
  "Oreja izquierda doblada", "Le falta un colmillo", "Cicatriz en la pata trasera derecha", "Muy sociable con niños",
  "Tímido con extraños", "Pelo largo", "Uñas negras", "Lunar en el hocico", "Pañoleta verde", "Cojea levemente al correr",
];
const SENAS_GATO = [
  "Ojos verdes", "Collar con cascabel", "Punta de la cola blanca", "Oreja con muesca (esterilización)",
  "Muy arisco con extraños", "Se deja cargar", "Pelo esponjado", "Bigotes blancos", "Cicatriz en la nariz",
];
const SENA_MANCHA_OJO = "Mancha más oscura alrededor del ojo izquierdo";
const FOTOS_CON_MANCHA = new Set(["perro-1.svg", "perro-3.svg", "perro-5.svg", "perro-7.svg"]);
const FOTOS_ATIGRADAS = new Set(["gato-1.svg", "gato-3.svg", "gato-5.svg"]);

const VACUNAS: Record<Especie, string[]> = {
  perro: ["Múltiple canina (DHPPi+L)", "Parvovirus", "Bordetella", "Desparasitación interna"],
  gato: ["Triple felina", "Leucemia felina", "Desparasitación interna"],
};

// Colonias donde la app principal concentra reportes (escenario de la demo): más mascotas.
const COLONIAS_FOCO = ["San Pedro 400", "Lucio Blanco", "El Obispo", "U.H. Revolución", "Casco Urbano", "Vista Montaña"];
const COLONIAS_APP = [
  "Tampiquito", "Los Pinos", "Mirasierra", "Los Sauces", "Colonial de la Sierra", "Lomas del Valle",
  "Fuentes del Valle", "Del Valle", "Carrizalejo", "Valle de San Ángel", "Bosques del Valle",
  "Residencial San Agustín", "Valle Oriente",
];

// Registros por año (el programa crece con el tiempo).
const ANIOS: readonly (readonly [number, number])[] = [
  [2019, 4], [2020, 5], [2021, 9], [2022, 13], [2023, 17], [2024, 22], [2025, 22], [2026, 8],
];

/** Mascotas fijas pensadas para la demo de CallejerOS (ver README). */
type Fija = {
  nombre: string; especie: Especie; raza: string; color: string; tamano: Tamano; sexo: Sexo; foto: string;
  colonia: string; fecha_registro: string; edad_dias: number; senas: string;
};
const FIJAS: Fija[] = [
  {
    nombre: "Canela", especie: "perro", raza: "Mestizo", color: "Café claro", tamano: "mediano", sexo: "hembra",
    foto: "perro-1.svg", colonia: "Tampiquito", fecha_registro: "2024-03-12", edad_dias: 700,
    senas: "Mancha café oscuro en un ojo; collar rojo sin placa",
  },
  {
    nombre: "Chester", especie: "perro", raza: "Mestizo", color: "Gris oscuro y negro", tamano: "mediano",
    sexo: "macho", foto: "perro-6.svg", colonia: "Casco Urbano", fecha_registro: "2023-08-21", edad_dias: 1500,
    senas: "Cojea levemente de una pata trasera (lesión antigua)",
  },
  {
    nombre: "Nieve", especie: "gato", raza: "Doméstico pelo corto", color: "Gris claro con blanco", tamano: "chico",
    sexo: "hembra", foto: "gato-3.svg", colonia: "Los Pinos", fecha_registro: "2025-01-30", edad_dias: 500,
    senas: "Ojos verdes; manchas grises en el lomo",
  },
];

function claveTexto(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

async function main() {
  // --- Colonias
  type Base = { nombre: string; lat: number; lng: number; codigo_postal: string | null; distrito: string | null; aprox?: true };
  const base = JSON.parse(await readFile(join(RAIZ, "data/fuentes/colonias-base.json"), "utf8")) as Base[];
  const nombres = new Set<string>();
  const colonias: Colonia[] = base
    .filter((c) => !nombres.has(c.nombre) && nombres.add(c.nombre))
    .sort((a, b) => {
      const ka = claveTexto(a.nombre);
      const kb = claveTexto(b.nombre);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .map((c, i) => ({
      clave: `COL-${String(i + 1).padStart(3, "0")}`,
      nombre: c.nombre,
      lat: c.lat,
      lng: c.lng,
      codigo_postal: c.codigo_postal,
      distrito: c.distrito,
      ...(c.aprox ? { aprox: true as const } : {}),
    }));
  const coloniaPorNombre = new Map(colonias.map((c) => [c.nombre, c]));
  for (const n of [...COLONIAS_FOCO, ...COLONIAS_APP]) {
    if (!coloniaPorNombre.has(n)) throw new Error(`Falta la colonia "${n}" que usa la app principal`);
  }
  const pesosColonia = colonias.map(
    (c) => [c, COLONIAS_FOCO.includes(c.nombre) ? 4 : COLONIAS_APP.includes(c.nombre) ? 2 : 1] as const,
  );

  // --- Mascotas (sin folio todavía)
  type Borrador = Omit<MascotaRegistro, "folio">;
  const microchips = new Set<string>();
  const nuevoMicrochip = () => {
    for (;;) {
      let m = "484"; // código ISO 3166 de México (ISO 11784)
      for (let i = 0; i < 12; i++) m += entero(0, 9);
      if (!microchips.has(m)) {
        microchips.add(m);
        return m;
      }
    }
  };
  const nuevoTelefono = () => `81••••${String(entero(0, 9999)).padStart(4, "0")}`;
  const propietario = () => ({ nombre: `${elegir(NOMBRES_PROPIETARIO)} ${ponderado(INICIALES)}.`, telefono_enmascarado: nuevoTelefono() });

  function vacunas(especie: Especie, nacimiento: number, registro: number): Vacuna[] {
    const lista: Vacuna[] = [];
    const minimo = nacimiento + 90;
    // La antirrábica es requisito del registro: aplicada alrededor de la fecha de alta.
    const antirrabica = Math.min(CORTE, Math.max(minimo, registro - entero(0, 60)));
    lista.push({ nombre: "Antirrábica", fecha: aIso(antirrabica) });
    if (CORTE - antirrabica > 400 && azar() < 0.6) {
      lista.push({ nombre: "Antirrábica (refuerzo)", fecha: aIso(Math.min(CORTE, antirrabica + entero(330, 400))) });
    }
    const otras = barajar([...VACUNAS[especie]]).slice(0, entero(0, 2));
    for (const nombre of otras) {
      const desde = nacimiento + 60;
      if (desde >= CORTE) continue;
      lista.push({ nombre, fecha: aIso(entero(desde, CORTE)) });
    }
    return lista.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.nombre < b.nombre ? -1 : 1));
  }

  function fechaRegistro() {
    const anio = ponderado(ANIOS);
    const inicio = aDia(`${anio}-01-01`);
    const fin = Math.min(aDia(`${anio}-12-31`), CORTE);
    return entero(inicio, fin);
  }

  function edadAlRegistro() {
    const tramo = ponderado([["cachorro", 35], ["adulto", 45], ["mayor", 20]] as const);
    if (tramo === "cachorro") return entero(60, 365);
    if (tramo === "adulto") return entero(366, 5 * 365);
    return entero(5 * 365, 12 * 365);
  }

  const borradores: Borrador[] = [];
  const especies = barajar([
    ...Array<Especie>(TOTAL_PERROS - FIJAS.filter((f) => f.especie === "perro").length).fill("perro"),
    ...Array<Especie>(TOTAL_MASCOTAS - TOTAL_PERROS - FIJAS.filter((f) => f.especie === "gato").length).fill("gato"),
  ]);
  for (const especie of especies) {
    const r = ponderado(RAZAS[especie].map((x) => [x, x.peso] as const));
    const [foto, color] = ponderado(r.opciones.map((o) => [[o[0], o[1]] as const, o[2]] as const));
    const sexo: Sexo = azar() < 0.5 ? "macho" : "hembra";
    const registro = fechaRegistro();
    const nacimiento = registro - edadAlRegistro();
    const senas: string[] = [];
    if (especie === "perro" && FOTOS_CON_MANCHA.has(foto) && azar() < 0.5) senas.push(SENA_MANCHA_OJO);
    if (especie === "gato" && FOTOS_ATIGRADAS.has(foto) && azar() < 0.3) senas.push("Rayas en la frente en forma de M");
    if (r.raza === "Siamés" && azar() < 0.5) senas.push("Ojos azules");
    if (azar() < 0.4) senas.push(elegir(especie === "perro" ? SENAS_PERRO : SENAS_GATO));
    const colonia = ponderado(pesosColonia);
    borradores.push({
      nombre: elegir(NOMBRES_MASCOTA[especie][sexo]),
      especie,
      raza: r.raza,
      color,
      tamano: ponderado(r.tamanos),
      sexo,
      fecha_nacimiento: aIso(nacimiento),
      esterilizada: azar() < (CORTE - nacimiento > 365 ? 0.7 : 0.35),
      vacunas: vacunas(especie, nacimiento, registro),
      microchip: azar() < 0.6 ? nuevoMicrochip() : null,
      senas_particulares: senas.length ? senas.join("; ") : null,
      foto,
      colonia: { clave: colonia.clave, nombre: colonia.nombre },
      propietario: propietario(),
      fecha_registro: aIso(registro),
      estatus: azar() < 0.02 ? "extraviado" : "activo",
    });
  }
  for (const f of FIJAS) {
    const registro = aDia(f.fecha_registro);
    const nacimiento = registro - f.edad_dias;
    const colonia = coloniaPorNombre.get(f.colonia)!;
    borradores.push({
      nombre: f.nombre,
      especie: f.especie,
      raza: f.raza,
      color: f.color,
      tamano: f.tamano,
      sexo: f.sexo,
      fecha_nacimiento: aIso(nacimiento),
      esterilizada: true,
      vacunas: vacunas(f.especie, nacimiento, registro),
      microchip: nuevoMicrochip(),
      senas_particulares: f.senas,
      foto: f.foto,
      colonia: { clave: colonia.clave, nombre: colonia.nombre },
      propietario: propietario(),
      fecha_registro: f.fecha_registro,
      estatus: "activo",
    });
  }

  // Folios consecutivos en orden de fecha de registro: SPGG-M-<año>-<consecutivo>.
  const mascotas: MascotaRegistro[] = borradores
    .map((b, i) => ({ b, i }))
    .sort((x, y) => (x.b.fecha_registro < y.b.fecha_registro ? -1 : x.b.fecha_registro > y.b.fecha_registro ? 1 : x.i - y.i))
    .map(({ b }, n) => ({ folio: `SPGG-M-${b.fecha_registro.slice(0, 4)}-${String(n + 1).padStart(5, "0")}`, ...b }));

  // --- Fotos embebidas
  const archivos = (await readdir(join(RAIZ, "public/fotos"))).filter((f) => f.endsWith(".svg")).sort();
  const fotos: Record<string, string> = {};
  for (const a of archivos) fotos[a] = (await readFile(join(RAIZ, "public/fotos", a), "utf8")).replace(/\r\n/g, "\n");
  for (const m of mascotas) if (!fotos[m.foto]) throw new Error(`Falta la foto ${m.foto}`);

  await writeFile(join(RAIZ, "data/colonias.json"), JSON.stringify(colonias, null, 2) + "\n");
  await writeFile(join(RAIZ, "data/mascotas.json"), JSON.stringify(mascotas, null, 2) + "\n");
  await writeFile(join(RAIZ, "data/fotos.json"), JSON.stringify(fotos, null, 2) + "\n");

  const perros = mascotas.filter((m) => m.especie === "perro").length;
  console.log(`${colonias.length} colonias (${colonias.filter((c) => c.aprox).length} con centro aproximado)`);
  console.log(`${mascotas.length} mascotas: ${perros} perros, ${mascotas.length - perros} gatos`);
  console.log(`Con microchip: ${mascotas.filter((m) => m.microchip).length} · extraviadas: ${mascotas.filter((m) => m.estatus === "extraviado").length}`);
  console.log(`Fijas para demo: ${FIJAS.map((f) => `${f.nombre} → ${mascotas.find((m) => m.nombre === f.nombre && m.fecha_registro === f.fecha_registro)!.folio}`).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
