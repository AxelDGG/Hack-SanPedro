import { Suspense } from "react";
import type { Metadata } from "next";
import { Pagina } from "@/components/layout/Pagina";
import { FichaAnimal } from "@/components/animal/FichaAnimal";
import { animalPublico, descripcionPublica, tituloPublico } from "@/lib/animal-publico";

/**
 * Título y descripción reales para la vista previa del link en WhatsApp y Facebook
 * (la imagen la genera opengraph-image.tsx). La página ya es dinámica por el id,
 * así que la metadata se resuelve junto con ella.
 */
export async function generateMetadata({ params }: PageProps<"/animal/[id]">): Promise<Metadata> {
  const { id } = await params;
  const animal = await animalPublico(id);
  if (!animal) return { title: "Ficha" };
  const title = tituloPublico(animal);
  const description = descripcionPublica(animal);
  return {
    title,
    description,
    openGraph: { title, description, type: "article", locale: "es_MX", siteName: "CallejerOS" },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
