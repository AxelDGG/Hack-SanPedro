"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Bell, HeartHandshake, Hexagon, House, MapIcon, Plus, UserRound, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { RESORTE, RESORTE_REBOTE } from "@/lib/motion";
import type { Rol } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const CUARTO_SLOT: Record<Rol, NavItem> = {
  vecino: { href: "/avisos", label: "Avisos", icon: Bell },
  rescatista: { href: "/rescate", label: "Casos", icon: HeartHandshake },
  municipio: { href: "/municipio", label: "Zonas", icon: Hexagon },
};

export function BottomNav() {
  // usePathname() es dato de la URL: en rutas dinámicas debe ir dentro de <Suspense>.
  return (
    <Suspense fallback={<Barra pathname={null} />}>
      <BarraConRuta />
    </Suspense>
  );
}

function BarraConRuta() {
  return <Barra pathname={usePathname()} />;
}

function Barra({ pathname }: { pathname: string | null }) {
  const { profile } = useSession();
  const rol = profile?.rol ?? "vecino";

  const izquierda: NavItem[] = [
    { href: "/", label: "Inicio", icon: House },
    { href: "/mapa", label: "Mapa", icon: MapIcon },
  ];
  const derecha: NavItem[] = [CUARTO_SLOT[rol], { href: "/perfil", label: "Perfil", icon: UserRound }];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1100] border-t border-arena-oscura bg-crema/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 items-center">
        {izquierda.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <li className="flex justify-center">
          <Link
            href="/reportar"
            aria-label="Reportar"
            className="-mt-8 block rounded-full"
          >
            <motion.span
              className="flex size-16 items-center justify-center rounded-full bg-terracota text-white shadow-lg ring-4 ring-crema"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              transition={RESORTE_REBOTE}
            >
              <Plus className="size-8" strokeWidth={2.6} />
            </motion.span>
          </Link>
        </li>
        {derecha.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-1 text-xs font-semibold transition-colors ${
          active ? "text-terracota" : "text-tinta-suave"
        }`}
      >
        <motion.span className="relative flex h-8 w-14 items-center justify-center" whileTap={{ scale: 0.85 }}>
          {/* Pastilla que se desliza a la pestaña activa. */}
          {active && (
            <motion.span layoutId="nav-activo" className="absolute inset-0 rounded-full bg-terracota/12" transition={RESORTE} />
          )}
          <motion.span
            className="relative"
            animate={active ? { y: [0, -4, 0], rotate: [0, -8, 0] } : { y: 0, rotate: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
          </motion.span>
        </motion.span>
        {item.label}
      </Link>
    </li>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
