"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { PanelRescate } from "@/components/rescate/PanelRescate";

export default function RescatePage() {
  return (
    <Pagina>
      <PageHeader title="Casos" subtitle="Ordenados por urgencia y cercanía. Se actualizan en vivo." />
      <RequireAuth roles={["rescatista", "municipio"]} motivo="para atender casos">
        {(profile) => <PanelRescate userId={profile.id} />}
      </RequireAuth>
    </Pagina>
  );
}
