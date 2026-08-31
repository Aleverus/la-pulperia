"use client";

import { useState } from "react";
import { savePresenceAction } from "@/app/seller-actions";
import { CityMap } from "@/app/_components/CityMap";
import {
  classifyGeolocation,
  GEO_ISSUE_LABEL,
  type GeoIssue,
  withinSiguatepeque,
} from "@/lib/geo";
import { normalizeWhatsapp, waMeUrl, whatsappProbeMessage } from "@/lib/phone";
import type { OwnedPresence } from "@/lib/seller";
import type { PresenceMode } from "@/lib/catalog";

export function PresenceForm({
  presence,
  error,
}: {
  presence: OwnedPresence | null;
  error?: string;
}) {
  const [mode, setMode] = useState<PresenceMode>(
    presence?.mode ?? "fixed_location",
  );
  const [name, setName] = useState(presence?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(presence?.whatsapp_e164 ?? "");
  const [lat, setLat] = useState<number | null>(presence?.lat ?? null);
  const [lng, setLng] = useState<number | null>(presence?.lng ?? null);
  const [issue, setIssue] = useState<GeoIssue | null>(null);

  const e164 = normalizeWhatsapp(whatsapp);
  const whatsappVerified =
    presence?.whatsapp_verification_status === "verified" &&
    e164 === presence.whatsapp_e164;
  const probeHref = e164
    ? waMeUrl(e164, whatsappProbeMessage(name || "esta pulpería"))
    : null;

  function placePin(nextLat: number, nextLng: number, accuracyM?: number) {
    const classified = classifyGeolocation({
      lat: nextLat,
      lng: nextLng,
      accuracyM,
    });
    setIssue(classified);
    if (classified === "out_of_coverage") return;
    setLat(nextLat);
    setLng(nextLng);
  }

  function useGps() {
    if (!navigator.geolocation) {
      setIssue("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        placePin(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        );
      },
      (err) => {
        setIssue(classifyGeolocation({ errorCode: err.code }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  const pin =
    mode === "fixed_location" && lat !== null && lng !== null
      ? [{ id: "draft", name: name || "Tu pulpería", lat, lng }]
      : [];

  return (
    <form action={savePresenceAction} className="stack">
      <input type="hidden" name="presence_id" value={presence?.id ?? ""} />
      <label htmlFor="presence-name">Nombre de la pulpería</label>
      <input
        id="presence-name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        maxLength={80}
      />

      <label htmlFor="presence-description">Descripción</label>
      <textarea
        id="presence-description"
        name="description"
        defaultValue={presence?.description ?? ""}
        maxLength={2000}
        rows={4}
      />

      <fieldset>
        <legend>Tipo</legend>
        <label>
          <input
            type="radio"
            name="mode"
            value="fixed_location"
            checked={mode === "fixed_location"}
            onChange={() => setMode("fixed_location")}
          />
          Ubicación fija: aparece en el mapa con un pin público confirmado
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="mobile"
            checked={mode === "mobile"}
            onChange={() => {
              setMode("mobile");
              setLat(null);
              setLng(null);
              setIssue(null);
            }}
          />
          Atención móvil: cobertura declarada, sin marcador puntual
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="remote"
            checked={mode === "remote"}
            onChange={() => {
              setMode("remote");
              setLat(null);
              setLng(null);
              setIssue(null);
            }}
          />
          Atención remota: alcance o entrega digital, sin marcador físico
        </label>
      </fieldset>

      {mode === "mobile" ? (
        <>
          <label htmlFor="presence-coverage">Cobertura declarada</label>
          <input
            id="presence-coverage"
            name="coverage_label"
            defaultValue={presence?.coverage_label ?? "Siguatepeque"}
            required
            maxLength={240}
          />
        </>
      ) : null}

      {mode === "remote" ? (
        <>
          <label htmlFor="presence-territory">Territorio o alcance</label>
          <input
            id="presence-territory"
            name="service_territory"
            defaultValue={presence?.service_territory ?? "Atención remota"}
            required
            maxLength={240}
          />
        </>
      ) : null}

      <label htmlFor="presence-whatsapp">WhatsApp</label>
      <input
        id="presence-whatsapp"
        name="whatsapp"
        value={whatsapp}
        onChange={(event) => setWhatsapp(event.target.value)}
        inputMode="tel"
        autoComplete="tel"
        placeholder="9999-3333"
        required
      />
      <p>
        El número no se muestra en el catálogo público. Sirve para el mensaje
        que abre el comprador autenticado.
      </p>
      {probeHref ? (
        <p>
          <a href={probeHref} target="_blank" rel="noreferrer">
            Probar número
          </a>
          . Eso no verifica el WhatsApp.
        </p>
      ) : (
        <p>Escribí un número hondureño para ver la prueba.</p>
      )}
      <p role="status">
        {whatsappVerified
          ? "WhatsApp verificado para esta pulpería."
          : "WhatsApp sin verificar. Podés guardar el borrador, pero no publicarlo hasta comprobar el control del número."}
      </p>

      {mode === "fixed_location" ? (
        <div>
          <h2 id="pin-map-label">Pin del negocio</h2>
          <p>
            Capturá el GPS, corregí el punto en el mapa y confirmá que esa
            coordenada exacta será pública.
          </p>
          <p>
            <button type="button" onClick={useGps}>
              Usar GPS
            </button>
          </p>
          {issue ? <p>{GEO_ISSUE_LABEL[issue]}</p> : null}
          <CityMap
            labelledBy="pin-map-label"
            pins={pin}
            selectedId="draft"
            onMapClick={(nextLat, nextLng) => placePin(nextLat, nextLng)}
          />
          <p>
            {lat !== null && lng !== null
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : "Todavía no hay pin."}
          </p>
          <label>
            <input
              type="checkbox"
              name="location_public_confirmed"
              defaultChecked={presence?.location_public_confirmed ?? false}
            />
            Confirmo que esta coordenada exacta será pública
          </label>
          {lat !== null && lng !== null && !withinSiguatepeque(lat, lng) ? (
            <p>Ese pin queda fuera de Siguatepeque y no se puede publicar.</p>
          ) : null}
        </div>
      ) : (
        <p>Esta presencia no entra al mapa y no guarda coordenadas.</p>
      )}

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      {error ? <p>{error}</p> : null}

      <p>
        <button type="submit" name="status" value="draft">
          Guardar borrador
        </button>{" "}
        <button
          type="submit"
          name="status"
          value="published"
          disabled={!whatsappVerified}
        >
          Publicar pulpería
        </button>
      </p>
    </form>
  );
}
