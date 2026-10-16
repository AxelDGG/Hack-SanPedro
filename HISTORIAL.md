# Historial de CallejerOS

Información que ya no describe el estado actual, pero puede servir: cómo se construyó, qué se probó y por qué cambió. Lo vigente está en el [README](README.md).

## Fases de construcción

| Fase | Fecha | Contenido |
|---|---|---|
| 0 | 2026-10-08 | Base: proyecto, esquema SQL, RLS, auth, layout, PWA |
| 1 | 2026-10-09 | Mapa en vivo, marcadores por estado, ubicación, calor, datos demo |
| 2 | 2026-10-09 | Reportar con foto + GPS + IA |
| 3 | 2026-10-09 | Detección de duplicados ("¿Es este?") y "Lo vi también" |
| 4 | 2026-10-09 | Ficha del animal con historia en vivo |
| 5 | 2026-10-09 | Panel de rescatista |
| 6 | 2026-10-09 | Dashboard del municipio (zonas H3) |
| 7 | 2026-10-09 | Gamificación: huellas, insignias, Mi Manada, ranking, avisos en vivo |
| 8 | 2026-10-15 | Cambios del taller: perdidos, encontrados y callejeros; asistente para personas mayores; anti-duplicados; alertas por colonia; registro municipal; seguridad |

Hasta la fase 7 la app era solo un mapa de **animales en situación de calle**. En el taller del 15 de octubre se reenfocó en centralizar los avisos de **perros y gatos** perdidos, encontrados y callejeros que circulan en grupos de WhatsApp y Facebook.

## Colonias: primer catálogo

- La primera versión traía **21 colonias** con centros estimados a mano (migración `20261009000100_init.sql`).
- Luego se corrigieron con OpenStreetMap (Nominatim) y quedaron **19**, porque dos caían fuera del municipio o en el cauce del río (`20261009000700_colonias_osm.sql`).
- Desde el 15 de octubre el catálogo viene del registro municipal simulado: **205 colonias** de SEPOMEX, el Plan de Desarrollo Urbano 2024 y OpenStreetMap (`npm run sync:colonias`). Los 19 nombres originales se conservaron con su ortografía y su centro.

## Correo con Resend

La primera opción para las alertas por correo fue [Resend](https://resend.com). El código todavía lo soporta como respaldo: se usa solo si no hay Gmail configurado.

- Variables: `RESEND_API_KEY` y `RESEND_FROM` (por defecto `CallejerOS <onboarding@resend.dev>`).
- Sin dominio verificado, Resend solo entrega al correo dueño de la cuenta. Para mandar a vecinos hay que comprar un dominio (~$10–15 USD al año) y verificarlo con SPF y DKIM.
- El 15 de octubre de 2026 Resend suspendió la cuenta y pidió llenar un formulario de revisión (*Account review*): sitio, uso, tipo de correos (transaccionales y notificaciones) y cómo se obtiene el consentimiento (los vecinos activan las alertas en `/avisos`).
- Por eso se cambió a **Gmail con contraseña de aplicación** (nodemailer): gratis, sin dominio y a cualquier destinatario, ~500 correos al día.

## IA antes de tener llave

- Del 8 al 15 de octubre la app corrió con **análisis simulado** (`AI_MOCK=true`), porque el modelo no estaba decidido.
- El 15 de octubre se eligió **Claude Haiku 5.5**. El plan Max de claude.ai no sirve para la app: hace falta una API key de platform.claude.com.
- La primera llave que se creó (`sk-ant-usr-…`) no servía porque no estaba asignada a un workspace. La correcta se crea dentro del workspace *Default* y empieza con `sk-ant-api03-`.
- La cuenta trae **$100 USD en créditos promocionales que vencen el 20 de octubre de 2026**. Después hay que comprar créditos (mínimo $5 USD) o volver al modo simulado.
- El modo simulado al principio elegía una respuesta al azar (decía "gato" para un perro). Desde el 15 de octubre reconoce las ilustraciones demo por su huella perceptual y su color promedio.

## Deploy: pasos genéricos

La app y el registro se publicaron el 16 de octubre con la CLI de Vercel desde la carpeta local, sin integración con GitHub. Si se conecta el repo, estos son los pasos estándar:

- **App:** en Vercel, *Add New → Project*, importar el repo y dejar la raíz. El `.vercelignore` excluye el registro y las pruebas.
- **Registro municipal:** otro proyecto con *Root Directory* `registro-municipal-api`. Vercel detecta Hono sin `vercel.json`. Hay que agregar `REGISTRO_API_KEY` y comprobar `/salud`.
- Con la CLI: `cd registro-municipal-api && vercel link && vercel env add REGISTRO_API_KEY && vercel --prod`.

`callejeros.vercel.app` ya estaba ocupado, por eso la app quedó en `callejeros-six.vercel.app`.

## Decisiones que cambiaron

- **Límites por IP:** empezaron en 60 análisis con IA por hora por IP. El 16 de octubre se subieron a 300 porque en un evento decenas de personas comparten el mismo Wi-Fi y saldrían con la misma IP. El límite por usuario se mantuvo en 20 por hora.
- **Firewall de Vercel:** se intentó una excepción (*bypass*) para que los lectores de vista previa de WhatsApp y Facebook no recibieran el reto anti-bots. Esa acción es solo del plan Pro, así que quedó *Bot Protection* en "Challenge" sin excepción. Si la vista previa de WhatsApp deja de verse, se puede pasar a "log": `vercel firewall rules edit bot-protection --action log`.
- **Mensajes de WhatsApp:** llevaban emojis (🐾, 🔎). La redirección de `wa.me` los rompía en WhatsApp Web y escritorio y se veían como "�". Se quitaron y los botones abren `api.whatsapp.com/send` directo.
- **Umbral de "misma foto":** al principio eran ≤ 8 bits distintos de 48. Bajó a ≤ 5 porque fotos distintas con la misma composición se confundían (`20261015000400_umbral_misma_foto.sql`).
- **Unir duplicados:** al principio, quien había reportado el reporte de destino podía absorber el de cualquier otra persona. Desde el 15 de octubre un vecino solo une *su* reporte a otro; los ajenos los une un rescatista o el municipio.
- **`tsconfig` y el registro:** el `tsconfig.json` raíz incluía `**/*.ts` y revisaba también el registro, lo que rompía el build sin `registro-municipal-api/node_modules`. Se resolvió excluyendo la carpeta en `tsconfig.json`, en `eslint.config.mjs` y en `.vercelignore`.
