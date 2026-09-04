import type { Metadata } from "next";
import { ExploreDirectory } from "@/app/_components/ExploreDirectory";
import { getPresenceOffersByIds } from "@/lib/data";
import type { CatalogPresenceWithOffers } from "@/lib/catalog";
import {
  getOnlineCatalogPlaces,
  getPhysicalCatalogPlaces,
} from "@/lib/seller-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explorar Siguatepeque",
  description:
    "Descubrí negocios cercanos y negocios que atienden en línea en Siguatepeque.",
  alternates: { canonical: "/mapa" },
};

export default async function MapaPage() {
  let fixedPlaces: Awaited<ReturnType<typeof getPhysicalCatalogPlaces>> = [];
  let onlinePlaces: Awaited<ReturnType<typeof getOnlineCatalogPlaces>> = [];
  let fixedWithOffers: CatalogPresenceWithOffers[] = [];
  let onlineWithOffers: CatalogPresenceWithOffers[] = [];
  let loadFailed = false;
  let offerLoadFailed = false;
  try {
    [fixedPlaces, onlinePlaces] = await Promise.all([
      getPhysicalCatalogPlaces(),
      getOnlineCatalogPlaces(),
    ]);
    fixedWithOffers = fixedPlaces.map((place) => ({
      ...place,
      offers: [],
    }));
    onlineWithOffers = onlinePlaces.map((place) => ({
      ...place,
      offers: [],
    }));
  } catch {
    loadFailed = true;
  }

  if (!loadFailed) {
    try {
      const offers = await getPresenceOffersByIds(
        [...fixedPlaces, ...onlinePlaces].map((place) => place.id),
      );
      const offersByPresence = new Map<string, typeof offers>();
      for (const offer of offers) {
        const group = offersByPresence.get(offer.presence_id) ?? [];
        group.push(offer);
        offersByPresence.set(offer.presence_id, group);
      }

      fixedWithOffers = fixedPlaces.map((place) => ({
        ...place,
        offers: offersByPresence.get(place.id) ?? [],
      }));
      onlineWithOffers = onlinePlaces.map((place) => ({
        ...place,
        offers: offersByPresence.get(place.id) ?? [],
      }));
    } catch {
      offerLoadFailed = true;
    }
  }

  return (
    <main className="map-page">
      <ExploreDirectory
        fixedPlaces={fixedWithOffers}
        onlinePlaces={onlineWithOffers}
        loadFailed={loadFailed}
        offerLoadFailed={offerLoadFailed}
      />
    </main>
  );
}
