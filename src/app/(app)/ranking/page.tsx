import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { Ranking } from "@/components/gamificacion/Ranking";

export const metadata = { title: "Ranking" };

export default function RankingPage() {
  return (
    <Pagina>
      <PageHeader title="Ranking" subtitle="Huellas ganadas reportando, confirmando y resolviendo casos." />
      <Ranking />
    </Pagina>
  );
}
