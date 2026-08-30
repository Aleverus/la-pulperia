import type { Metadata } from "next";
import { PublicMap } from "@/app/_components/PublicMap";
import { getPhysicalCatalogPlaces } from "@/lib/seller-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa de ubicaciones fijas",
  description:
    "Descubrí ubicaciones fijas de Siguatepeque con punto público confirmado.",
  alternates: { canonical: "/mapa" },
};

export default async function MapaPage() {
  const places = await getPhysicalCatalogPlaces();

  return (
    <main className="map-page">
      <p className="eyebrow">Siguatepeque</p>
      <h1>Mapa</h1>
      <p>
        Sólo ubicaciones fijas con punto confirmado. La atención móvil y remota
        aparece en el catálogo, nunca como un marcador falso.
      </p>
      <PublicMap places={places} />
    </main>
  );
}
