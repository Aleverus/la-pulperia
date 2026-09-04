"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  IconBuildingStore,
  IconAdjustmentsHorizontal,
  IconMapPin,
  IconSearch,
  IconWorld,
} from "@tabler/icons-react";
import { PublicMap } from "@/app/_components/PublicMap";
import {
  PRESENCE_MODE_LABEL,
  type OfferClass,
  type CatalogPresenceWithOffers,
} from "@/lib/catalog";

type ExploreMode = "nearby" | "online";
type ExploreOfferClass = OfferClass | "all";

const FILTER_OPTIONS: { value: ExploreOfferClass; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "stocked_product", label: "Productos" },
  { value: "scheduled_food", label: "Encargos" },
  { value: "local_service", label: "Servicios" },
  { value: "digital_offer", label: "Digital" },
];

export function ExploreDirectory({
  fixedPlaces,
  onlinePlaces,
  loadFailed = false,
  offerLoadFailed = false,
}: {
  fixedPlaces: CatalogPresenceWithOffers[];
  onlinePlaces: CatalogPresenceWithOffers[];
  loadFailed?: boolean;
  offerLoadFailed?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialState = readUrlState(
    search,
    fixedPlaces,
    loadFailed,
    offerLoadFailed,
  );
  const [mode, setMode] = useState<ExploreMode>(initialState.mode);
  const [query, setQuery] = useState(initialState.query);
  const [queryDraft, setQueryDraft] = useState(initialState.query);
  const [offerClass, setOfferClass] = useState<ExploreOfferClass>(
    initialState.offerClass,
  );
  const filterDetails = useRef<HTMLDetailsElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialState.selectedId,
  );

  useEffect(() => {
    const next = readUrlState(
      search,
      fixedPlaces,
      loadFailed,
      offerLoadFailed,
    );
    setMode(next.mode);
    setQuery(next.query);
    setQueryDraft(next.query);
    setOfferClass(next.offerClass);
    setSelectedId(next.selectedId);

    const canonical = buildCanonicalSearch(search, {
      mode: next.mode,
      query: next.query,
      offerClass: next.offerClass,
      selectedId: next.canonicalSelectedId,
    });
    if (canonical !== search) {
      router.replace(canonical ? `${pathname}?${canonical}` : pathname, {
        scroll: false,
      });
    }
  }, [fixedPlaces, loadFailed, offerLoadFailed, pathname, router, search]);

  const filteredFixed = useMemo(
    () =>
      filterPlaces(
        fixedPlaces,
        query,
        offerLoadFailed ? "all" : offerClass,
      ),
    [fixedPlaces, offerClass, offerLoadFailed, query],
  );
  const filteredOnline = useMemo(
    () =>
      filterPlaces(
        onlinePlaces,
        query,
        offerLoadFailed ? "all" : offerClass,
      ),
    [offerClass, offerLoadFailed, onlinePlaces, query],
  );
  const visibleSelectedId = filteredFixed.some(
    (place) => place.id === selectedId,
  )
    ? selectedId
    : filteredFixed[0]?.id ?? null;

  function writeUrl(next: {
    mode?: ExploreMode;
    query?: string;
    offerClass?: ExploreOfferClass;
    selectedId?: string | null;
  }) {
    const nextMode = next.mode ?? mode;
    const nextQuery = next.query ?? query;
    const nextOfferClass = next.offerClass ?? offerClass;
    const nextSelected =
      next.selectedId === undefined ? visibleSelectedId : next.selectedId;
    const nextSearch = buildCanonicalSearch(search, {
      mode: nextMode,
      query: nextQuery,
      offerClass: nextOfferClass,
      selectedId: nextSelected,
    });
    if (nextSearch === search) return;
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }

  function chooseMode(nextMode: ExploreMode) {
    setMode(nextMode);
    writeUrl({ mode: nextMode });
  }

  function choosePresence(id: string) {
    setSelectedId(id);
    writeUrl({ selectedId: id });
  }

  function chooseOfferClass(nextOfferClass: ExploreOfferClass) {
    setOfferClass(nextOfferClass);
    const matching = filterPlaces(
      fixedPlaces,
      query,
      offerLoadFailed ? "all" : nextOfferClass,
    );
    const nextSelected = matching.some((place) => place.id === selectedId)
      ? selectedId
      : matching[0]?.id ?? null;
    setSelectedId(nextSelected);
    writeUrl({ offerClass: nextOfferClass, selectedId: nextSelected });
    filterDetails.current?.removeAttribute("open");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = queryDraft.trim();
    setQuery(nextQuery);
    const matching = filterPlaces(
      fixedPlaces,
      nextQuery,
      offerLoadFailed ? "all" : offerClass,
    );
    const nextSelected = matching.some((place) => place.id === selectedId)
      ? selectedId
      : matching[0]?.id ?? null;
    setSelectedId(nextSelected);
    writeUrl({ query: nextQuery, selectedId: nextSelected });
  }

  return (
    <section
      className="explore-directory"
      aria-labelledby="explore-directory-title"
    >
      <h1 id="explore-directory-title" className="sr-only">
        Explorar negocios en Siguatepeque
      </h1>

      <div className="explore-controls">
        <form role="search" onSubmit={submitSearch}>
          <label htmlFor="explore-query" className="sr-only">
            ¿Qué necesitás cerca?
          </label>
          <IconSearch aria-hidden="true" size={22} stroke={1.8} />
          <input
            id="explore-query"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="¿Qué necesitás cerca?"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="explore-control-row">
          <div
            className="explore-switch"
            role="tablist"
            aria-label="Forma de explorar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "nearby"}
              aria-controls="nearby-businesses"
              id="nearby-tab"
              onClick={() => chooseMode("nearby")}
            >
              <IconMapPin aria-hidden="true" size={18} stroke={1.8} />
              Cerca
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "online"}
              aria-controls="online-businesses"
              id="online-tab"
              onClick={() => chooseMode("online")}
            >
              <IconWorld aria-hidden="true" size={18} stroke={1.8} />
              En línea
            </button>
          </div>
          <details className="explore-filter" ref={filterDetails}>
            <summary>
              <IconAdjustmentsHorizontal
                aria-hidden="true"
                size={18}
                stroke={1.8}
              />
              Filtros
            </summary>
            <div role="group" aria-label="Tipo de publicación">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={offerClass === option.value}
                  onClick={() => chooseOfferClass(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>
        </div>
        {loadFailed ? (
          <div className="explore-load-error" role="alert">
            <span>
              No pudimos actualizar las presencias. El mapa base sigue
              disponible.
            </span>
            <button type="button" onClick={() => router.refresh()}>
              Reintentar
            </button>
          </div>
        ) : offerLoadFailed ? (
          <div className="explore-load-error" role="alert">
            <span>
              Las presencias cargaron, pero no pudimos actualizar sus
              publicaciones. Podés seguir explorando los negocios.
            </span>
            <button type="button" onClick={() => router.refresh()}>
              Reintentar publicaciones
            </button>
          </div>
        ) : null}
      </div>

      {loadFailed ? (
        <div
          id={mode === "nearby" ? "nearby-businesses" : "online-businesses"}
          role="tabpanel"
          aria-labelledby={mode === "nearby" ? "nearby-tab" : "online-tab"}
          className="explore-map-base"
        >
          <PublicMap places={[]} showDirectory={false} />
        </div>
      ) : (
        <>
          <div
            id="nearby-businesses"
            role="tabpanel"
            aria-labelledby="nearby-tab"
            hidden={mode !== "nearby"}
          >
            <PublicMap
              places={filteredFixed}
              selectedId={visibleSelectedId}
              onSelect={choosePresence}
            />
          </div>

          <div
            id="online-businesses"
            role="tabpanel"
            aria-labelledby="online-tab"
            hidden={mode !== "online"}
            className="online-directory"
          >
            <header>
              <p className="eyebrow">Atención sin punto fijo</p>
              <h2>Negocios que llegan hasta vos o atienden en línea</h2>
              <p>
                Su cobertura publicada aparece como lista. No usamos un pin para
                fingir una ubicación.
              </p>
            </header>
            {filteredOnline.length === 0 ? (
              <div className="explore-empty" role="status">
                <IconWorld aria-hidden="true" size={28} stroke={1.6} />
                <div>
                  <strong>No hay coincidencias publicadas en este modo.</strong>
                  <p>Probá otra necesidad o compará todas las ofertas.</p>
                </div>
                <Link href="/buscar">Ir al catálogo</Link>
              </div>
            ) : (
              <ul className="online-presence-list">
                {filteredOnline.map((place) => (
                  <li key={place.id}>
                    <span className="presence-avatar" aria-hidden="true">
                      {initials(place.name)}
                    </span>
                    <div>
                      <Link href={`/pulperia/${place.slug}`}>{place.name}</Link>
                      <span>{PRESENCE_MODE_LABEL[place.mode]}</span>
                      <p>{place.description}</p>
                      <small>
                        {place.coverage_label ?? place.service_territory}
                      </small>
                      {place.offers.length > 0 ? (
                        <div className="online-presence-list__publications">
                          {place.offers.slice(0, 3).map((offer) => (
                            <Link key={offer.id} href={`/oferta/${offer.slug}`}>
                              {offer.title}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <IconBuildingStore
                      aria-hidden="true"
                      size={22}
                      stroke={1.7}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function readUrlState(
  search: string,
  fixedPlaces: CatalogPresenceWithOffers[],
  loadFailed: boolean,
  offerLoadFailed: boolean,
): {
  mode: ExploreMode;
  query: string;
  offerClass: ExploreOfferClass;
  selectedId: string | null;
  canonicalSelectedId: string | null;
} {
  const params = new URLSearchParams(search);
  const mode: ExploreMode =
    params.get("modo") === "en-linea" ? "online" : "nearby";
  const query = params.get("q")?.trim() ?? "";
  const requestedClass = params.get("clase");
  const offerClass = FILTER_OPTIONS.some(
    (option) => option.value === requestedClass,
  )
    ? (requestedClass as ExploreOfferClass)
    : "all";
  const requestedId = params.get("presencia");
  const matching = filterPlaces(
    fixedPlaces,
    query,
    offerLoadFailed ? "all" : offerClass,
  );
  const selectedId = loadFailed
    ? requestedId
    : matching.some((place) => place.id === requestedId)
      ? requestedId
      : matching[0]?.id ?? null;
  const canonicalSelectedId =
    mode === "nearby" &&
    (loadFailed || matching.some((place) => place.id === requestedId))
      ? requestedId
      : null;

  return { mode, query, offerClass, selectedId, canonicalSelectedId };
}

function buildCanonicalSearch(
  search: string,
  state: {
    mode: ExploreMode;
    query: string;
    offerClass: ExploreOfferClass;
    selectedId: string | null;
  },
): string {
  const params = new URLSearchParams(search);
  if (state.mode === "online") params.set("modo", "en-linea");
  else params.delete("modo");
  if (state.query) params.set("q", state.query);
  else params.delete("q");
  if (state.offerClass === "all") params.delete("clase");
  else params.set("clase", state.offerClass);
  if (state.mode === "nearby" && state.selectedId) {
    params.set("presencia", state.selectedId);
  } else {
    params.delete("presencia");
  }
  return params.toString();
}

function filterPlaces(
  places: CatalogPresenceWithOffers[],
  query: string,
  offerClass: ExploreOfferClass,
): CatalogPresenceWithOffers[] {
  const normalized = normalizeSearchText(query);
  return places.flatMap((place) => {
    const classOffers =
      offerClass === "all"
        ? place.offers
        : place.offers.filter((offer) => offer.offer_class === offerClass);
    if (offerClass !== "all" && classOffers.length === 0) return [];

    if (!normalized) return [{ ...place, offers: classOffers }];

    const presenceMatches = [
      place.name,
      place.description,
      place.coverage_label,
      place.service_territory,
    ]
      .filter(Boolean)
      .some((value) => normalizeSearchText(value ?? "").includes(normalized));

    if (presenceMatches) return [{ ...place, offers: classOffers }];

    const matchingOffers = classOffers.filter((offer) =>
      [offer.title, offer.description].some((value) =>
        normalizeSearchText(value).includes(normalized),
      ),
    );
    return matchingOffers.length > 0
      ? [{ ...place, offers: matchingOffers }]
      : [];
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-HN")
    .trim();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-HN");
}
