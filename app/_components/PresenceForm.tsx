"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { IconCircleCheck, IconCircleDashed } from "@tabler/icons-react";
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
  continueToOffer = false,
}: {
  presence: OwnedPresence | null;
  error?: string;
  continueToOffer?: boolean;
}) {
  const [mode, setMode] = useState<PresenceMode | null>(
    presence?.mode ?? null,
  );
  const [name, setName] = useState(presence?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(presence?.whatsapp_e164 ?? "");
  const [lat, setLat] = useState<number | null>(presence?.lat ?? null);
  const [lng, setLng] = useState<number | null>(presence?.lng ?? null);
  const [locationPublicConfirmed, setLocationPublicConfirmed] = useState(
    presence?.location_public_confirmed ?? false,
  );
  const [issue, setIssue] = useState<GeoIssue | null>(null);
  const [locating, setLocating] = useState(false);

  const e164 = normalizeWhatsapp(whatsapp);
  const whatsappVerified =
    presence?.whatsapp_verification_status === "verified" &&
    e164 === presence.whatsapp_e164;
  const probeHref = e164
    ? waMeUrl(e164, whatsappProbeMessage(name || "este negocio"))
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
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        placePin(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
        );
      },
      (err) => {
        setLocating(false);
        setIssue(classifyGeolocation({ errorCode: err.code }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  const pin =
    mode === "fixed_location" && lat !== null && lng !== null
      ? [{ id: "draft", name: name || "Tu negocio", lat, lng }]
      : [];
  const hasPublishablePin =
    mode === "fixed_location" &&
    lat !== null &&
    lng !== null &&
    locationPublicConfirmed &&
    withinSiguatepeque(lat, lng);
  const canPublish =
    mode !== null &&
    whatsappVerified &&
    (mode !== "fixed_location" || hasPublishablePin);

  return (
    <form action={savePresenceAction} className="stack presence-form">
      <input type="hidden" name="presence_id" value={presence?.id ?? ""} />
      <input
        type="hidden"
        name="continue_to_offer"
        value={continueToOffer ? "1" : ""}
      />
      <label htmlFor="presence-name">Nombre del negocio</label>
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
        <legend>¿Cómo atendés?</legend>
        <p>
          Elegí la opción que la persona verá al buscar. No cambia cómo cerrás
          la venta por WhatsApp.
        </p>
        <label className="presence-mode-choice">
          <input
            type="radio"
            name="mode"
            value="fixed_location"
            checked={mode === "fixed_location"}
            onChange={() => setMode("fixed_location")}
          />
          <span>
            <strong>Ubicación fija</strong>
            <small>
              Tengo un local. Aparece en el mapa sólo con un pin público
              confirmado.
            </small>
          </span>
        </label>
        <label className="presence-mode-choice">
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
          <span>
            <strong>Atención móvil</strong>
            <small>
              Me muevo o cubro zonas. Se explica la cobertura sin un marcador
              puntual.
            </small>
          </span>
        </label>
        <label className="presence-mode-choice">
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
          <span>
            <strong>Atención remota</strong>
            <small>
              Atiendo a distancia o entrego digitalmente. No se inventa una
              ubicación física.
            </small>
          </span>
        </label>
      </fieldset>

      {mode === null ? (
        <p className="field-hint" role="status">
          Elegí cómo atendés para completar sólo los datos que corresponden.
        </p>
      ) : null}

      {mode === "mobile" ? (
        <>
          <label htmlFor="presence-coverage">Cobertura declarada</label>
          <input
            id="presence-coverage"
            name="coverage_label"
            defaultValue={presence?.coverage_label ?? ""}
            required
            maxLength={240}
            placeholder="Ej. barrios del centro de Siguatepeque"
          />
        </>
      ) : null}

      {mode === "remote" ? (
        <>
          <label htmlFor="presence-territory">Territorio o alcance</label>
          <input
            id="presence-territory"
            name="service_territory"
            defaultValue={presence?.service_territory ?? ""}
            required
            maxLength={240}
            placeholder="Ej. Honduras, entrega digital"
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
          ? "WhatsApp verificado para este negocio."
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
            <button type="button" onClick={useGps} disabled={locating}>
              {locating ? "Buscando ubicación…" : "Usar GPS"}
            </button>
          </p>
          {issue ? (
            <p
              className={issue === "imprecise" ? "field-hint" : "field-hint is-error"}
              role={issue === "imprecise" ? "status" : "alert"}
            >
              {GEO_ISSUE_LABEL[issue]}
            </p>
          ) : null}
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
              checked={locationPublicConfirmed}
              onChange={(event) =>
                setLocationPublicConfirmed(event.target.checked)
              }
            />
            Confirmo que esta coordenada exacta será pública
          </label>
          {lat !== null && lng !== null && !withinSiguatepeque(lat, lng) ? (
            <p className="field-hint is-error" role="alert">
              Ese pin queda fuera de Siguatepeque y no se puede publicar.
            </p>
          ) : null}
        </div>
      ) : (
        <p>Esta presencia no entra al mapa y no guarda coordenadas.</p>
      )}

      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      {error ? (
        <p className="field-hint is-error" role="alert">
          {error}
        </p>
      ) : null}

      <aside
        className="seller-publish-checklist"
        aria-labelledby="seller-publish-checklist-title"
      >
        <p className="eyebrow">Antes de publicar</p>
        <h2 id="seller-publish-checklist-title">Lo que falta revisar</h2>
        <ul>
          <li className={mode ? "is-ready" : ""}>
            {mode ? (
              <IconCircleCheck aria-hidden="true" size={20} stroke={1.9} />
            ) : (
              <IconCircleDashed aria-hidden="true" size={20} stroke={1.9} />
            )}
            <span>{mode ? "Forma de atención elegida" : "Elegí cómo atendés"}</span>
          </li>
          <li className={whatsappVerified ? "is-ready" : ""}>
            {whatsappVerified ? (
              <IconCircleCheck aria-hidden="true" size={20} stroke={1.9} />
            ) : (
              <IconCircleDashed aria-hidden="true" size={20} stroke={1.9} />
            )}
            <span>
              {whatsappVerified
                ? "WhatsApp verificado"
                : "Verificá que controlás el WhatsApp"}
            </span>
          </li>
          {mode === "fixed_location" ? (
            <li className={hasPublishablePin ? "is-ready" : ""}>
              {hasPublishablePin ? (
                <IconCircleCheck aria-hidden="true" size={20} stroke={1.9} />
              ) : (
                <IconCircleDashed aria-hidden="true" size={20} stroke={1.9} />
              )}
              <span>
                {hasPublishablePin
                  ? "Pin público confirmado en Siguatepeque"
                  : "Agregá y confirmá el pin público"}
              </span>
            </li>
          ) : null}
        </ul>
      </aside>

      <PresenceSubmitButtons canPublish={canPublish} />
    </form>
  );
}

function PresenceSubmitButtons({ canPublish }: { canPublish: boolean }) {
  const { pending, data } = useFormStatus();
  const pendingStatus = data?.get("status");

  return (
    <div className="button-row">
      <button type="submit" name="status" value="draft" disabled={pending}>
        {pending && pendingStatus === "draft" ? "Guardando…" : "Guardar borrador"}
      </button>
      <button
        type="submit"
        name="status"
        value="published"
        disabled={pending || !canPublish}
        aria-describedby={!canPublish ? "presence-publish-help" : undefined}
      >
        {pending && pendingStatus === "published"
          ? "Publicando…"
          : "Publicar negocio"}
      </button>
      {!canPublish ? (
        <span id="presence-publish-help" className="field-hint">
          Completá los puntos de revisión antes de publicar.
        </span>
      ) : null}
    </div>
  );
}
