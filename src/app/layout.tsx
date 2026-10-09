import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";
import { AvisosHuellas } from "@/components/gamificacion/AvisosHuellas";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CallejerOS", template: "%s · CallejerOS" },
  description:
    "Mapa colaborativo de animales en situación de calle en San Pedro Garza García. Reporta, rescata y ayuda.",
  applicationName: "CallejerOS",
  appleWebApp: { capable: true, title: "CallejerOS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e2583e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          {children}
          <AvisosHuellas />
        </SessionProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
