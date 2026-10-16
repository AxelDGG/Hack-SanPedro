/** Servidor local: `npm run dev` → http://localhost:4000 (en Vercel se usa src/index.ts). */
import { serve } from "@hono/node-server";
import app from "./index.js";

const puerto = Number(process.env.PORT) || 4000;

serve({ fetch: app.fetch, port: puerto }, (info) => {
  console.log(`Registro municipal de mascotas (SIMULACIÓN) en http://localhost:${info.port}`);
  if (!process.env.REGISTRO_API_KEY) console.log('REGISTRO_API_KEY sin definir: se usa la clave de demostración "demo-callejeros-2026".');
});
