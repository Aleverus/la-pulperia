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
  title: "Catálogo local",
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
  let offers: Awaited<ReturnType<typeof searchOffers>>["offers"] = [];
  let hasNext = false;
  let physicalPlaces: Awaited<ReturnType<typeof getPhysicalCatalogPlaces>> = [];
  let loadFailed = false;
  try {
    const [offerResult, places] = await Promise.all([
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
    offers = offerResult.offers;
    hasNext = offerResult.hasNext;
    physicalPlaces = places;
  } catch {
    loadFailed = true;
  }
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

  const intro = (
    <section className="catalog-intro">
      <h1 className="search-page-title">
        {query ? `Resultados para “${query}”` : "Catálogo"}
      </h1>
      {!query ? (
        <p className="catalog-intro__lede">
          Productos y ofertas de negocios en Siguatepeque.
        </p>
      ) : null}
      <SearchForm
        defaultQuery={query}
        defaultOfferClass={offerClass}
        defaultPresence={presence}
        defaultAvailability={availability}
        defaultSort={sort}
        locationActive={location !== null}
        compact
      />
    </section>
  );

  if (loadFailed) {
    return (
      <main className="catalog-page">
        {intro}
        <section className="catalog-load-error" role="alert">
          <h2>No pudimos cargar el catálogo</h2>
          <p>
            La búsqueda sigue disponible. Intentá de nuevo cuando vuelva la
            conexión con la información local.
          </p>
          <Link href="/buscar">Intentar de nuevo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="catalog-page">
      {intro}
      <p className="search-results-count" role="status">
        {offers.length} {offers.length === 1 ? "resultado visible" : "resultados visibles"}
        {hasNext ? " en esta página; hay más resultados." : "."}
      </p>
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
      {offers.length > 0 || location !== null ? (
        <LocationSearchControl
          query={query}
          offerClass={offerClass}
          presence={presence}
          availability={availability}
          active={location !== null}
        />
      ) : null}
      {requestedSort === "nearby" && !location && offers.length > 0 ? (
        <p>Activá “Cerca de mí” para ordenar estos resultados por distancia.</p>
      ) : null}
      {mappedPlaces.length > 0 ? (
        <details className="results-map">
          <summary>
            Ver {mappedPlaces.length}{" "}
            {mappedPlaces.length === 1 ? "ubicación fija" : "ubicaciones fijas"}{" "}
            en el mapa
          </summary>
          <div className="results-map__body">
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
                {otherPresenceCount}{" "}
                {otherPresenceCount === 1 ? "negocio atiende" : "negocios atienden"}{" "}
                por cobertura móvil o de forma remota; su alcance se explica en la ficha.
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
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
