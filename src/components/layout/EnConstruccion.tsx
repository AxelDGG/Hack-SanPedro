import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Pagina } from "./Pagina";

/** Marcador temporal para secciones de fases posteriores. */
export function EnConstruccion({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <Pagina>
      <PageHeader title={titulo} />
      <div className="mx-4 flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
        <Construction className="size-8 text-ambar" />
        <p className="font-display text-lg">Llega en la fase {fase}</p>
      </div>
    </Pagina>
  );
}
