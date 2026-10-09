import { ESTADOS, type Estado } from "@/lib/constants";

export function StatusPill({ estado, className = "" }: { estado: Estado; className?: string }) {
  const { label, color } = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${className}`}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
