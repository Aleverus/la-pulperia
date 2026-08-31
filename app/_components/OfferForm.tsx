"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmOfferAction,
  removeOfferImageAction,
  saveOfferAction,
  setOfferStatusAction,
} from "@/app/seller-actions";
import type {
  AvailabilityState,
  FulfillmentMode,
  OfferClass,
} from "@/lib/catalog";
import { OFFER_CLASS_LABEL } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import type { PriceMode } from "@/lib/money";
import { mediaPublicUrl } from "@/lib/media-url";
import type { OwnedMedia, OwnedOffer } from "@/lib/seller";

const CLASS_HELP: Record<OfferClass, string> = {
  stocked_product: "Algo que vendés por cantidad y cuya existencia podés confirmar.",
  scheduled_food: "Comida o encargo disponible dentro de una ventana concreta.",
  local_service: "Trabajo que cotizás, agendás o realizás en una cobertura local.",
  digital_offer: "Algo que entregás o atendés de forma digital o remota.",
};

const AVAILABILITY_LABEL: Record<AvailabilityState, string> = {
  available: "Disponible",
  limited: "Disponibilidad limitada",
  unavailable: "No disponible por ahora",
  on_request: "Bajo solicitud",
};

const FULFILLMENT_OPTIONS: Array<{
  value: FulfillmentMode;
  label: string;
}> = [
  { value: "pickup", label: "Retiro" },
  { value: "local_coverage", label: "Cobertura o visita local" },
  { value: "seller_shipping", label: "Envío propio del vendedor" },
  { value: "appointment", label: "Cita" },
  { value: "digital_delivery", label: "Entrega digital" },
  { value: "direct_agreement", label: "Acuerdo directo" },
];

const ALLOWED_FULFILLMENTS: Record<OfferClass, FulfillmentMode[]> = {
  stocked_product: [
    "pickup",
    "local_coverage",
    "seller_shipping",
    "direct_agreement",
  ],
  scheduled_food: [
    "pickup",
    "local_coverage",
    "seller_shipping",
    "direct_agreement",
  ],
  local_service: ["local_coverage", "appointment", "direct_agreement"],
  digital_offer: ["digital_delivery", "appointment", "direct_agreement"],
};

export function OfferForm({
  presenceId,
  offer,
  media,
  error,
  notice,
}: {
  presenceId: string;
  offer: OwnedOffer | null;
  media: OwnedMedia[];
  error?: string;
  notice?: string;
}) {
  const details = offer?.availability_details ?? {};
  const [offerClass, setOfferClass] = useState<OfferClass>(
    offer?.offer_class ?? "stocked_product",
  );
  const [priceMode, setPriceMode] = useState<PriceMode>(
    offer?.price_mode ?? "fixed",
  );
  const [availabilityState, setAvailabilityState] =
    useState<AvailabilityState>(offer?.availability_state ?? "available");
  const [fulfillments, setFulfillments] = useState<FulfillmentMode[]>(
    offer?.fulfillment_modes.length
      ? offer.fulfillment_modes
      : ["direct_agreement"],
  );
  const maintenanceStartedAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (maintenanceStartedAtRef.current) {
      maintenanceStartedAtRef.current.value = String(Date.now());
    }
  }, []);

  const availabilityStates = availabilityStatesFor(offerClass);
  const fulfillmentOptions = FULFILLMENT_OPTIONS.filter(({ value }) =>
    ALLOWED_FULFILLMENTS[offerClass].includes(value),
  );

  function changeClass(next: OfferClass) {
    setOfferClass(next);
    if (!availabilityStatesFor(next).includes(availabilityState)) {
      setAvailabilityState("available");
    }
    setFulfillments(["direct_agreement"]);
  }

  function toggleFulfillment(mode: FulfillmentMode, checked: boolean) {
    setFulfillments((current) =>
      checked
        ? Array.from(new Set([...current, mode]))
        : current.filter((item) => item !== mode),
    );
  }

  return (
    <div className="stack">
      <form action={saveOfferAction} className="stack">
        <input type="hidden" name="presence_id" value={presenceId} />
        <input type="hidden" name="offer_id" value={offer?.id ?? ""} />
        <input
          type="hidden"
          name="maintenance_started_at_ms"
          ref={maintenanceStartedAtRef}
        />

        <fieldset>
          <legend>1. ¿Qué ofrecés?</legend>
          {(
            [
              "stocked_product",
              "scheduled_food",
              "local_service",
              "digital_offer",
            ] as OfferClass[]
          ).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="offer_class"
                value={value}
                checked={offerClass === value}
                onChange={() => changeClass(value)}
              />
              {OFFER_CLASS_LABEL[value]}. {CLASS_HELP[value]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>2. Identificá la oferta</legend>
          <label htmlFor="offer-title">Título</label>
          <input
            id="offer-title"
            name="title"
            defaultValue={offer?.title ?? ""}
            required
            maxLength={120}
          />

          <label htmlFor="offer-description">Descripción</label>
          <textarea
            id="offer-description"
            name="description"
            defaultValue={offer?.description ?? ""}
            maxLength={4000}
            rows={4}
          />

          <label htmlFor="offer-price-mode">Modalidad de precio</label>
          <select
            id="offer-price-mode"
            name="price_mode"
            value={priceMode}
            onChange={(event) => setPriceMode(event.target.value as PriceMode)}
          >
            <option value="fixed">Precio fijo</option>
            <option value="from">Desde</option>
            <option value="quote">Cotización</option>
          </select>

          {priceMode === "quote" ? (
            <p>No se publicará una cifra. El comprador pedirá una cotización.</p>
          ) : (
            <>
              <label htmlFor="offer-price">Precio publicado (lempiras)</label>
              <input
                id="offer-price"
                name="price"
                inputMode="decimal"
                defaultValue={
                  offer?.price_cents === null ||
                  offer?.price_cents === undefined
                    ? ""
                    : (offer.price_cents / 100).toFixed(2)
                }
                required
              />
            </>
          )}

          <label htmlFor="offer-unit">
            Unidad o periodo
            {offerClass === "stocked_product" || offerClass === "scheduled_food"
              ? ""
              : " (opcional)"}
          </label>
          <input
            id="offer-unit"
            name="unit"
            defaultValue={offer?.unit ?? ""}
            required={
              offerClass === "stocked_product" || offerClass === "scheduled_food"
            }
            maxLength={40}
            placeholder={unitPlaceholder(offerClass)}
          />
        </fieldset>

        <fieldset>
          <legend>3. ¿Cuándo está disponible?</legend>
          <label htmlFor="offer-availability">Estado actual</label>
          <select
            id="offer-availability"
            name="availability_state"
            value={availabilityState}
            onChange={(event) =>
              setAvailabilityState(event.target.value as AvailabilityState)
            }
          >
            {availabilityStates.map((value) => (
              <option key={value} value={value}>
                {AVAILABILITY_LABEL[value]}
              </option>
            ))}
          </select>

          {offerClass === "stocked_product" ? (
            <>
              <label htmlFor="stock-note">Nota de existencias (opcional)</label>
              <input
                id="stock-note"
                name="stock_note"
                defaultValue={details.stock_note ?? ""}
                maxLength={500}
                placeholder="Ej. quedan pocas unidades; confirmar color"
              />
            </>
          ) : null}

          {offerClass === "scheduled_food" ? (
            <>
              <label htmlFor="window-start">Inicio de la ventana</label>
              <input
                id="window-start"
                name="window_start"
                type="datetime-local"
                defaultValue={localDateTime(details.starts_at)}
                required
              />
              <label htmlFor="window-end">Fin de la ventana</label>
              <input
                id="window-end"
                name="window_end"
                type="datetime-local"
                defaultValue={localDateTime(details.ends_at)}
                required
              />
              <label htmlFor="window-cutoff">Fecha de corte (opcional)</label>
              <input
                id="window-cutoff"
                name="window_cutoff"
                type="datetime-local"
                defaultValue={localDateTime(details.cutoff_at)}
              />
              <label htmlFor="capacity-note">Capacidad (opcional)</label>
              <input
                id="capacity-note"
                name="capacity_note"
                defaultValue={details.capacity_note ?? ""}
                maxLength={500}
                placeholder="Ej. cupo para 20 encargos"
              />
            </>
          ) : null}

          {(offerClass === "local_service" || offerClass === "digital_offer") &&
          availabilityState === "on_request" ? (
            <>
              <label htmlFor="requirements">Qué necesitás para responder</label>
              <textarea
                id="requirements"
                name="requirements"
                defaultValue={details.requirements ?? ""}
                maxLength={500}
                rows={3}
                required
                placeholder="Ej. alcance, fecha deseada y referencias"
              />
            </>
          ) : null}

          {(offerClass === "local_service" || offerClass === "digital_offer") &&
          availabilityState !== "on_request" ? (
            <>
              <label htmlFor="next-available-at">
                Próxima disponibilidad (opcional)
              </label>
              <input
                id="next-available-at"
                name="next_available_at"
                type="datetime-local"
                defaultValue={localDateTime(details.next_available_at)}
              />
              <label htmlFor="schedule-note">Nota de agenda</label>
              <input
                id="schedule-note"
                name="schedule_note"
                defaultValue={details.schedule_note ?? ""}
                maxLength={500}
                placeholder="Ej. lunes a viernes, horario a confirmar"
              />
              <p>Completá una fecha, una nota de agenda o ambas.</p>
            </>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>4. ¿Cómo puede recibirlo la persona?</legend>
          <p>Sólo aparecen opciones compatibles con esta clase de oferta.</p>
          {fulfillmentOptions.map(({ value, label }) => (
            <label key={value}>
              <input
                type="checkbox"
                name="fulfillment_modes"
                value={value}
                checked={fulfillments.includes(value)}
                onChange={(event) =>
                  toggleFulfillment(value, event.target.checked)
                }
              />
              {label}
            </label>
          ))}
          {fulfillments.length === 0 ? (
            <p role="alert">Elegí al menos una forma de cumplimiento.</p>
          ) : null}
        </fieldset>

        {offer ? (
          <>
            <input type="hidden" name="status" value={offer.status} />
            <label htmlFor="offer-image">
              Foto (opcional, máximo 4; hasta 3 MB cada una)
            </label>
            <input
              id="offer-image"
              name="image"
              type="file"
              accept="image/*"
              disabled={media.length >= 4}
            />
          </>
        ) : null}

        {error ? <p role="alert">{error}</p> : null}
        {notice ? <p role="status">{notice}</p> : null}

        {offer ? (
          <SubmitButton
            label="Guardar cambios"
            disabled={fulfillments.length === 0}
          />
        ) : (
          <p>
            <SubmitButton
              label="Guardar borrador"
              name="status"
              value="draft"
              disabled={fulfillments.length === 0}
            />{" "}
            <SubmitButton
              label="Crear y publicar"
              name="status"
              value="published"
              disabled={fulfillments.length === 0}
            />
          </p>
        )}
      </form>

      {offer ? (
        <section aria-labelledby="offer-maintenance-heading">
          <h2 id="offer-maintenance-heading">Mantenimiento</h2>
          <p>
            {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]} ·{" "}
            {offer.status}
          </p>
          <p>
            Confirmar vigencia actualiza la fecha sin afirmar una venta ni cambiar
            el contenido.
          </p>
          <form action={confirmOfferAction}>
            <input type="hidden" name="presence_id" value={presenceId} />
            <input type="hidden" name="offer_id" value={offer.id} />
            <SubmitButton label="Confirmar vigencia" />
          </form>
          <div>
            {offer.status !== "published" ? (
              <StatusButton
                presenceId={presenceId}
                offerId={offer.id}
                status="published"
                label="Publicar"
              />
            ) : null}
            {offer.status === "published" ? (
              <StatusButton
                presenceId={presenceId}
                offerId={offer.id}
                status="paused"
                label="Pausar"
              />
            ) : null}
            {offer.status === "paused" ? (
              <StatusButton
                presenceId={presenceId}
                offerId={offer.id}
                status="published"
                label="Volver a publicar"
              />
            ) : null}
            {offer.status !== "archived" ? (
              <StatusButton
                presenceId={presenceId}
                offerId={offer.id}
                status="archived"
                label="Archivar"
              />
            ) : (
              <StatusButton
                presenceId={presenceId}
                offerId={offer.id}
                status="draft"
                label="Sacar del archivo"
              />
            )}
          </div>
          {media.length > 0 ? (
            <ul className="offer-list">
              {media.map((item) => {
                const src = mediaPublicUrl(item.storage_path);
                return (
                  <li key={item.id}>
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.alt_text || "Foto de la oferta"} />
                    ) : null}
                    <form action={removeOfferImageAction}>
                      <input
                        type="hidden"
                        name="presence_id"
                        value={presenceId}
                      />
                      <input type="hidden" name="offer_id" value={offer.id} />
                      <input type="hidden" name="media_id" value={item.id} />
                      <SubmitButton
                        label={
                          item.deletion_pending
                            ? "Reintentar limpieza"
                            : "Quitar foto"
                        }
                      />
                    </form>
                    {item.deletion_pending ? (
                      <p role="status">
                        Esta foto no se publica mientras se completa la limpieza.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : (
        <p>Las fotos se agregan después de crear la oferta.</p>
      )}
    </div>
  );
}

function SubmitButton({
  label,
  name,
  value,
  disabled = false,
}: {
  label: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

function StatusButton({
  presenceId,
  offerId,
  status,
  label,
}: {
  presenceId: string;
  offerId: string;
  status: "draft" | "published" | "paused" | "archived";
  label: string;
}) {
  return (
    <form action={setOfferStatusAction} style={{ display: "inline" }}>
      <input type="hidden" name="presence_id" value={presenceId} />
      <input type="hidden" name="offer_id" value={offerId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton label={label} />
    </form>
  );
}

function availabilityStatesFor(offerClass: OfferClass): AvailabilityState[] {
  return offerClass === "stocked_product" || offerClass === "scheduled_food"
    ? ["available", "limited", "unavailable"]
    : ["available", "limited", "unavailable", "on_request"];
}

function unitPlaceholder(offerClass: OfferClass): string {
  if (offerClass === "stocked_product") return "Ej. unidad, libra, bolsa";
  if (offerClass === "scheduled_food") return "Ej. unidad, bandeja, docena";
  if (offerClass === "digital_offer") return "Ej. proyecto, mes, archivo";
  return "Ej. visita, hora, proyecto";
}

function localDateTime(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}T${valueOf("hour")}:${valueOf("minute")}`;
}
