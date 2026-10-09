"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Modo = "entrar" | "registro" | "enlace";

const TABS: { modo: Modo; label: string }[] = [
  { modo: "entrar", label: "Entrar" },
  { modo: "registro", label: "Crear cuenta" },
  { modo: "enlace", label: "Enlace por correo" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>("entrar");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "enlace" ? "El enlace expiró o ya se usó. Pide uno nuevo." : null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nombre = String(form.get("nombre") ?? "").trim();
    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    setEnviando(true);
    setError(null);
    setAviso(null);
    const supabase = createClient();

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      } else if (modo === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre }, emailRedirectTo },
        });
        if (error) throw error;
        if (data.session) router.replace("/");
        else setAviso("Revisa tu correo para confirmar tu cuenta.");
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });
        if (error) throw error;
        setAviso("Te enviamos un enlace para entrar. Ábrelo desde este mismo dispositivo.");
      }
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-arena-oscura">
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-arena p-1 text-sm" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.modo}
            type="button"
            role="tab"
            aria-selected={modo === t.modo}
            onClick={() => {
              setModo(t.modo);
              setError(null);
              setAviso(null);
            }}
            className={`rounded-xl px-2 py-2 font-semibold transition ${
              modo === t.modo ? "bg-white text-tinta shadow-sm" : "text-tinta-suave"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {modo === "registro" && (
          <Campo label="Nombre" name="nombre" autoComplete="given-name" maxLength={60} required />
        )}
        <Campo label="Correo" name="email" type="email" autoComplete="email" required />
        {modo !== "enlace" && (
          <Campo
            label="Contraseña"
            name="password"
            type="password"
            autoComplete={modo === "registro" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        )}

        {error && <p className="rounded-xl bg-terracota/10 px-3 py-2 text-sm text-terracota-oscuro">{error}</p>}
        {aviso && <p className="rounded-xl bg-salvia/10 px-3 py-2 text-sm text-salvia">{aviso}</p>}

        <Button type="submit" disabled={enviando}>
          {enviando ? "Un momento…" : modo === "enlace" ? "Enviarme el enlace" : TABS.find((t) => t.modo === modo)!.label}
        </Button>
      </form>
    </section>
  );
}

function Campo({ label, ...props }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        className="rounded-xl border border-arena-oscura bg-crema px-3 py-3 text-base font-normal outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/20"
        {...props}
      />
    </label>
  );
}

function traducirError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg)) return "Confirma tu correo antes de entrar.";
  if (/already registered/i.test(msg)) return "Ese correo ya tiene cuenta. Intenta entrar.";
  if (/rate limit/i.test(msg)) return "Se alcanzó el límite de correos por hora. Entra con contraseña.";
  if (/password/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  return "Algo salió mal. Intenta de nuevo.";
}
