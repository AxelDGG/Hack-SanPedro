"use client";

import { useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { FormularioReporte } from "./FormularioReporte";

export function ReportarView() {
  // Cambiar la key reinicia el formulario para "Reportar otro".
  const [intento, setIntento] = useState(0);

  return (
    <Pagina>
      <PageHeader title="Reportar avistamiento" subtitle="Foto + ubicación. La IA te ayuda con el resto." />
      <RequireAuth motivo="para reportar un animal">
        {(profile) => <FormularioReporte key={intento} userId={profile.id} onOtro={() => setIntento((n) => n + 1)} />}
      </RequireAuth>
    </Pagina>
  );
}
