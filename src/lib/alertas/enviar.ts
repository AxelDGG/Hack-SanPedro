import "server-only";
import webpush from "web-push";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIPOS } from "@/lib/constants";

const pushListo = () =>
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.SUPABASE_SECRET_KEY;
// Correo: Gmail (cuenta dedicada con contraseña de aplicación) o, si no está, Resend.
const gmailListo = () => !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
const correoListo = () => (gmailListo() || !!process.env.RESEND_API_KEY) && !!process.env.SUPABASE_SECRET_KEY;

interface Correo {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Manda los correos y devuelve cuántos salieron. */
async function mandarCorreos(correos: Correo[]): Promise<number> {
  if (gmailListo()) {
    const gmail = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "") },
    });
    let enviados = 0;
    // Uno por uno: Gmail limita el ritmo y son pocos por reporte.
    for (const c of correos) {
      try {
        await gmail.sendMail({ from: `"CallejerOS" <${process.env.GMAIL_USER}>`, ...c });
        enviados++;
      } catch (e) {
        console.error("[alertas] gmail", (e as Error).message);
      }
    }
    return enviados;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.batch.send(
    correos.slice(0, 100).map((c) => ({ from: process.env.RESEND_FROM ?? "CallejerOS <onboarding@resend.dev>", ...c })),
  );
  if (error) {
    console.error("[alertas] resend", error.message);
    return 0;
  }
  return correos.length;
}

let vapidConfigurado = false;

function sitio() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Entrega por push y correo las notificaciones pendientes de un animal. Las notificaciones
 * ya existen (las crea `report_sighting` en la base); aquí solo se mandan una vez y se marcan.
 */
export async function enviarAlertasDe(animalId: string) {
  if (!process.env.SUPABASE_SECRET_KEY) return { push: 0, correos: 0, motivo: "Falta SUPABASE_SECRET_KEY" };
  const db = createAdminClient();

  const { data: pendientes } = await db
    .from("notificaciones")
    .select("id, user_id, titulo, cuerpo, url, push_enviado_at, email_enviado_at")
    .eq("animal_id", animalId)
    .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .or("push_enviado_at.is.null,email_enviado_at.is.null");
  if (!pendientes?.length) return { push: 0, correos: 0 };

  const usuarios = [...new Set(pendientes.map((n) => n.user_id))];
  const [{ data: prefs }, { data: subs }, { data: animal }] = await Promise.all([
    db.from("perfiles_privados").select("user_id, alertas_push, alertas_email, email_alertas").in("user_id", usuarios),
    db.from("push_suscripciones").select("id, user_id, endpoint, p256dh, auth").in("user_id", usuarios),
    db.from("animals").select("tipo, foto_portada_url").eq("id", animalId).maybeSingle(),
  ]);
  const prefDe = new Map((prefs ?? []).map((p) => [p.user_id, p]));
  const ahora = new Date().toISOString();
  let push = 0;
  let correos = 0;

  // ───────── Push ─────────
  if (pushListo()) {
    if (!vapidConfigurado) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? "mailto:alertas@callejeros.mx",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
      vapidConfigurado = true;
    }
    const caducadas: string[] = [];
    await Promise.all(
      pendientes
        .filter((n) => !n.push_enviado_at && prefDe.get(n.user_id)?.alertas_push !== false)
        .flatMap((n) =>
          (subs ?? [])
            .filter((s) => s.user_id === n.user_id)
            .map(async (s) => {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  JSON.stringify({ title: n.titulo, body: n.cuerpo, url: n.url }),
                  { TTL: 60 * 60 * 6, urgency: "high" },
                );
                push++;
              } catch (e) {
                const status = (e as { statusCode?: number }).statusCode;
                // 404/410: el navegador ya no tiene esa suscripción.
                if (status === 404 || status === 410) caducadas.push(s.id);
                else console.error("[alertas] push", status, (e as Error).message);
              }
            }),
        ),
    );
    if (caducadas.length) await db.from("push_suscripciones").delete().in("id", caducadas);
    await db
      .from("notificaciones")
      .update({ push_enviado_at: ahora })
      .in(
        "id",
        pendientes.filter((n) => !n.push_enviado_at).map((n) => n.id),
      );
  }

  // ───────── Correo ─────────
  if (correoListo()) {
    const conCorreo = pendientes.filter((n) => {
      const p = prefDe.get(n.user_id);
      return !n.email_enviado_at && p?.alertas_email && p.email_alertas;
    });
    if (conCorreo.length) {
      const foto = animal?.foto_portada_url
        ? animal.foto_portada_url.startsWith("http")
          ? animal.foto_portada_url
          : `${sitio()}${animal.foto_portada_url}`
        : null;
      const color = animal ? TIPOS[animal.tipo].color : "#e2583e";
      correos = await mandarCorreos(
        conCorreo.slice(0, 100).map((n) => ({
          to: prefDe.get(n.user_id)!.email_alertas!,
          subject: n.titulo,
          html: plantillaCorreo({ titulo: n.titulo, cuerpo: n.cuerpo, url: `${sitio()}${n.url}`, foto, color }),
          text: `${n.titulo}\n\n${n.cuerpo}\n\nVer el reporte: ${sitio()}${n.url}`,
        })),
      );
    }
    await db
      .from("notificaciones")
      .update({ email_enviado_at: ahora })
      .in(
        "id",
        pendientes.filter((n) => !n.email_enviado_at).map((n) => n.id),
      );
  }

  return { push, correos };
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function plantillaCorreo(o: { titulo: string; cuerpo: string; url: string; foto: string | null; color: string }) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#fff8ee;font-family:Arial,Helvetica,sans-serif;color:#2b2118">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden">
      ${o.foto ? `<tr><td><img src="${escapar(o.foto)}" alt="" width="480" style="display:block;width:100%;height:auto"></td></tr>` : ""}
      <tr><td style="padding:24px">
        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:${o.color}">Alerta de tu colonia · CallejerOS</p>
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2">${escapar(o.titulo)}</h1>
        <p style="margin:0 0 24px;font-size:18px;line-height:1.5;color:#6b5b4d">${escapar(o.cuerpo)}</p>
        <a href="${escapar(o.url)}" style="display:inline-block;background:#e2583e;color:#ffffff;text-decoration:none;font-size:20px;font-weight:bold;padding:16px 28px;border-radius:16px">Ver el reporte</a>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#6b5b4d;margin:16px 0 0">Recibes este correo porque activaste las alertas de tu colonia en CallejerOS. Puedes desactivarlas en Avisos.</p>
  </td></tr></table>
</body></html>`;
}
