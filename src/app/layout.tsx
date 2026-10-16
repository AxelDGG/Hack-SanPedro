import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";
import { AvisosHuellas } from "@/components/gamificacion/AvisosHuellas";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  // URLs absolutas para la vista previa de los links compartidos (WhatsApp, Facebook).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "CallejerOS", template: "%s · CallejerOS" },
  description:
    "Avisos de perros y gatos perdidos, encontrados y en la calle de San Pedro Garza García, en un solo lugar y con alertas por colonia.",
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
        <MotionProvider>
          <SessionProvider>
            {children}
            <AvisosHuellas />
          </SessionProvider>
        </MotionProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
