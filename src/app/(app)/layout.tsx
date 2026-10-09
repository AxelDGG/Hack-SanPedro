import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Cada página limita su propio ancho; el mapa usa toda la pantalla. */}
      <main className="min-h-dvh pb-[var(--nav-h)]">{children}</main>
      <BottomNav />
    </>
  );
}
