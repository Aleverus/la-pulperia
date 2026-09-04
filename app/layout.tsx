import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { Header } from "@/app/_components/Header";
import { prelaunchMode } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const pulperiaSans = localFont({
  src: [
    { path: "./fonts/fira-sans-condensed-400-latin.woff2", weight: "400" },
    { path: "./fonts/fira-sans-condensed-500-latin.woff2", weight: "500" },
    { path: "./fonts/fira-sans-condensed-600-latin.woff2", weight: "600" },
    { path: "./fonts/fira-sans-condensed-700-latin.woff2", weight: "700" },
    { path: "./fonts/fira-sans-condensed-800-latin.woff2", weight: "800" },
  ],
  display: "swap",
  variable: "--font-pulperia-sans",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

const pulperiaDisplay = localFont({
  src: "./fonts/alegreya-latin.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-pulperia-display",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${SITE_NAME} — plaza local de Siguatepeque`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_HN",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — plaza local de Siguatepeque`,
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
      className={`${pulperiaSans.variable} ${pulperiaDisplay.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__brand">
              <Image
                src="/brand/la-pulperia-monogram-inverse-accent.png"
                alt=""
                aria-hidden="true"
                width={112}
                height={112}
              />
              <div>
                <strong>Encontrá. Compará. Confirmá.</strong>
                <p>
                  La Pulpería ordena la oferta local; cada negocio confirma
                  existencia, precio final, pago y entrega.
                </p>
              </div>
            </div>
            <nav className="site-footer__nav" aria-label="Enlaces del sitio">
              <div>
                <strong>Comprar</strong>
                <Link href="/buscar">Buscar ofertas</Link>
                <Link href="/mapa">Ver el mapa</Link>
                <Link href="/carrito">Abrir el carrito</Link>
              </div>
              <div>
                <strong>Ofrecer</strong>
                <Link href="/vender">Abrir una pulpería</Link>
                <Link href="/mi-pulperia">Mi pulpería</Link>
              </div>
            </nav>
          </div>
          <small className="site-footer__boundary">
            Siguatepeque · La conversación y el cierre siguen en el canal de
            cada negocio.
          </small>
        </footer>
      </body>
    </html>
  );
}
