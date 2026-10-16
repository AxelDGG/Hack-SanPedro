# CallejerOS

Un solo lugar para los avisos de **perros y gatos** de **San Pedro Garza García, N.L.**: mascotas que **se perdieron**, que alguien **vio o encontró** y animales **en situación de calle**. Hoy esos avisos andan sueltos en grupos de WhatsApp, Facebook e Instagram; aquí quedan en un mapa, sin duplicados, con alertas para los vecinos de cada colonia.

Vecinos reportan con foto (la IA llena los datos), rescatistas atienden los casos y el municipio ve las zonas críticas para planear campañas de esterilización. Todo con mecánica de juego: huellas (puntos), insignias y ranking por colonia.

> Proyecto para el hackathon del municipio de San Pedro · categoría *Red comunitaria para el bienestar animal*.

## Stack

- **Next.js 16** (App Router, Cache Components) + TypeScript + Tailwind v4, PWA instalable y mobile-first.
- **Supabase**: Postgres + PostGIS, Auth (contraseña y magic link), Storage (fotos) y Realtime (mapa en vivo).
- **Leaflet + OpenStreetMap** (sin API key), capa de calor con `leaflet.heat`.
- **H3** (`h3-js`) para agrupar zonas críticas en hexágonos.
- **IA de visión (Anthropic)** para llenar el reporte con la foto: especie, raza, color, tamaño, sexo, collar, señas, estado aparente y urgencia. También lee publicaciones copiadas de grupos. Modelo: **Claude Haiku 5.5** (`claude-haiku-5-5`), ~$0.0005 USD por foto. *Sin API key la app usa un análisis simulado.*
- **Alertas**: notificaciones push de la PWA (`web-push`), correo con **Resend** y avisos en vivo dentro de la app.
- **Registro Municipal de Mascotas**: API externa, hoy simulada en [`registro-municipal-api/`](registro-municipal-api) (Hono, deploy aparte).
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
| 8 | Taller: perdidos/encontrados/callejeros, asistente para personas mayores, anti-duplicados, alertas por colonia, registro municipal | ✅ |

## Recorrido de la demo

1. **Vecina** (celular, botón *Vecina* en `/login`) → en el inicio toca **"Vi o encontré uno"** → toma foto → la IA describe al perro → si se parece a uno ya reportado (o a una mascota del registro municipal), la app pregunta "¿Es alguno de estos?" → un toque en "Sí, así es" → publicar (+10 huellas) → **Compartir en mis grupos** de WhatsApp.
2. **Otra pantalla** con el mapa abierto (`/mapa`): el pin cae con la etiqueta "NUEVO". Los vecinos que siguen esa colonia reciben el aviso (push, correo y en la app).
3. **Rescatista** (`/rescate`): casos por urgencia y distancia → *Tomar caso* → *Cambiar estado* → Rescatado.
4. **Municipio** (`/municipio`): el indicador "En la calle" baja y el hexágono se actualiza en vivo; zonas prioritarias para esterilizar y métricas por mes.
5. La vecina recibe al instante el aviso "+20 huellas · ¡ya está a salvo!" y lo ve en *Mi Manada*.
6. **Mascota perdida desde un grupo**: en el inicio, "¿Te llegó por WhatsApp? Pega el mensaje" → se llenan nombre, raza, color, colonia, fecha y teléfono. Cuando alguien toca "¡Lo vi!" en la ficha, la familia recibe "¡Vieron a Rocky!"; al encontrarlo, marca "¡Ya está en casa!" y quien ayudó gana huellas.

## Pensado para personas mayores

- **Inicio con tres botones grandes**: "Se me perdió", "Vi o encontré uno" y "Hay un callejero". Sin menús que aprender; el mapa está en su propia pestaña.
- **Una pregunta por pantalla**, con botones de 56 px o más, texto grande y "Atrás / Siguiente" siempre abajo. Casi no hay que hacer scroll.
- **Casi nada que escribir**: la foto llena los datos y basta con "Sí, así es". Los campos de texto tienen micrófono para dictar. El teléfono se recuerda para la próxima vez.
- **Sin cuenta**: quien llega por un link entra como invitado (sesión anónima de Supabase).

## Centralizar los avisos de los grupos

- **Links cortos** para pegar en los grupos: `/r/perdido`, `/r/vi`, `/r/callejero` (con `?de=wa|fb|ig` se registra de dónde llegó). Abren el asistente directo, sin registrarse.
- **Pegar el mensaje** de una publicación: la IA (o reglas, en modo simulado) extrae tipo, nombre, raza, color, colonia, fecha y teléfono.
- **Compartir hacia la app** (Android): la PWA aparece en el menú "Compartir" del celular; una foto o mensaje de WhatsApp abre el asistente ya cargado (`share_target` → `/compartir`).
- **Compartir de vuelta**: cada ficha tiene "Compartir en WhatsApp" con un texto listo y una vista previa tipo cartel (imagen OG generada con la foto, "SE BUSCA", nombre y colonia).
- El municipio ve en `/municipio` cuántos avisos llegan de WhatsApp, Facebook, Instagram o la app.

## Cómo se evitan los reportes duplicados

Varias capas, de la más fuerte a la más débil:

1. **La misma foto**: cada foto lleva una huella perceptual (dHash de 48 bits, `src/lib/image/huella.ts`). Una foto reenviada en varios grupos, recortada o recomprimida da casi la misma huella; si ya existe, la app dice "¡Es la misma foto!", aunque se haya reportado en otra colonia.
2. **Parecido por rasgos** (`find_duplicate_candidates`): distancia, tiempo, color (con sinónimos: café = marrón = chocolate), raza y tamaño dan un puntaje de 0 a 1 con sus motivos ("Mismo color", "Lo están buscando"…). Una mascota perdida se busca en un radio mayor (3 km, 60 días) que un avistamiento (800 m, 21 días).
3. **"¿Es alguno de estos?" antes de publicar**: si es el mismo, se confirma como avistamiento (+5) en vez de crear otro reporte.
4. **Perdido ↔ encontrado**: un reporte de "encontrado" que se parece a una mascota perdida le avisa a su familia; quien busca a su mascota ve los encontrados parecidos con su contacto.
5. **Registro municipal**: si el animal se parece a una mascota registrada, se puede avisar a su familia por el registro.
6. **Unir después**: si aun así se cuela uno, rescatistas, el municipio o quien lo reportó lo unen con "¿Es el mismo que otro reporte?" (`fusionar_animales`); los avistamientos pasan al que queda y el link viejo redirige.

## Alertas por colonia

- Cada vecino **sigue colonias** (la suya se agrega sola al elegirla o con su primer reporte) en `/avisos`.
- Al publicar, `report_sighting` crea las notificaciones para quienes siguen esa colonia o una cercana (800 m; 2 km si es mascota perdida). La app las muestra en vivo y `/api/alertas` las manda por **push** y **correo** (Resend) una sola vez.
- La familia de una mascota perdida recibe aviso inmediato cuando alguien la ve o cuando se reporta un animal parecido.

## Registro Municipal de Mascotas (simulado)

En el taller se comentó que San Pedro tiene un equipo con el registro de mascotas y que se podría exponer por API. Mientras tanto vive en [`registro-municipal-api/`](registro-municipal-api), un proyecto aparte con su propio deploy (ver su README): 400 mascotas ficticias y el catálogo de **205 colonias** (SEPOMEX, Plan de Desarrollo Urbano y OpenStreetMap). La app lo usa para:

- **Buscar la mascota por nombre, folio o microchip** al reportarla como perdida: los datos y la foto se llenan solos, y queda marcada como extraviada en el registro.
- **Sugerir mascotas registradas parecidas** a un animal encontrado, y avisar a su familia (SMS simulado).
- **Sincronizar las colonias**: `npm run sync:colonias`.

La llave se queda en el servidor (`/api/registro`). Cuando exista la API oficial, solo cambian `REGISTRO_API_URL` y `REGISTRO_API_KEY`.

## IA de visión

`/api/analyze` recibe la foto (ya reducida a 1280 px en el navegador) y usa structured outputs con un esquema Zod (`src/lib/ai/schema.ts`). La respuesta incluye `es_animal` (solo perros y gatos), `especie`, `raza`, `color`, `tamano`, `sexo`, `collar`, `rasgos`, `condiciones`, `urgencia` (1–5), `confianza` y `resumen`. `/api/analizar-publicacion` hace lo mismo con el texto de una publicación de un grupo.

- Mientras `AI_MOCK=true`, o mientras falte la key o el modelo, responde un **análisis simulado** que la interfaz etiqueta como tal. El simulado reconoce las ilustraciones demo (`public/placeholders`) por su huella y color (`npm run huellas-demo` regenera `src/lib/ai/huellas-demo.json`); con fotos reales da una respuesta de ejemplo.
- Para activar la IA real: `ANTHROPIC_API_KEY=…` (de [platform.claude.com](https://platform.claude.com), con créditos prepagados; un plan de claude.ai no sirve para la app), `ANTHROPIC_MODEL=claude-haiku-5-5` y `AI_MOCK=false`.
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

### 3. Reportar sin cuenta, push y correo

- **Invitados**: en *Authentication → Sign In / Providers* activa **Allow anonymous sign-ins**. Sin esto, los links de los grupos piden iniciar sesión.
- **Push**: genera las llaves con `npx web-push generate-vapid-keys` y ponlas en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`.
- **Correo**: crea una API key en [Resend](https://resend.com/api-keys) (`RESEND_API_KEY`). Sin dominio verificado, Resend solo entrega al correo dueño de la cuenta; para producción verifica un dominio y cambia `RESEND_FROM`.

### 4. Registro municipal y colonias

```bash
npm run registro         # API simulada en http://localhost:4000 (otra terminal)
npm run sync:colonias    # trae las 205 colonias y reasigna cada animal a la suya
```

### 5. Datos demo

```bash
npm run seed            # crea usuarios demo, ~70 perros y gatos (callejeros, perdidos y encontrados) y ~160 avistamientos
npm run seed -- --reset # borra usuarios demo y TODOS los animales, y vuelve a sembrar
```

Usuarios demo (contraseña = `DEMO_PASSWORD` de tu `.env.local`):

| Rol | Correo |
|---|---|
| Vecino | `vecina@callejeros.demo` |
| Rescatista | `rescatista@callejeros.demo` |
| Municipio | `municipio@callejeros.demo` |

Con `NEXT_PUBLIC_DEMO_MODE=true`, la pantalla de login muestra un botón por rol. La contraseña nunca llega al navegador.

### 6. Correr

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
| `npm run registro` | API simulada del registro municipal en :4000 |
| `npm run sync:colonias` | Catálogo de colonias desde el registro municipal |
| `npm run huellas-demo` | Huellas de las ilustraciones demo para la IA simulada |
| `npm run gen:types` | Regenera `src/types/database.types.ts` |
| `npm run test:e2e` | Pruebas end-to-end con Playwright (ver abajo) |
| `npm run icons` | Regenera los íconos PWA desde `src/app/icon.svg` |

## Arquitectura

```
supabase/migrations/   Esquema, funciones (RPC), RLS, storage y realtime
registro-municipal-api/ API simulada del Registro Municipal de Mascotas (proyecto aparte)
scripts/               seed.ts, generadores de íconos e ilustraciones
public/placeholders/   Ilustraciones originales para los datos demo
src/app/               Rutas (App Router). (app)/ lleva la barra inferior
src/components/        map/, report/, animal/, rescate/, dashboard/, gamificacion/, auth/, layout/, perfil/, ui/
src/lib/ai/            Análisis de foto (servidor) y esquema compartido
src/lib/geo/zonas.ts   Agrupación H3, escala de color y colonia más cercana
e2e/                   Pruebas Playwright por fase + criterio de éxito
src/hooks/             useRealtimeAnimals, useFichaAnimal, useCasos, useStatsMensuales, useGamificacion…
src/lib/               supabase/ (clientes), registro/ (API municipal), alertas/ (push y correo), image/huella, compartir, constants, format
src/types/             Tipos generados de Supabase
```

**Permisos.** RLS está activo en todas las tablas y las escrituras sensibles solo pasan por funciones `security definer` (detalle en [Seguridad](#seguridad)).

**Huellas (puntos).** Se registran en `point_events` y un trigger mantiene `profiles.puntos`.

- **Reportar** un animal nuevo: +10.
- **Confirmar** el reporte de otro vecino: +5, una vez por animal.
- **Caso resuelto** (el animal llega a rescatado o más): cada persona que lo reportó o confirmó gana huellas según su orden de llegada. El 1º recibe +20, el 2º +15, el 3º +10 y del 4º en adelante +5. Se paga una sola vez por animal.

**Colonias.** Los centros se tomaron de OpenStreetMap (Nominatim). Cada animal se asigna a la colonia más cercana; si se consiguen polígonos oficiales, se pueden sustituir.

## Seguridad

La protección va por capas, de afuera hacia adentro:

```
Celular / navegador
   │  HTTPS obligatorio (HSTS) · CSP · sin iframes
   ▼
Vercel: red global (CDN) ── balanceo de carga automático entre regiones y mitigación DDoS (capas 3, 4 y 7)
   │  Firewall de Vercel (WAF): límites por IP, bloqueo de bots, "Attack Challenge Mode"
   ▼
Next.js (CallejerOS)
   │  sesión obligatoria en las rutas de API · límites por usuario e IP · validación de entradas
   │  llaves secretas solo en el servidor (Supabase secret, Anthropic, Resend, registro)
   ├──────────────► Registro municipal (API aparte): llave X-Api-Key, CORS cerrado, límites
   ▼
Supabase (Postgres)
      RLS en todas las tablas · escrituras solo por funciones con reglas · datos privados aparte
      límites de reportes, fotos y consultas de teléfonos · bitácora de accesos
```

**Balanceo de carga y disponibilidad.** No hay que montar un balanceador: Vercel reparte cada petición entre sus regiones y escala las funciones solas; Supabase usa un *pooler* de conexiones (Supavisor). Vercel trae mitigación DDoS automática para todos los proyectos.

**En la app**

- **Encabezados** (`next.config.ts`): Content-Security-Policy (solo scripts propios; solo se habla con Supabase; mapa de OpenStreetMap), HSTS de 2 años, `X-Frame-Options: DENY` (nadie puede meter la app en un iframe), `nosniff`, `Referrer-Policy` y `Permissions-Policy` (cámara, micrófono y ubicación solo para la app). Sin `X-Powered-By`.
- **Límites de uso** (`src/lib/seguridad/limite.ts`, contador en Postgres para que valga con varias instancias): análisis con IA 20/h por usuario y 60/h por IP; lectura de publicaciones igual; búsquedas en el registro 40/h; avisos por SMS a familias 5/h; alertas 30/h; compartir 20/h. En desarrollo el margen es ×10.
- **Rutas de API**: todas piden sesión (o invitado) y validan lo que reciben (tipo y tamaño de foto ≤ 5 MB, texto ≤ 3000 caracteres, formato de folio…).
- **Registro municipal**: la llave nunca llega al navegador (`/api/registro`). Solo quien hizo un reporte puede mandar el aviso por SMS a la familia (y solo en las 2 horas siguientes) o marcar a su mascota como extraviada o en casa.
- **Fotos**: el navegador las vuelve a dibujar antes de subirlas, así se borran los metadatos EXIF (incluido el GPS de quien la tomó). Las que llegan por "Compartir" se borran en cuanto el asistente hace su copia limpia.

**En la base (Supabase)**

- **RLS en todas las tablas.** La lectura del mapa es pública; las escrituras sensibles solo pasan por funciones con sus reglas: `report_sighting`, `take_case`, `change_animal_status`, `marcar_reunido`, `fusionar_animales` y `ver_contacto`. Nadie puede inventarse puntos ni saltarse los roles desde el cliente, y cada usuario solo edita su `nombre` y su `colonia_id`.
- **Teléfonos**: viven en `animal_contactos`, sin acceso directo. Solo se ven de uno en uno con `ver_contacto` (casos abiertos, 20 por hora por persona) y cada consulta queda en `accesos_contacto`, que revisa el municipio. Así no se pueden descargar en bloque.
- **Datos de cada vecino** (`perfiles_privados`, notificaciones, suscripciones push): solo los ve su dueño.
- **Anti-spam**: máximo 15 reportes nuevos y 40 confirmaciones por hora por persona (un trigger en `sightings`), y 40 fotos por hora en Storage. Con eso se frenan también las alertas falsas a una colonia.
- **Unir duplicados**: un vecino solo puede unir *su* reporte a otro; los ajenos los une un rescatista o el municipio.
- Funciones internas (`consumir_cuota`, `notificar_reporte`, `reasignar_colonias`…) no se pueden llamar desde el navegador.

**Pendiente de configurar en las plataformas** (no se puede desde el código):

1. **Supabase → Authentication**: activar *Leaked password protection* y, al abrir el modo invitado al público, un CAPTCHA (Cloudflare Turnstile) para las sesiones anónimas. Supabase ya limita 30 sesiones anónimas por hora por IP.
2. **Vercel → Firewall**: una regla de *rate limit* para `/api/*` (p. ej. 100 peticiones por minuto por IP), *Bot Protection* activado y, si hay un ataque, *Attack Challenge Mode*.
3. **Vercel → Settings**: *Deployment Protection* en los previews y las llaves secretas solo en *Production*.
4. **Registro municipal**: en su deploy, `REGISTRO_API_KEY` propia (sin ella responde 503) y `CORS_ORIGENES` vacío o con el dominio de la app.

`e2e/seguridad.spec.ts` comprueba que los teléfonos no se descargan en bloque, que las funciones internas no se pueden llamar, que nadie absorbe reportes ajenos, que no se puede mandar el SMS del registro con un reporte ajeno, los encabezados y que las rutas con IA piden sesión.

## Pruebas

`npm run test:e2e` corre 34 pruebas con Playwright en un Chromium móvil sin ventana, con GPS simulado. Levanta `npm run dev` si no está corriendo.

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
- **Colonias aproximadas:** se usan centros, no polígonos oficiales. De las 205 colonias, 93 solo tienen el centro de su código postal (`centro_aproximado`); al asignar la colonia más cercana cuentan como 400 m más lejos.
- **Registro simulado en memoria:** los avisos al propietario y los extravíos de la API simulada se pierden al reiniciarla.
- **Huella de foto:** es de 48 bits; detecta la misma foto reenviada, no la misma mascota en otra foto (eso lo cubre el parecido por rasgos o la IA).
- **Modo demo público:** con `NEXT_PUBLIC_DEMO_MODE=true` cualquiera puede entrar como cualquier rol. Desactívalo fuera de la demo.
- **Seguridad:** Supabase recomienda activar *Leaked password protection* en *Authentication → Password security*.

## Deploy en Vercel

1. Importa el repo en Vercel.
2. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MOCK`, `NEXT_PUBLIC_DEMO_MODE`, `DEMO_PASSWORD`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `RESEND_FROM`, `REGISTRO_API_URL` y `REGISTRO_API_KEY`. `SUPABASE_SECRET_KEY` también hace falta para mandar alertas (`/api/alertas`, solo servidor); nunca como `NEXT_PUBLIC_`.
3. Agrega la URL de Vercel a las *Redirect URLs* de Supabase.
4. El registro municipal simulado se despliega como **otro proyecto** de Vercel con *Root Directory* `registro-municipal-api` (ver su README) y su URL va en `REGISTRO_API_URL`.

## Créditos

Datos del mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright). Identidad visual e ilustraciones originales de CallejerOS.
