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
| 2 | Reportar con foto + GPS + IA | ⏳ |
| 3 | Detección de duplicados ("¿Es este?") | ⏳ |
| 4 | Ficha del animal | ⏳ |
| 5 | Panel de rescatista | ⏳ |
| 6 | Dashboard del municipio (H3) | ⏳ |
| 7 | Gamificación (insignias, Mi Manada, ranking) | ⏳ |

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
| `npm run icons` | Regenera los íconos PWA desde `src/app/icon.svg` |

## Arquitectura

```
supabase/migrations/   Esquema, funciones (RPC), RLS, storage y realtime
scripts/               seed.ts, generadores de íconos e ilustraciones
public/placeholders/   Ilustraciones originales para los datos demo
src/app/               Rutas (App Router). (app)/ lleva la barra inferior
src/components/        map/, animal/, auth/, layout/, perfil/, ui/
src/hooks/             useRealtimeAnimals, useGeolocation, useColonias
src/lib/               supabase/ (clientes), constants, format
src/types/             Tipos generados de Supabase
```

**Seguridad.** RLS está activo en todas las tablas. La lectura del mapa es pública, pero las escrituras sensibles solo pasan por funciones `security definer`: `report_sighting`, `take_case` y `change_animal_status`. Así nadie puede inventarse puntos ni saltarse las reglas de rol desde el cliente. Además, cada usuario solo puede editar su `nombre` y su `colonia_id`.

**Huellas (puntos).** Se registran en `point_events` y un trigger mantiene `profiles.puntos`.

- **Reportar** un animal nuevo: +10.
- **Confirmar** el reporte de otro vecino: +5, una vez por animal.
- **Caso resuelto** (el animal llega a rescatado o más): cada persona que lo reportó o confirmó gana huellas según su orden de llegada. El 1º recibe +20, el 2º +15, el 3º +10 y del 4º en adelante +5. Se paga una sola vez por animal.

**Colonias.** Los centros se tomaron de OpenStreetMap (Nominatim). Cada animal se asigna a la colonia más cercana; si se consiguen polígonos oficiales, se pueden sustituir.

## Deploy en Vercel

1. Importa el repo en Vercel.
2. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MOCK`, `NEXT_PUBLIC_DEMO_MODE` y `DEMO_PASSWORD`. **No** subas `SUPABASE_SECRET_KEY`: solo la usa el seed local.
3. Agrega la URL de Vercel a las *Redirect URLs* de Supabase.

## Créditos

Datos del mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright). Identidad visual e ilustraciones originales de CallejerOS.
