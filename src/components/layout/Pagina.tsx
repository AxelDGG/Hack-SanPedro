/** Contenedor estándar para páginas que no son el mapa (ancho móvil centrado). */
export function Pagina({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-lg">{children}</div>;
}
