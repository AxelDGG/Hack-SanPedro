"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Pagina } from "@/components/layout/Pagina";
import { ORDEN_TIPOS, ORIGENES, type Origen, type TipoReporte } from "@/lib/constants";
import { AsistenteReporte } from "./asistente/AsistenteReporte";

export function ReportarView() {
  return (
    <Pagina>
      {/* useSearchParams (?tipo=, ?animal=…) es dato de la URL: va dentro de Suspense. */}
      <Suspense>
        <Contenido />
      </Suspense>
    </Pagina>
  );
}

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  const animalId = params.get("animal");
  const tipoParam = params.get("tipo");
  const origenParam = params.get("origen");
  const tipo = ORDEN_TIPOS.includes(tipoParam as TipoReporte) ? (tipoParam as TipoReporte) : null;
  const origen = origenParam && origenParam in ORIGENES ? (origenParam as Origen) : null;
  // Cambiar la key reinicia el asistente para "Reportar otro".
  const [intento, setIntento] = useState(0);

  return (
    // Sin cuenta: quien llega desde un link de un grupo entra como invitado.
    <RequireAuth motivo="para reportar" invitado>
      {(profile) => (
        <AsistenteReporte
          key={`${intento}-${animalId}-${tipo}`}
          userId={profile.id}
          tipoInicial={tipo}
          animalInicialId={animalId}
          fotoCompartida={params.get("foto")}
          textoCompartido={params.get("texto")}
          origenInicial={origen}
          abrirPegar={params.get("pegar") === "1"}
          onOtro={() => {
            if (animalId || tipo || params.size > 0) router.replace("/reportar");
            setIntento((n) => n + 1);
          }}
        />
      )}
    </RequireAuth>
  );
}
