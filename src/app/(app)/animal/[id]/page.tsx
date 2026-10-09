import { Suspense } from "react";
import { Pagina } from "@/components/layout/Pagina";
import { FichaAnimal } from "@/components/animal/FichaAnimal";

export const metadata = { title: "Ficha" };

export default function AnimalPage({ params }: PageProps<"/animal/[id]">) {
  return (
    <Pagina>
      {/* El id viene de la URL (dato en tiempo de petición): se resuelve dentro de Suspense. */}
      <Suspense>
        <Ficha params={params} />
      </Suspense>
    </Pagina>
  );
}

async function Ficha({ params }: { params: PageProps<"/animal/[id]">["params"] }) {
  const { id } = await params;
  return <FichaAnimal id={id} />;
}
