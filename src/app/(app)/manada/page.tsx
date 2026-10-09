"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { MiManada } from "@/components/gamificacion/MiManada";

export default function ManadaPage() {
  return (
    <Pagina>
      <PageHeader title="Mi Manada" subtitle="Los animales que ayudaste a encontrar." />
      <RequireAuth motivo="para ver tu manada">{(profile) => <MiManada userId={profile.id} />}</RequireAuth>
    </Pagina>
  );
}
