import type { Metadata } from "next";
import { PublicMap } from "@/app/_components/PublicMap";
import { getPhysicalCatalogPlaces } from "@/lib/seller-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa de pulperías físicas",
  description:
    "Descubrí negocios físicos de Siguatepeque con ubicación pública confirmada.",
  alternates: { canonical: "/mapa" },
};

export default async function MapaPage() {
  const places = await getPhysicalCatalogPlaces();

  return (
    <main className="map-page">
      <p className="eyebrow">Siguatepeque</p>
      <h1>Mapa</h1>
      <p>
        Sólo negocios físicos con pin confirmado. Las pulperías virtuales
        aparecen en el catálogo, nunca aquí.
      </p>
      <PublicMap places={places} />
    </main>
  );
}
