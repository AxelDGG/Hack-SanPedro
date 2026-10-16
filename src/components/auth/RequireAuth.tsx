"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession, type Profile } from "@/components/providers/SessionProvider";
import { ButtonLink } from "@/components/ui/Button";
import { HuellasCaminando } from "@/components/ui/HuellasCaminando";
import { ROLES, type Rol } from "@/lib/constants";

interface Props {
  /** Si se indica, solo esos roles ven el contenido. */
  roles?: Rol[];
  /** Texto para invitar a iniciar sesión. */
  motivo?: string;
  /**
   * Sin sesión, entra como invitado (sesión anónima de Supabase) en vez de pedir cuenta:
   * quien llega desde un link de WhatsApp reporta sin registrarse.
   */
  invitado?: boolean;
  children: (profile: Profile) => React.ReactNode;
}

/**
 * Muestra el contenido solo con sesión (y rol, si aplica).
 * Es solo UX: los permisos reales los imponen RLS y las RPCs.
 */
export function RequireAuth({ roles, motivo = "para continuar", invitado = false, children }: Props) {
  const { user, profile, loading } = useSession();
  const [errorInvitado, setErrorInvitado] = useState(false);
  const intentado = useRef(false);
  const entrandoComoInvitado = invitado && !loading && !user && !errorInvitado;

  useEffect(() => {
    if (!entrandoComoInvitado || intentado.current) return;
    intentado.current = true;
    // SessionProvider recibe la sesión nueva por onAuthStateChange y crea el perfil.
    void createClient()
      .auth.signInAnonymously()
      .then(({ error }) => {
        if (error) {
          console.error("[invitado]", error.message);
          setErrorInvitado(true);
        }
      });
  }, [entrandoComoInvitado]);

  if (loading || entrandoComoInvitado || (user && !profile)) {
    return (
      <div className="flex justify-center py-16 text-terracota/70">
        <HuellasCaminando />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <EstadoVacio icon={<LogIn className="size-8" />} titulo={`Inicia sesión ${motivo}`}>
        <ButtonLink href="/login">Entrar</ButtonLink>
      </EstadoVacio>
    );
  }

  if (roles && !roles.includes(profile.rol)) {
    return (
      <EstadoVacio
        icon={<ShieldAlert className="size-8" />}
        titulo="Esta sección no es para tu rol"
        texto={`Disponible para: ${roles.map((r) => ROLES[r].label).join(", ")}.`}
      />
    );
  }

  return <>{children(profile)}</>;
}

function EstadoVacio({
  icon,
  titulo,
  texto,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-4 mt-8 flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
      <span className="text-terracota">{icon}</span>
      <p className="font-display text-lg font-medium">{titulo}</p>
      {texto && <p className="text-sm text-tinta-suave">{texto}</p>}
      {children}
    </div>
  );
}
