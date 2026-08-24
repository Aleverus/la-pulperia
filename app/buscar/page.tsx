import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocationSearchControl } from "@/app/_components/LocationSearchControl";
import { OfferList } from "@/app/_components/OfferList";
import { SearchForm } from "@/app/_components/SearchForm";
import { searchOffers } from "@/lib/data";
import {
  first,
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
  const presence = parseSearchPresenceFilter(params.tipo);
  const requestedSort = parseSearchSort(params.orden);
  const cookieStore = await cookies();
  const location = parseSessionLocation(cookieStore.get(LOCATION_COOKIE)?.value);
  const sort = requestedSort === "nearby" && !location ? "organic" : requestedSort;
  const page = parseSearchPage(params.pagina);
  const { offers, hasNext } = await searchOffers({
    query,
    presence,
    sort,
    page,
    location,
  });

  return (
    <main className="catalog-page">
      <p className="eyebrow">Catálogo local</p>
      <h1>{query ? `Resultados para “${query}”` : "Buscar ofertas"}</h1>
      <SearchForm
        defaultQuery={query}
        defaultPresence={presence}
        defaultSort={sort}
        locationActive={location !== null}
      />
      <LocationSearchControl
        query={query}
        presence={presence}
        active={location !== null}
      />
      {requestedSort === "nearby" && !location ? (
        <p>Activá “Cerca de mí” para ordenar por distancia.</p>
      ) : null}
      <OfferList offers={offers} />
      {page > 1 || hasNext ? (
        <nav aria-label="Páginas de resultados" className="pagination">
          {page > 1 ? (
            <Link href={searchHref({ query, presence, sort, page: page - 1 })}>
              Anterior
            </Link>
          ) : null}
          <span>Página {page}</span>
          {hasNext ? (
            <Link href={searchHref({ query, presence, sort, page: page + 1 })}>
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
