# Registro municipal de mascotas — API simulada

> **Simulación — no es un servicio oficial del municipio de San Pedro Garza García.**
> Las mascotas, los propietarios, los teléfonos y los folios son ficticios. No se envía ningún SMS.

En el taller, el municipio comentó que tiene un equipo a cargo del registro de mascotas que más adelante
podría exponerse por API. Este proyecto simula ese servicio **externo** (con su propio despliegue) para que
CallejerOS pueda integrarse desde ya: consultar el padrón, buscar coincidencias entre un animal reportado en
la calle y las mascotas registradas, avisar a la familia y reportar extravíos.

- TypeScript + [Hono](https://hono.dev). Sin base de datos: los datos son JSON generados de forma determinista.
- Todas las respuestas llevan el encabezado `X-Simulacion: true`. CORS cerrado salvo los orígenes de `CORS_ORIGENES`.
- Publicado en **https://callejeros-registro.vercel.app** (proyecto `callejeros-registro` de Vercel).
- Documentación navegable con consola “Probar” en `GET /` y especificación en `GET /openapi.json` (OpenAPI 3.1).

## Inicio rápido

```bash
cd registro-municipal-api
npm install
npm run dev          # http://localhost:4000 (recarga al guardar)
npx tsc --noEmit     # verificación de tipos
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local con recarga (`tsx watch src/local.ts`), puerto `PORT` o 4000 |
| `npm start` | Igual, sin recarga |
| `npm run generar` | Regenera `data/colonias.json`, `data/mascotas.json` y `data/fotos.json` (determinista) |
| `npm run investigar-colonias` | Vuelve a armar `data/fuentes/colonias-base.json` desde las fuentes (usa la red) |
| `npm run typecheck` | `tsc --noEmit` |

## Variables de entorno

**En este servicio**

| Variable | Uso |
| --- | --- |
| `REGISTRO_API_KEY` | Clave que deben enviar los clientes en `X-Api-Key`. Si no está definida se usa `demo-callejeros-2026` y la página `/` la muestra. **En Vercel es obligatoria**: sin ella, las rutas protegidas responden `503`. |
| `CORS_ORIGENES` | Orígenes de navegador autorizados, separados por coma (p. ej. `https://callejeros-six.vercel.app`). Vacío = ninguno: la app principal llama de servidor a servidor y no lo necesita. |
| `PORT` | Sólo en local (por defecto 4000). |

**En la app principal (CallejerOS)**

| Variable | Ejemplo |
| --- | --- |
| `REGISTRO_API_URL` | `http://localhost:4000` en local, o la URL del proyecto en Vercel (sin `/` final) |
| `REGISTRO_API_KEY` | El mismo valor configurado en este servicio |

## Autenticación

Encabezado `X-Api-Key: <clave>`. Son públicas: `GET /`, `GET /openapi.json`, `GET /salud` y `GET /fotos/*`.
Sin clave o con una clave incorrecta: `401 {"error": "..."}`. Los errores de validación responden
`400 {"error": "..."}` y los recursos inexistentes `404 {"error": "..."}`.

### Seguridad

- La clave se compara en tiempo constante (no se puede adivinar carácter por carácter).
- CORS cerrado salvo los orígenes de `CORS_ORIGENES`; encabezados de seguridad (`hono/secure-headers`).
- Cuerpos de máximo 16 KB y 120 peticiones por minuto por IP en `/v1/*` (`413` y `429`). El límite
  es por instancia; el global se pone en el firewall de Vercel.

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/salud` | `{ ok: true, servicio: "registro-municipal-mascotas", version: "1.0.0", simulacion: true }` |
| GET | `/v1/colonias` | `{ data: Colonia[], total }` |
| GET | `/v1/mascotas?especie=perro\|gato&colonia=COL-###&q=texto&limit=20&offset=0` | `{ data: Mascota[], total }` (`limit` 1–100) |
| GET | `/v1/mascotas/:folio` | `Mascota` o 404 |
| GET | `/v1/mascotas/microchip/:numero` | `Mascota` o 404 |
| POST | `/v1/mascotas/coincidencias` | `{ data: { mascota, puntaje, motivos }[] }` |
| POST | `/v1/avisos-propietario` | 202 `{ id, folio, canal: "sms", estatus: "enviado", simulacion: true, enviado_at }` |
| GET | `/v1/avisos-propietario` | `{ data: Aviso[], total }`, más recientes primero (incluye `mensaje` y `referencia_externa`) |
| POST | `/v1/extravios` | 201 `{ id, folio, estatus: "registrado" }`; la mascota pasa a `estatus: "extraviado"` |
| DELETE | `/v1/extravios/:folio` | 200 `{ folio, estatus: "activo" }`; la mascota vuelve a `"activo"` |
| GET | `/fotos/:archivo` | Ilustración SVG |
| GET | `/` · `/openapi.json` | Documentación HTML · OpenAPI 3.1 |

`q` busca sin distinguir mayúsculas ni acentos en nombre, raza, color y folio (todas las palabras deben aparecer).
El folio se acepta en mayúsculas o minúsculas.

### Tipos

```ts
type Colonia = {
  clave: string;               // "COL-001"… en orden alfabético
  nombre: string;
  lat: number; lng: number;    // centro aproximado
  codigo_postal: string | null;
  distrito: string | null;     // distrito del Plan de Desarrollo Urbano 2024
  aprox?: true;                // sólo cuando el centro se estimó (ver "Colonias")
};

type Mascota = {
  folio: string;               // "SPGG-M-2024-00224"
  nombre: string;
  especie: "perro" | "gato";
  raza: string; color: string;
  tamano: "chico" | "mediano" | "grande";
  sexo: "macho" | "hembra";
  fecha_nacimiento: string;    // YYYY-MM-DD
  esterilizada: boolean;
  vacunas: { nombre: string; fecha: string }[];
  microchip: string | null;    // 15 dígitos (≈57 % tiene)
  senas_particulares: string | null;
  foto_url: string;            // absoluta, construida con el origen de la petición
  colonia: { clave: string; nombre: string };
  propietario: { nombre: string; telefono_enmascarado: string }; // "María G.", "81••••4521"
  fecha_registro: string;      // YYYY-MM-DD
  estatus: "activo" | "extraviado";
};
```

### Ejemplos

```bash
B=http://localhost:4000
K="X-Api-Key: demo-callejeros-2026"

curl "$B/salud"
curl "$B/v1/mascotas?especie=gato&q=siames&limit=5" -H "$K"
curl "$B/v1/mascotas/SPGG-M-2024-00224" -H "$K"

curl -X POST "$B/v1/mascotas/coincidencias" -H "$K" -H "Content-Type: application/json" \
  -d '{"especie":"perro","raza":"criollo","color":"café claro","tamano":"mediano","lat":25.6512,"lng":-100.3788}'

curl -X POST "$B/v1/avisos-propietario" -H "$K" -H "Content-Type: application/json" \
  -d '{"folio":"SPGG-M-2024-00224","mensaje":"Una vecina reportó a un perro parecido a Canela.","referencia_externa":"https://callejeros.example/animal/123"}'

curl -X POST "$B/v1/extravios" -H "$K" -H "Content-Type: application/json" \
  -d '{"folio":"SPGG-M-2024-00224","lat":25.6528,"lng":-100.3816,"fecha":"2026-10-14T18:30:00-06:00"}'
curl -X DELETE "$B/v1/extravios/SPGG-M-2024-00224" -H "$K"
```

> En Windows (Git Bash / PowerShell) los acentos escritos directamente en `-d '…'` pueden llegar mal
> codificados; usa `--data-binary @archivo.json` con el cuerpo guardado en UTF-8.

## Coincidencias

`POST /v1/mascotas/coincidencias` recibe `{ especie, raza?, color?, tamano?, sexo?, lat?, lng?, colonia?, limite? }`
(`limite` 1–50, 5 por defecto; se requiere al menos un criterio además de la especie).

- **Especie**: filtro obligatorio.
- **Puntaje** (0–1) = promedio ponderado *de los criterios enviados*: raza 0.25 · color 0.30 · tamaño 0.10 ·
  sexo 0.10 · ubicación 0.25. Sólo se devuelven resultados con puntaje ≥ 0.35, de mayor a menor.
- **Raza**: sin acentos ni mayúsculas, con sinónimos (`criollo`, `cruza`, `sin raza`… → Mestizo;
  `doméstico`, `común`… → Doméstico pelo corto; `poodle`/`caniche`, `salchicha`/`dachshund`, `yorkie`, etc.)
  y tolerancia a errores de dedo (Dice de bigramas). Mestizo vs. raza definida vale 0.25.
- **Color**: palabras agrupadas en familias con sinónimos (`café`/`marrón`/`chocolate`, `dorado`/`amarillo`/`miel`,
  `gris`/`plata`/`sal y pimienta`, `negro`, `blanco`, `naranja`, `rojizo`, `canela`, `beige`, `crema`, patrones
  `atigrado`, `manchas`, `tricolor`…) y parecido parcial entre familias vecinas (beige≈crema, café≈canela…);
  el tono distinto (claro vs. oscuro) resta 15 %.
- **Tamaño**: igual 1, contiguo 0.4. **Sexo**: igual 1.
- **Ubicación**: distancia del punto (`lat`/`lng`) al centro de la colonia registrada; vale la mitad cada 1.5 km.
  Misma `colonia` (clave) vale 1.
- Mascotas con `estatus: "extraviado"` suman +0.10 (motivo “Su familia reportó su extravío”).
- `motivos` explica el resultado: “Misma raza”, “Raza parecida”, “Mismo color”, “Color parecido”,
  “Mismo tamaño”, “Mismo sexo”, “Registrada a 600 m”, “Registrada en la misma colonia (…)”.

### Mascotas fijas para la demo

Además de las aleatorias, el generador incluye tres mascotas pensadas para el guion de CallejerOS:

| Folio | Mascota | Dónde | Pensada para |
| --- | --- | --- | --- |
| `SPGG-M-2024-00224` | Canela · perro Mestizo, café claro, mediana (`perro-1.svg`) | Tampiquito | El reporte de la vecina con la foto `perro-1` (25.6512, -100.3788): sale primera con 0.96 |
| `SPGG-M-2023-00176` | Chester · perro Mestizo, gris oscuro y negro, mediano, cojea (`perro-6.svg`) | Casco Urbano | “Perro mediano negro” en el Casco (25.6641, -100.4019) |
| `SPGG-M-2025-00301` | Nieve · gata Doméstico pelo corto, gris claro con blanco (`gato-3.svg`) | Los Pinos | “Gato blanco con manchas grises” (25.6655, -100.399) |

## Datos

```
data/
  colonias.json             catálogo (205 colonias)
  mascotas.json             400 mascotas ficticias (260 perros, 140 gatos)
  fotos.json                ilustraciones SVG embebidas (para servir /fotos/* desde la función)
  fuentes/colonias-base.json  resultado de la investigación de colonias, con fuentes por registro
public/fotos/               las mismas ilustraciones como archivos estáticos (CDN en Vercel)
```

`scripts/generar-datos.ts` usa un PRNG con semilla fija (mulberry32, `20261015`) y fecha de corte
`2026-09-30`: volver a ejecutarlo produce exactamente los mismos archivos. El servidor importa los JSON
(`import … with { type: "json" }`) para que el bundle de Vercel los incluya.

**Mascotas.** ≈65 % perros y 35 % gatos. Razas comunes en México (Mestizo y Doméstico pelo corto son las
más frecuentes), nombres de mascota y de propietario típicos (sólo nombre + inicial), teléfono `81••••####`,
vacunas (antirrábica siempre cerca del alta), ≈57 % con microchip (prefijo 484, México), 2 % extraviadas.
Los folios `SPGG-M-<año>-<consecutivo>` son consecutivos en orden de fecha de registro (2019 → 2026).
Las colonias de los focos de la demo de CallejerOS (San Pedro 400, Lucio Blanco, El Obispo, U.H. Revolución,
Casco Urbano, Vista Montaña) tienen más registros.

**Fotos.** Se copiaron las ilustraciones de la app principal (`public/placeholders/perro-1…8.svg`,
`gato-1…6.svg`) y se leyeron sus colores: cada mascota usa un dibujo coherente con su raza y color
(p. ej. `perro-6` gris → Schnauzer “Gris sal y pimienta”, Husky “Gris y blanco”; `perro-8` arena con orejas
negras → Pug “Beige con máscara negra”, Pastor Alemán “Café y negro”). El color principal de cada dibujo usa
la misma etiqueta que la app (“Café claro”, “Negro”, “Beige”, …). Como ningún dibujo representa a un
siamés, se añadió `gato-siames.svg` con el mismo estilo (crema con orejas y máscara café, ojos azules).

## Colonias

El municipio habla de “unas 186 colonias”. El catálogo final tiene **205 colonias reales** (ninguna inventada):

1. **Plan de Desarrollo Urbano Municipal San Pedro Garza García 2024 — Diagnóstico y pronóstico**
   (aplicativos.sanpedro.gob.mx/gobierno/PlanDesarrolloUrbano/PDFs 2024/diagnosticoypronostico.pdf):
   lista numerada (hasta la 196) de colonias por **distrito** (Callejones, El Obispo, Industrial, Lomas,
   San Agustín, San Ángel, San Pedro, Valle, Valle Oriente, Valle Poniente; el distrito Río no lista colonias).
   Se transcribió en `scripts/investigar-colonias.ts` sin las “Zonas” de planeación.
2. **Catálogo Nacional de Códigos Postales de Correos de México (SEPOMEX)**
   (correosdemexico.gob.mx/datosabiertos/cp/cpdescarga.txt): 300 asentamientos del municipio; aporta el
   código postal y 63 fraccionamientos recientes que el plan no lista.
3. **OpenStreetMap** (© colaboradores de OpenStreetMap, ODbL): una consulta Overpass de áreas
   `landuse=residential` / `place=*` con nombre dentro del límite municipal (90 centros) y Nominatim
   (1 petición/s) para las faltantes (3 más).
4. **Polígonos de códigos postales SEPOMEX** del repositorio
   [open-mexico/mexico-geojson](https://github.com/open-mexico/mexico-geojson) (`19-NL.geojson`).

Reglas: los sectores se agrupan en su colonia madre (“Mirasierra 1er…5º Sector” → Mirasierra,
“Revolución 1er…5º Sector” → U.H. Revolución, “Valle de San Ángel Sector Español/Francés/…” → Valle de San Ángel);
se omiten zonas de planeación, zonas industriales/comerciales y corporativos; se unifican variantes de escritura
(“Colonial La Sierra” → Colonial de la Sierra, “Del Valle Oriente” → Valle Oriente, “Lindavista” → Linda Vista…) y
se corrigen acentos y erratas evidentes (“Frida Kahalo”, “Cojunto”). Se descartan los nombres genéricos
“San Pedro” y “Condominio” de SEPOMEX. Los 19 nombres que ya usa la app principal se conservan con la misma
ortografía y el mismo centro.

Resultado: 130 colonias aparecen en el plan y en SEPOMEX, 12 sólo en el plan y 63 sólo en SEPOMEX.
Centros: 19 de la app principal, 90 de Overpass, 3 de Nominatim; las **93 restantes llevan `aprox: true`**
(87 en el centroide de su código postal y 6 sin código postal en el promedio de su distrito: Bosques de San
Pedro, Hacienda del Valle, La Cooperativa, Mirasilla, Privada Fundadores, Santa Engracia Oriente). Todas las
coordenadas caen dentro de lat 25.60–25.70, lng −100.45 a −100.30. El distrito sale del plan; para las
colonias que sólo están en SEPOMEX se toma el distrito mayoritario de su código postal (o el de la colonia
más cercana). 10 colonias del plan no tienen código postal en SEPOMEX (`codigo_postal: null`).

Notas: el catálogo de SEPOMEX se distribuye “para uso particular”; aquí sólo se usan nombres y códigos postales
como referencia en una simulación sin fines comerciales. “Mirasilla” aparece así en el plan y no se encontró en
otra fuente.

## Despliegue en Vercel (proyecto separado)

Publicado en https://callejeros-registro.vercel.app, proyecto `callejeros-registro`, con la CLI desde esta carpeta:

```bash
cd registro-municipal-api && vercel deploy --prod
```

Hono funciona en Vercel sin configuración: `src/index.ts` exporta la app por defecto y los archivos de
`public/` se sirven desde la CDN (no hace falta `vercel.json`). La variable `REGISTRO_API_KEY` ya está
cargada en Production; la app principal usa la misma en su `REGISTRO_API_KEY`. Para probar el
comportamiento de Vercel en local: `vercel dev`. Los pasos para hacerlo importando el repo están en el
[HISTORIAL](../HISTORIAL.md) de CallejerOS.

Limitaciones: avisos y extravíos viven en memoria por instancia; en Vercel se pierden cuando la instancia se
recicla y dos peticiones pueden caer en instancias distintas. En Vercel `/fotos/*` lo sirve la CDN desde
`public/fotos` (sin el encabezado `X-Simulacion`); en local lo sirve la app desde `data/fotos.json`.

### Convivencia con la app principal

Esta carpeta vive dentro del repositorio de CallejerOS, pero cada proyecto se instala y compila por separado:
la app la excluye en su `tsconfig.json`, en `eslint.config.mjs` y en `.vercelignore`.

## Estructura

```
registro-municipal-api/
  src/
    index.ts           app de Hono (entrada de Vercel): middleware, rutas y validación
    local.ts           servidor local con @hono/node-server
    datos.ts           carga de JSON y estado en memoria
    coincidencias.ts   algoritmo de puntaje
    documentacion.ts   página HTML de GET /
    openapi.ts         especificación OpenAPI 3.1
    tipos.ts           tipos compartidos
  scripts/
    investigar-colonias.ts   fuentes → data/fuentes/colonias-base.json (usa la red)
    generar-datos.ts         colonias-base → data/*.json (determinista)
  data/  public/fotos/  package.json  tsconfig.json
```
