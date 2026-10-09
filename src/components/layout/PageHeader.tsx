export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 px-4 pt-6 pb-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-tinta-suave">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
