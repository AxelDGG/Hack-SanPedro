import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-lg pb-[var(--nav-h)]">{children}</main>
      <BottomNav />
    </>
  );
}
