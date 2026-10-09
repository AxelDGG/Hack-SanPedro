"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { FormularioReporte } from "./FormularioReporte";

export function ReportarView() {
  return (
    <Pagina>
      {/* useSearchParams (?animal=) es dato de la URL: va dentro de Suspense. */}
      <Suspense>
        <Contenido />
      </Suspense>
    </Pagina>
  );
}

function Contenido() {
  const router = useRouter();
  const animalId = useSearchParams().get("animal");
  // Cambiar la key reinicia el formulario para "Reportar otro".
  const [intento, setIntento] = useState(0);

  return (
    <>
      <PageHeader
        title={animalId ? "Lo vi también" : "Reportar avistamiento"}
        subtitle={animalId ? "Confirma dónde y cómo lo viste hoy." : "Foto + ubicación. La IA te ayuda con el resto."}
      />
      <RequireAuth motivo="para reportar un animal">
        {(profile) => (
          <FormularioReporte
            key={`${intento}-${animalId}`}
            userId={profile.id}
            animalInicialId={animalId}
            onOtro={() => {
              if (animalId) router.replace("/reportar");
              setIntento((n) => n + 1);
            }}
          />
        )}
      </RequireAuth>
    </>
  );
}
