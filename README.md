# CallejerOS

Mapa colaborativo de animales en situación de calle en **San Pedro Garza García, N.L.**
Vecinos reportan avistamientos con foto y ubicación, rescatistas actualizan el estado de cada caso y el municipio ve las zonas críticas para planear campañas de esterilización. Todo con mecánica de juego: huellas (puntos), insignias y ranking por colonia.

> Proyecto para el hackathon del municipio de San Pedro · categoría *Red comunitaria para el bienestar animal*.

## Stack

- **Next.js 16** (App Router, Cache Components) + TypeScript + Tailwind v4, PWA instalable y mobile-first.
- **Supabase**: Postgres + PostGIS, Auth (contraseña y magic link), Storage (fotos) y Realtime (mapa en vivo).
- **Leaflet + OpenStreetMap** (sin API key), capa de calor con `leaflet.heat`.
- **H3** (`h3-js`) para agrupar zonas críticas en hexágonos.
- **IA de visión (Anthropic)** para clasificar la foto: especie, rasgos, estado aparente y urgencia. *El modelo está pendiente de decidir; mientras tanto la app usa un análisis simulado (`AI_MOCK=true`).*
- Deploy en **Vercel**.

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Base: proyecto, esquema SQL, RLS, auth, layout, PWA | ✅ |
| 1 | Mapa en vivo, marcadores por estado, ubicación, calor, datos demo | ✅ |
| 2 | Reportar con foto + GPS + IA | ✅ |
| 3 | Detección de duplicados ("¿Es este?") y "Lo vi también" | ✅ |
| 4 | Ficha del animal con historia en vivo | ✅ |
| 5 | Panel de rescatista | ✅ |
| 6 | Dashboard del municipio (H3) | ✅ |
| 7 | Gamificación (huellas, insignias, Mi Manada, ranking, avisos en vivo) | ✅ |

## Recorrido de la demo

1. **Vecina** (celular, botón *Vecina* en `/login`) → botón de cámara → toma foto → la IA llena especie, condición y urgencia → si hay un animal parecido cerca, la app pregunta "¿Es alguno de estos?" → publicar (+10 huellas).
2. **Otra pantalla** con el mapa abierto: el pin cae con la etiqueta "NUEVO" y aparece el aviso "Nuevo reporte…".
3. **Rescatista** (`/rescate`): casos por urgencia y distancia → *Tomar caso* → *Cambiar estado* → Rescatado.
4. **Municipio** (`/municipio`): el indicador "En la calle" baja y el hexágono se actualiza en vivo; zonas prioritarias para esterilizar y métricas por mes.
5. La vecina recibe al instante el aviso "+20 huellas · ¡ya está a salvo!" y lo ve en *Mi Manada*.

## IA de visión

`/api/analyze` recibe la foto (ya reducida a 1280 px en el navegador) y usa structured outputs con un esquema Zod (`src/lib/ai/schema.ts`). La respuesta incluye `es_animal`, `especie`, `rasgos`, `condiciones`, `urgencia` (1–5), `confianza` y `resumen`.

- Mientras `AI_MOCK=true`, o mientras falte la key o el modelo, responde un **análisis simulado** que la interfaz etiqueta como tal.
- Para activar la IA real: `ANTHROPIC_API_KEY=…`, `ANTHROPIC_MODEL=<modelo elegido>` y `AI_MOCK=false`.
- Si la IA falla o tarda, el formulario se puede llenar a mano.

## Setup local

Requisitos: Node 20+ y un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local   # y llena los valores
```

### 1. Base de datos

Las migraciones están en [`supabase/migrations`](supabase/migrations) y se aplican **en orden**. Dos opciones:

- **Supabase CLI** (recomendado):
  ```bash
  npx supabase login
  npx supabase link --project-ref <project-ref>
  npx supabase db push
  ```
- **SQL Editor** del dashboard: pega y ejecuta cada archivo en orden.

Después genera los tipos de TypeScript si cambiaste el esquema:

```bash
npm run gen:types   # requiere `npx supabase login`
```

### 2. Auth en Supabase

En *Authentication → URL Configuration*:

- **Site URL**: `http://localhost:3000` (en producción, la URL de Vercel).
- **Redirect URLs**: agrega `http://localhost:3000/**` y `https://<tu-app>.vercel.app/**`.

El correo incluido en Supabase solo envía unos pocos emails por hora. Para la demo usa contraseña o los botones de **modo demo**. Si quieres registros sin confirmar correo, desactiva *Confirm email* en *Authentication → Providers → Email*.

### 3. Datos demo

```bash
npm run seed            # crea usuarios demo, ~60 animales y ~150 avistamientos
npm run seed -- --reset # borra usuarios demo y TODOS los animales, y vuelve a sembrar
```

Usuarios demo (contraseña = `DEMO_PASSWORD` de tu `.env.local`):

| Rol | Correo |
|---|---|
| Vecino | `vecina@callejeros.demo` |
| Rescatista | `rescatista@callejeros.demo` |
| Municipio | `municipio@callejeros.demo` |

Con `NEXT_PUBLIC_DEMO_MODE=true`, la pantalla de login muestra un botón por rol. La contraseña nunca llega al navegador.

### 4. Correr

```bash
npm run dev          # http://localhost:3000
npm run dev:https    # HTTPS local: necesario para GPS y cámara desde el celular en tu red
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `dev:https` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Tipos de rutas + `tsc --noEmit` |
| `npm run seed` | Datos demo (ver arriba) |
| `npm run gen:types` | Regenera `src/types/database.types.ts` |
| `npm run test:e2e` | Pruebas end-to-end con Playwright (ver abajo) |
| `npm run icons` | Regenera los íconos PWA desde `src/app/icon.svg` |

## Arquitectura

```
supabase/migrations/   Esquema, funciones (RPC), RLS, storage y realtime
scripts/               seed.ts, generadores de íconos e ilustraciones
public/placeholders/   Ilustraciones originales para los datos demo
src/app/               Rutas (App Router). (app)/ lleva la barra inferior
src/components/        map/, report/, animal/, rescate/, dashboard/, gamificacion/, auth/, layout/, perfil/, ui/
src/lib/ai/            Análisis de foto (servidor) y esquema compartido
src/lib/geo/zonas.ts   Agrupación H3, escala de color y colonia más cercana
e2e/                   Pruebas Playwright por fase + criterio de éxito
src/hooks/             useRealtimeAnimals, useFichaAnimal, useCasos, useStatsMensuales, useGamificacion…
src/lib/               supabase/ (clientes), constants, format
src/types/             Tipos generados de Supabase
```

**Seguridad.** RLS está activo en todas las tablas. La lectura del mapa es pública, pero las escrituras sensibles solo pasan por funciones `security definer`: `report_sighting`, `take_case` y `change_animal_status`. Así nadie puede inventarse puntos ni saltarse las reglas de rol desde el cliente. Además, cada usuario solo puede editar su `nombre` y su `colonia_id`.

**Huellas (puntos).** Se registran en `point_events` y un trigger mantiene `profiles.puntos`.

- **Reportar** un animal nuevo: +10.
- **Confirmar** el reporte de otro vecino: +5, una vez por animal.
- **Caso resuelto** (el animal llega a rescatado o más): cada persona que lo reportó o confirmó gana huellas según su orden de llegada. El 1º recibe +20, el 2º +15, el 3º +10 y del 4º en adelante +5. Se paga una sola vez por animal.

**Colonias.** Los centros se tomaron de OpenStreetMap (Nominatim). Cada animal se asigna a la colonia más cercana; si se consiguen polígonos oficiales, se pueden sustituir.

## Pruebas

`npm run test:e2e` corre 20 pruebas con Playwright en un Chromium móvil sin ventana, con GPS simulado. Levanta `npm run dev` si no está corriendo.

- Cubren todas las fases y el **criterio de éxito completo** (`e2e/criterio-exito.spec.ts`) con cuatro dispositivos simultáneos: vecina, mapa, rescatista y municipio.
- Usan la base configurada en `.env.local` y **borran lo que crean**: animales, huellas y fotos.
- La primera vez instala el navegador:

```bash
npx playwright install chromium
```

## Accesibilidad y color

Los colores de estado (rojo, ámbar, azul, violeta y verde) y la escala de los hexágonos se validaron contra daltonismo y contraste.

- Los pines de casos resueltos van rellenos, así que el estado no depende solo del color.
- Las gráficas tienen tooltip por mes, navegación con teclado y vista de tabla.

## Limitaciones conocidas

- **Fotos huérfanas:** la foto se sube en cuanto se elige, para ganar tiempo. Si el usuario abandona el reporte, la foto queda en Storage sin usarse.
- **Colonias aproximadas:** se usan los centros de OpenStreetMap, no polígonos oficiales.
- **Modo demo público:** con `NEXT_PUBLIC_DEMO_MODE=true` cualquiera puede entrar como cualquier rol. Desactívalo fuera de la demo.
- **Seguridad:** Supabase recomienda activar *Leaked password protection* en *Authentication → Password security*.

## Deploy en Vercel

1. Importa el repo en Vercel.
2. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MOCK`, `NEXT_PUBLIC_DEMO_MODE` y `DEMO_PASSWORD`. **No** subas `SUPABASE_SECRET_KEY`: solo la usa el seed local.
3. Agrega la URL de Vercel a las *Redirect URLs* de Supabase.

## Créditos

Datos del mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright). Identidad visual e ilustraciones originales de CallejerOS.
