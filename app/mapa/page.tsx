import type { Metadata } from "next";
import { ExploreDirectory } from "@/app/_components/ExploreDirectory";
import {
  getOnlineCatalogPlaces,
  getPhysicalCatalogPlaces,
} from "@/lib/seller-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explorar negocios",
  description:
    "Descubrí negocios cercanos y negocios que atienden en línea en Siguatepeque.",
  alternates: { canonical: "/mapa" },
};

export default async function MapaPage() {
  let fixedPlaces: Awaited<ReturnType<typeof getPhysicalCatalogPlaces>> = [];
  let onlinePlaces: Awaited<ReturnType<typeof getOnlineCatalogPlaces>> = [];
  let loadFailed = false;
  try {
    [fixedPlaces, onlinePlaces] = await Promise.all([
      getPhysicalCatalogPlaces(),
      getOnlineCatalogPlaces(),
    ]);
  } catch {
    loadFailed = true;
  }

  return (
    <main className="map-page">
      <p className="eyebrow">Siguatepeque</p>
      <h1>Explorar negocios</h1>
      <p>
        Encontrá quién está cerca o quién puede atenderte en línea desde un solo
        lugar.
      </p>
      {loadFailed ? (
        <p className="explore-load-error" role="alert">
          No pudimos cargar el directorio. El mapa base y los modos de exploración
          siguen disponibles para que podás intentarlo de nuevo.
        </p>
      ) : null}
      <ExploreDirectory fixedPlaces={fixedPlaces} onlinePlaces={onlinePlaces} />
    </main>
  );
}
