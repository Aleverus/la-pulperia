"use client";

import { useState } from "react";
import Link from "next/link";
import { IconBuildingStore, IconMapPin, IconWorld } from "@tabler/icons-react";
import { PublicMap } from "@/app/_components/PublicMap";
import {
  PRESENCE_MODE_LABEL,
  type CatalogPresence,
} from "@/lib/catalog";

type ExploreMode = "nearby" | "online";

export function ExploreDirectory({
  fixedPlaces,
  onlinePlaces,
}: {
  fixedPlaces: CatalogPresence[];
  onlinePlaces: CatalogPresence[];
}) {
  const [mode, setMode] = useState<ExploreMode>("nearby");

  return (
    <section className="explore-directory" aria-labelledby="explore-directory-title">
      <h2 id="explore-directory-title" className="sr-only">
        Directorio de negocios
      </h2>
      <div className="explore-switch" role="tablist" aria-label="Forma de explorar">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "nearby"}
          aria-controls="nearby-businesses"
          id="nearby-tab"
          onClick={() => setMode("nearby")}
        >
          <IconMapPin aria-hidden="true" size={19} stroke={1.8} />
          Cerca
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "online"}
          aria-controls="online-businesses"
          id="online-tab"
          onClick={() => setMode("online")}
        >
          <IconWorld aria-hidden="true" size={19} stroke={1.8} />
          En línea
        </button>
      </div>

      <div
        id="nearby-businesses"
        role="tabpanel"
        aria-labelledby="nearby-tab"
        hidden={mode !== "nearby"}
      >
        <p className="explore-directory__note">
          Sólo ubicaciones fijas confirmadas aparecen como puntos en el mapa.
        </p>
        <PublicMap places={fixedPlaces} />
      </div>

      <div
        id="online-businesses"
        role="tabpanel"
        aria-labelledby="online-tab"
        hidden={mode !== "online"}
      >
        <p className="explore-directory__note">
          Atención remota o por cobertura; estos negocios no se representan con
          marcadores falsos.
        </p>
        {onlinePlaces.length === 0 ? (
          <div className="explore-empty" role="status">
            <IconWorld aria-hidden="true" size={28} stroke={1.6} />
            <div>
              <strong>Todavía no hay negocios en línea publicados.</strong>
              <p>El catálogo sigue disponible para buscar todas las ofertas.</p>
            </div>
            <Link href="/buscar">Ir al catálogo</Link>
          </div>
        ) : (
          <ul className="online-presence-list">
            {onlinePlaces.map((place) => (
              <li key={place.id}>
                <IconBuildingStore aria-hidden="true" size={28} stroke={1.6} />
                <div>
                  <Link href={`/pulperia/${place.slug}`}>{place.name}</Link>
                  <span>{PRESENCE_MODE_LABEL[place.mode]}</span>
                  <p>{place.description}</p>
                  <small>{place.coverage_label ?? place.service_territory}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
