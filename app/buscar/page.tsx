import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IconArrowsMaximize } from "@tabler/icons-react";
import { LocationSearchControl } from "@/app/_components/LocationSearchControl";
import { OfferList } from "@/app/_components/OfferList";
import { PublicMap } from "@/app/_components/PublicMap";
import { SearchForm } from "@/app/_components/SearchForm";
import { searchOffers } from "@/lib/data";
import { getPhysicalCatalogPlaces } from "@/lib/seller-data";
import {
  MAX_SEARCH_PAGE,
  first,
  parseSearchAvailabilityFilter,
  parseSearchOfferClassFilter,
  parseSearchPage,
  parseSearchPresenceFilter,
  parseSearchSort,
  searchHref,
} from "@/lib/search";
import {
  LOCATION_COOKIE,
  parseSessionLocation,
} from "@/lib/session-location";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar ofertas locales",
  description: "Buscá y compará ofertas publicadas en Siguatepeque.",
  alternates: { canonical: "/buscar" },
  robots: { index: false, follow: true },
};

export default async function BuscarPage({
  searchParams,
}: PageProps<"/buscar">) {
  const params = await searchParams;
  const query = first(params.q).trim();
  const offerClass = parseSearchOfferClassFilter(params.clase);
  const presence = parseSearchPresenceFilter(params.tipo);
  const availability = parseSearchAvailabilityFilter(params.disponibilidad);
  const requestedSort = parseSearchSort(params.orden);
  const cookieStore = await cookies();
  const location = parseSessionLocation(cookieStore.get(LOCATION_COOKIE)?.value);
  const sort = requestedSort === "nearby" && !location ? "organic" : requestedSort;
  const page = parseSearchPage(params.pagina);
  const [{ offers, hasNext }, physicalPlaces] = await Promise.all([
    searchOffers({
      query,
      offerClass,
      presence,
      availability,
      sort,
      page,
      location,
    }),
    getPhysicalCatalogPlaces(),
  ]);
  const fixedPresenceIds = new Set(
    offers
      .filter((offer) => offer.presence_mode === "fixed_location")
      .map((offer) => offer.presence_id),
  );
  const mappedPlaces = physicalPlaces.filter((place) => fixedPresenceIds.has(place.id));
  const otherPresenceCount = new Set(
    offers
      .filter((offer) => offer.presence_mode !== "fixed_location")
      .map((offer) => offer.presence_id),
  ).size;

  return (
    <main className="catalog-page">
      <p className="eyebrow">Catálogo local</p>
      <h1 className="search-page-title">
        {query ? `Resultados para “${query}”` : "Buscar ofertas"}
      </h1>
      <SearchForm
        defaultQuery={query}
        defaultOfferClass={offerClass}
        defaultPresence={presence}
        defaultAvailability={availability}
        defaultSort={sort}
        locationActive={location !== null}
      />
      <p className="search-results-count" role="status">
        {offers.length} {offers.length === 1 ? "resultado visible" : "resultados visibles"}
        {hasNext ? " en esta página; hay más resultados." : "."}
      </p>
      {mappedPlaces.length > 0 ? (
        <section className="results-map" aria-labelledby="results-map-title">
          <div className="section-heading">
            <h2 id="results-map-title">Mapa local</h2>
            <Link href="/mapa" className="results-map__expand">
              <IconArrowsMaximize aria-hidden="true" size={20} stroke={1.8} />
              Ampliar
            </Link>
          </div>
          <PublicMap places={mappedPlaces} compact />
          <p className="map-trust-note">
            Sólo muestra ubicaciones fijas confirmadas.
          </p>
          {otherPresenceCount > 0 ? (
            <p className="coverage-note">
              {otherPresenceCount} {otherPresenceCount === 1 ? "negocio atiende" : "negocios atienden"}{" "}
              por cobertura móvil o de forma remota; su alcance se explica en la ficha.
            </p>
          ) : null}
        </section>
      ) : null}
      <LocationSearchControl
        query={query}
        offerClass={offerClass}
        presence={presence}
        availability={availability}
        active={location !== null}
      />
      {requestedSort === "nearby" && !location ? (
        <p>Activá “Cerca de mí” para ordenar por distancia.</p>
      ) : null}
      <OfferList
        offers={offers}
        emptyState={{
          query,
          clearFiltersHref: searchHref({
            query,
            offerClass: "all",
            presence: "all",
            availability: "all",
            sort: "organic",
            page: 1,
          }),
          filtersApplied:
            offerClass !== "all" ||
            presence !== "all" ||
            availability !== "all" ||
            sort !== "organic",
        }}
      />
      {page > 1 || hasNext ? (
        <nav aria-label="Páginas de resultados" className="pagination">
          {page > 1 ? (
            <Link
              href={searchHref({
                query,
                offerClass,
                presence,
                availability,
                sort,
                page: page - 1,
              })}
            >
              Anterior
            </Link>
          ) : null}
          <span>Página {page}</span>
          {hasNext && page < MAX_SEARCH_PAGE ? (
            <Link
              href={searchHref({
                query,
                offerClass,
                presence,
                availability,
                sort,
                page: page + 1,
              })}
            >
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
