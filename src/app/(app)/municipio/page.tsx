"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardMunicipio } from "@/components/dashboard/DashboardMunicipio";

export default function MunicipioPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title="Zonas críticas" subtitle="San Pedro Garza García · datos en vivo de la comunidad" />
      <RequireAuth roles={["municipio"]} motivo="para ver el panel del municipio">
        {() => <DashboardMunicipio />}
      </RequireAuth>
    </div>
  );
}
