/**
 * Datos demo de CallejerOS: usuarios por rol, ~60 animales, ~150 avistamientos,
 * historial de estados y huellas coherentes con las reglas de la base.
 *
 *   npm run seed            # falla si ya hay datos demo
 *   npm run seed -- --reset # borra usuarios demo y TODOS los animales, y vuelve a sembrar
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_PASSWORD.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "../src/types/database.types";
import { DEMO_EMAILS, type Condicion, type Especie, type Estado, type Rol } from "../src/lib/constants";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;
const RESET = process.argv.includes("--reset");

if (!URL || !SECRET || !PASSWORD) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o DEMO_PASSWORD en .env.local");
  process.exit(1);
}

const db = createClient<Database>(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

// ───────── Aleatoriedad reproducible ─────────
let semilla = 20261009;
function rand() {
  semilla |= 0;
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
function pesado<T>(opciones: [T, number][]): T {
  const total = opciones.reduce((s, [, p]) => s + p, 0);
  let r = rand() * total;
  for (const [valor, peso] of opciones) if ((r -= peso) <= 0) return valor;
  return opciones[opciones.length - 1][0];
}
const HORA = 3_600_000;
const DIA = 24 * HORA;
const AHORA = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

// ───────── Catálogos ─────────
interface UsuarioDemo {
  email: string;
  nombre: string;
  rol: Rol;
  colonia?: string;
}

const USUARIOS: UsuarioDemo[] = [
  { email: DEMO_EMAILS.vecino, nombre: "Vecina Demo", rol: "vecino", colonia: "Casco Urbano" },
  { email: DEMO_EMAILS.rescatista, nombre: "Rescatista Demo", rol: "rescatista" },
  { email: DEMO_EMAILS.municipio, nombre: "Municipio Demo", rol: "municipio" },
  { email: "ana.rescate@callejeros.demo", nombre: "Ana Villarreal", rol: "rescatista" },
  { email: "jorge.rescate@callejeros.demo", nombre: "Jorge Treviño", rol: "rescatista" },
  ...(
    [
      ["Mariana Garza", "San Pedro 400"],
      ["Rodrigo Lozano", "San Pedro 400"],
      ["Luis Cantú", "Lucio Blanco"],
      ["Lucía Benavides", "Lucio Blanco"],
      ["Sofía Elizondo", "El Obispo"],
      ["Diego Salinas", "U.H. Revolución"],
      ["Valeria Leal", "Casco Urbano"],
      ["Andrés Montemayor", "Vista Montaña"],
      ["Paola Martínez", "Tampiquito"],
      ["Carlos Ramos", "Los Pinos"],
      ["Fernanda Zambrano", "Del Valle"],
      ["Ricardo Guajardo", "Fuentes del Valle"],
      ["Daniela Cavazos", "Mirasierra"],
      ["Gabriela Ochoa", "Valle Oriente"],
      ["Tomás Villegas", "Los Sauces"],
    ] as const
  ).map(([nombre, colonia], i) => ({
    email: `vecino${String(i + 1).padStart(2, "0")}@callejeros.demo`,
    nombre,
    rol: "vecino" as const,
    colonia,
  })),
];

// Colonias con más animales para que el mapa de calor tenga zonas claras.
const CLUSTERS: [string, number][] = [
  ["San Pedro 400", 10],
  ["Lucio Blanco", 9],
  ["El Obispo", 7],
  ["U.H. Revolución", 7],
  ["Casco Urbano", 6],
  ["Vista Montaña", 5],
];
const TOTAL_ANIMALES = 60;

// El índice de color coincide con la ilustración placeholder (perro-1…8, gato-1…6).
const COLORES_PERRO = [
  "Café claro",
  "Negro",
  "Beige",
  "Café oscuro",
  "Blanco con manchas cafés",
  "Gris",
  "Rojizo",
  "Beige con orejas negras",
];
const COLORES_GATO = ["Naranja atigrado", "Negro", "Gris claro", "Blanco con naranja", "Café", "Gris oscuro"];
const RASGOS_PERRO = [
  "orejas caídas",
  "collar rojo sin placa",
  "cola enroscada",
  "mancha en un ojo",
  "pelo largo",
  "muy amistoso",
  "asustadizo",
  "cojea de una pata trasera",
  "tamaño mediano",
];
const RASGOS_GATO = ["ojos verdes", "cola corta", "muy arisco", "se deja acariciar", "pelo esponjado", "tamaño pequeño"];
const APODOS = [
  "Canela", "Chispa", "Nube", "Pinto", "Lucero", "Mancha", "Bigotes", "Tamal", "Galleta", "Rayo",
  "Chocolate", "Pelusa", "Tito", "Luna", "Frijol", "Pecas", "Kiwi", "Sombra", "Pancho", "Mora",
];
const NOTAS = [
  "Estaba cerca de la tienda de la esquina.",
  "Se ve con hambre, le dejamos agua.",
  "Duerme debajo de un carro estacionado.",
  "Lo vi temprano en la mañana.",
  "Anda con otros dos perros.",
  "Se refugia en la entrada de la iglesia.",
  "Los vecinos le dan de comer.",
  "Cruzó la avenida, cuidado.",
];
const NOTAS_ESTADO: Record<Estado, string[]> = {
  avistado: [],
  en_atencion: ["Caso tomado", "Vamos en camino"],
  rescatado: ["Lo llevamos al refugio temporal", "Rescatado, en revisión veterinaria"],
  esterilizado: ["Campaña municipal de esterilización", "Esterilizado y vacunado"],
  adoptado: ["¡Encontró familia!", "Adoptado por una familia de la colonia"],
};

// ───────── Utilidades de BD ─────────
async function ok<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>, que: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data as T;
}

async function usuariosDemoExistentes() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((u) => u.email?.endsWith("@callejeros.demo"));
}

async function reset() {
  console.log("↺ Borrando datos demo…");
  for (const u of await usuariosDemoExistentes()) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) throw error;
  }
  await ok(db.from("animals").delete().not("id", "is", null), "borrar animales");
}

// ───────── Seed ─────────
async function main() {
  const existentes = await usuariosDemoExistentes();
  if (existentes.length > 0) {
    if (!RESET) {
      console.error("Ya hay datos demo. Usa `npm run seed -- --reset` para regenerarlos.");
      process.exit(1);
    }
    await reset();
  }

  const colonias = await ok(db.from("colonias").select("id, nombre, lat, lng"), "leer colonias");
  const coloniaPorNombre = new Map(colonias.map((c) => [c.nombre, c]));

  // 1. Usuarios
  console.log("👤 Creando usuarios…");
  const ids = new Map<string, string>();
  for (const u of USUARIOS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: u.nombre },
    });
    if (error) throw new Error(`crear ${u.email}: ${error.message}`);
    ids.set(u.email, data.user.id);
    await ok(
      db
        .from("profiles")
        .update({ rol: u.rol, colonia_id: u.colonia ? coloniaPorNombre.get(u.colonia)!.id : null })
        .eq("id", data.user.id),
      `perfil ${u.email}`,
    );
  }

  const vecinos = USUARIOS.filter((u) => u.rol === "vecino");
  const rescatistas = USUARIOS.filter((u) => u.rol === "rescatista");
  const municipio = USUARIOS.find((u) => u.rol === "municipio")!;

  // 2. Animales, avistamientos y estados
  console.log("🐾 Generando animales…");
  const animales: TablesInsert<"animals">[] = [];
  const avistamientos: TablesInsert<"sightings">[] = [];
  const cambios: TablesInsert<"status_updates">[] = [];
  const huellas: TablesInsert<"point_events">[] = [];

  const ubicaciones: { colonia: string; cluster: boolean }[] = [];
  for (const [colonia, n] of CLUSTERS) for (let i = 0; i < n; i++) ubicaciones.push({ colonia, cluster: true });
  const otras = colonias.map((c) => c.nombre).filter((n) => !CLUSTERS.some(([c]) => c === n));
  while (ubicaciones.length < TOTAL_ANIMALES) ubicaciones.push({ colonia: pick(otras), cluster: false });

  let avistadosRecientesEnCasco = 0;

  for (const { colonia, cluster } of ubicaciones) {
    const centro = coloniaPorNombre.get(colonia)!;
    const base = { lat: centro.lat + gauss() * 0.0008, lng: centro.lng + gauss() * 0.0009 };

    const especie = pesado<Especie>([["perro", 65], ["gato", 30], ["otro", 5]]);
    const estado = pesado<Estado>(
      cluster
        ? [["avistado", 5], ["en_atencion", 2], ["rescatado", 2], ["esterilizado", 1.5], ["adoptado", 1]]
        : [["avistado", 2], ["en_atencion", 1.5], ["rescatado", 2], ["esterilizado", 2], ["adoptado", 2]],
    );

    // Condición y urgencia coherentes.
    const condiciones = new Set<Condicion>([pesado<Condicion>([["sano", 40], ["flaco", 30], ["herido", 15], ["cachorro", 15]])]);
    if (rand() < 0.2) condiciones.add(pick<Condicion>(["flaco", "cachorro"]));
    if (condiciones.size > 1) condiciones.delete("sano");
    let urgencia = condiciones.has("herido") ? int(4, 5) : condiciones.has("flaco") ? int(2, 3) : int(1, 2);
    if (condiciones.has("cachorro")) urgencia = Math.min(5, urgencia + 1);

    // Ilustración y rasgos.
    let foto: string;
    let rasgos: string;
    if (especie === "perro") {
      const i = int(0, COLORES_PERRO.length - 1);
      foto = `/placeholders/perro-${i + 1}.svg`;
      rasgos = `${COLORES_PERRO[i]}, ${pick(RASGOS_PERRO)}`;
    } else if (especie === "gato") {
      const i = int(0, COLORES_GATO.length - 1);
      foto = `/placeholders/gato-${i + 1}.svg`;
      rasgos = `${COLORES_GATO[i]}, ${pick(RASGOS_GATO)}`;
    } else {
      foto = `/placeholders/otro-${int(1, 2)}.svg`;
      rasgos = pick(["Conejo blanco", "Tortuga mediana", "Gallina suelta"]);
    }

    // Línea de tiempo: más días de historia para los estados avanzados.
    const idx = (["avistado", "en_atencion", "rescatado", "esterilizado", "adoptado"] as Estado[]).indexOf(estado);
    const duraciones = [int(1, 4), int(1, 6), int(5, 18), int(7, 25)].slice(0, idx).map((d) => d * DIA + int(1, 20) * HORA);
    const historia = duraciones.reduce((s, d) => s + d, 0);
    const recienteEnCasco = estado === "avistado" && colonia === "Casco Urbano" && avistadosRecientesEnCasco < 4;
    const holgura = recienteEnCasco || (estado === "avistado" && rand() < 0.5) ? int(2, 120) * HORA : int(1, 150) * DIA;
    const creado = AHORA - historia - holgura - int(1, 10) * HORA;
    if (recienteEnCasco) avistadosRecientesEnCasco++;

    const tiemposEstado: number[] = [];
    let t = creado;
    for (const d of duraciones) tiemposEstado.push((t += d));
    const finActivo = idx >= 2 ? tiemposEstado[1] : AHORA - HORA; // tras el rescate ya no se ve en la calle

    const animalId = crypto.randomUUID();
    const rescatista = idx >= 1 ? pesado(rescatistas.map((r, i) => [r, i === 0 ? 4 : 3] as [UsuarioDemo, number])) : null;

    // Avistamientos: el primero crea el animal; los demás son confirmaciones.
    const pesoVecino = (v: UsuarioDemo) =>
      (v.colonia === colonia ? 4 : 1) * (v.email === DEMO_EMAILS.vecino ? 1.5 : 1);
    const reportero = pesado(vecinos.map((v) => [v, pesoVecino(v)] as [UsuarioDemo, number]));
    const extras = pesado([[0, 25], [1, 30], [2, 25], [3, 12], [4, 8]]);
    const tiempos = [creado, ...Array.from({ length: extras }, () => creado + rand() * (finActivo - creado))].sort(
      (a, b) => a - b,
    );

    let ultimo = { ...base, t: creado };
    tiempos.forEach((ts, i) => {
      const autor =
        i === 0
          ? reportero
          : pesado(vecinos.filter((v) => v !== reportero).map((v) => [v, pesoVecino(v)] as [UsuarioDemo, number]));
      const punto = { lat: base.lat + gauss() * 0.0002, lng: base.lng + gauss() * 0.0002 };
      avistamientos.push({
        animal_id: animalId,
        user_id: ids.get(autor.email)!,
        foto_url: i === 0 || rand() < 0.7 ? foto : null,
        lat: punto.lat,
        lng: punto.lng,
        notas: rand() < 0.6 ? pick(NOTAS) : null,
        es_confirmacion: i > 0,
        created_at: iso(ts),
      });
      ultimo = { ...punto, t: ts };
    });

    animales.push({
      id: animalId,
      especie,
      apodo: rand() < 0.5 ? pick(APODOS) : null,
      rasgos,
      condiciones: [...condiciones],
      estado,
      urgencia,
      lat: ultimo.lat,
      lng: ultimo.lng,
      foto_portada_url: foto,
      reportado_por: ids.get(reportero.email)!,
      rescatista_id: rescatista ? ids.get(rescatista.email)! : null,
      total_avistamientos: tiempos.length,
      visto_ultima_vez: iso(ultimo.t),
      created_at: iso(creado),
    });

    // Historial de estados.
    const flujo: Estado[] = ["avistado", "en_atencion", "rescatado", "esterilizado", "adoptado"];
    for (let i = 1; i <= idx; i++) {
      const quien = flujo[i] === "esterilizado" && rand() < 0.4 ? municipio : rescatista!;
      cambios.push({
        animal_id: animalId,
        user_id: ids.get(quien.email)!,
        estado_anterior: flujo[i - 1],
        estado_nuevo: flujo[i],
        nota: pick(NOTAS_ESTADO[flujo[i]]),
        created_at: iso(tiemposEstado[i - 1]),
      });
    }

    // Huellas: +10 reporte, +5 primera confirmación, escalonado al rescatarse.
    const primeraVez = new Map<string, number>();
    avistamientos
      .filter((s) => s.animal_id === animalId)
      .forEach((s) => {
        if (!primeraVez.has(s.user_id!)) primeraVez.set(s.user_id!, Date.parse(s.created_at!));
      });
    const reporteroId = ids.get(reportero.email)!;
    for (const [userId, ts] of primeraVez) {
      huellas.push(
        userId === reporteroId
          ? { user_id: userId, motivo: "reporte", puntos: 10, animal_id: animalId, created_at: iso(ts) }
          : { user_id: userId, motivo: "confirmacion", puntos: 5, animal_id: animalId, created_at: iso(ts) },
      );
    }
    if (idx >= 2) {
      [...primeraVez.entries()]
        .sort((a, b) => a[1] - b[1])
        .forEach(([userId], orden) =>
          huellas.push({
            user_id: userId,
            motivo: "caso_resuelto",
            puntos: [20, 15, 10][orden] ?? 5,
            animal_id: animalId,
            created_at: iso(tiemposEstado[1]),
          }),
        );
    }
  }

  console.log("💾 Guardando…");
  await ok(db.from("animals").insert(animales), "insertar animales");
  await ok(db.from("sightings").insert(avistamientos), "insertar avistamientos");
  await ok(db.from("status_updates").insert(cambios), "insertar estados");
  await ok(db.from("point_events").insert(huellas), "insertar huellas");

  console.log("🏅 Otorgando insignias…");
  for (const id of ids.values()) await ok(db.rpc("award_badges", { p_user: id }), "insignias");

  const conteo = animales.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.estado!]: (acc[a.estado!] ?? 0) + 1 }), {});
  console.log(`\n✅ Listo: ${USUARIOS.length} usuarios, ${animales.length} animales, ${avistamientos.length} avistamientos.`);
  console.log("   Estados:", conteo);
  console.log(`   Usuarios demo: ${Object.values(DEMO_EMAILS).join(", ")} (contraseña: DEMO_PASSWORD)`);
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
