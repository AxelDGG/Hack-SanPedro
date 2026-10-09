"use client";

import { useRouter } from "next/navigation";
import { LogOut, PawPrint } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { Button } from "@/components/ui/Button";
import { ROLES } from "@/lib/constants";

export function PerfilView() {
  const router = useRouter();
  const { signOut } = useSession();

  return (
    <Pagina>
      <PageHeader title="Perfil" />
      <RequireAuth motivo="para ver tu perfil">
        {(profile) => (
          <div className="flex flex-col gap-4 px-4">
            <section className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-arena-oscura">
              <div className="flex size-16 items-center justify-center rounded-full bg-terracota/15 font-display text-2xl font-semibold text-terracota">
                {profile.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-semibold">{profile.nombre}</p>
                <span className="mt-1 inline-block rounded-full bg-arena px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-tinta-suave">
                  {ROLES[profile.rol].label}
                </span>
              </div>
            </section>

            <section className="flex items-center justify-between rounded-3xl bg-terracota p-5 text-white">
              <div>
                <p className="text-sm font-semibold opacity-90">Tus huellas</p>
                <p className="font-display text-4xl font-semibold">{profile.puntos}</p>
              </div>
              <PawPrint className="size-12 opacity-80" />
            </section>

            <Button
              variant="danger"
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
            >
              <LogOut className="size-5" /> Cerrar sesión
            </Button>
          </div>
        )}
      </RequireAuth>
    </Pagina>
  );
}
