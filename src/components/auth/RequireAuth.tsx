"use client";

import { LoaderCircle, LogIn, ShieldAlert } from "lucide-react";
import { useSession, type Profile } from "@/components/providers/SessionProvider";
import { ButtonLink } from "@/components/ui/Button";
import { ROLES, type Rol } from "@/lib/constants";

interface Props {
  /** Si se indica, solo esos roles ven el contenido. */
  roles?: Rol[];
  /** Texto para invitar a iniciar sesión. */
  motivo?: string;
  children: (profile: Profile) => React.ReactNode;
}

/**
 * Muestra el contenido solo con sesión (y rol, si aplica).
 * Es solo UX: los permisos reales los imponen RLS y las RPCs.
 */
export function RequireAuth({ roles, motivo = "para continuar", children }: Props) {
  const { user, profile, loading } = useSession();

  if (loading || (user && !profile)) {
    return (
      <div className="flex justify-center py-16 text-tinta-suave">
        <LoaderCircle className="size-8 animate-spin" aria-label="Cargando" />
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
