import type { Metadata } from "next";
import { Fira_Sans_Condensed } from "next/font/google";
import { Header } from "@/app/_components/Header";
import { prelaunchMode } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const pulperiaSans = Fira_Sans_Condensed({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pulperia-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${SITE_NAME} — catálogo local de Siguatepeque`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_HN",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — catálogo local de Siguatepeque`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  robots: prelaunchMode()
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={pulperiaSans.variable}
      data-scroll-behavior="smooth"
    >
      <body>
        <Header />
        {children}
        <footer className="site-footer">
          <p>
            La Pulpería te ayuda a encontrar y comparar. Existencia, precio
            final, pago y entrega se confirman con cada negocio.
          </p>
          <small>Siguatepeque, comercio local con contexto.</small>
        </footer>
      </body>
    </html>
  );
}
