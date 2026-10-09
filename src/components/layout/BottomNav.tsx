"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, HeartHandshake, Hexagon, MapIcon, PawPrint, Trophy, UserRound, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import type { Rol } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const CUARTO_SLOT: Record<Rol, NavItem> = {
  vecino: { href: "/manada", label: "Manada", icon: PawPrint },
  rescatista: { href: "/rescate", label: "Casos", icon: HeartHandshake },
  municipio: { href: "/municipio", label: "Zonas", icon: Hexagon },
};

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useSession();
  const rol = profile?.rol ?? "vecino";

  const izquierda: NavItem[] = [
    { href: "/", label: "Mapa", icon: MapIcon },
    { href: "/ranking", label: "Ranking", icon: Trophy },
  ];
  const derecha: NavItem[] = [CUARTO_SLOT[rol], { href: "/perfil", label: "Perfil", icon: UserRound }];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-arena-oscura bg-crema/95 backdrop-blur"
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
            aria-label="Reportar un animal"
            className="-mt-8 flex size-16 items-center justify-center rounded-full bg-terracota text-white shadow-lg ring-4 ring-crema transition active:scale-95"
          >
            <Camera className="size-7" />
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
        className={`flex flex-col items-center gap-0.5 py-1 text-xs font-semibold ${
          active ? "text-terracota" : "text-tinta-suave"
        }`}
      >
        <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
        {item.label}
      </Link>
    </li>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
