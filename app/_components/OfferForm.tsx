"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { SellerFlowProgress } from "@/app/_components/SellerFlowProgress";
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
import { OFFER_STATUS_LABEL, type OwnedMedia, type OwnedOffer } from "@/lib/seller";
import {
  parseStarterOfferDraft,
  starterOfferDraftFromForm,
  type StarterOfferDraft,
} from "@/lib/starter-offer-draft";
import {
  clearStarterOfferDraft,
  useStarterOfferDraftStorage,
  writeStarterOfferDraft,
} from "@/lib/starter-offer-draft-store";

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

const OFFER_FLOW_STEPS = [
  "Tipo",
  "Lo esencial",
  "Disponibilidad",
  "Entrega",
  "Revisión",
] as const;

type OfferFormProps = {
  presenceId: string;
  offer: OwnedOffer | null;
  media: OwnedMedia[];
  error?: string;
  notice?: string;
  resumeStarterDraft?: boolean;
  clearStarterDraft?: boolean;
  defaultOfferClass?: OfferClass;
};

export function OfferForm(props: OfferFormProps) {
  const storedDraft = useStarterOfferDraftStorage();
  const starterDraft = useMemo(
    () => parseStoredDraft(storedDraft),
    [storedDraft],
  );

  useEffect(() => {
    if (props.clearStarterDraft) {
      clearStarterOfferDraft();
    }
  }, [props.clearStarterDraft]);

  return (
    <OfferFormFields
      key={
        props.resumeStarterDraft
          ? storedDraft
            ? "starter-loaded"
            : "starter-empty"
          : "regular"
      }
      {...props}
      starterDraft={props.resumeStarterDraft ? starterDraft : null}
      persistStarterDraft={Boolean(props.resumeStarterDraft)}
    />
  );
}

function OfferFormFields({
  presenceId,
  offer,
  media,
  error,
  notice,
  defaultOfferClass,
  starterDraft,
  persistStarterDraft,
}: OfferFormProps & {
  starterDraft: StarterOfferDraft | null;
  persistStarterDraft: boolean;
}) {
  const details = offer?.availability_details ?? {};
  const [offerClass, setOfferClass] = useState<OfferClass>(
    offer?.offer_class ??
      starterDraft?.offerClass ??
      defaultOfferClass ??
      "stocked_product",
  );
  const [priceMode, setPriceMode] = useState<PriceMode>(
    offer?.price_mode ?? starterDraft?.priceMode ?? "fixed",
  );
  const [availabilityState, setAvailabilityState] =
    useState<AvailabilityState>(
      offer?.availability_state ??
        starterDraft?.availabilityState ??
        "available",
    );
  const [fulfillments, setFulfillments] = useState<FulfillmentMode[]>(
    offer?.fulfillment_modes.length
      ? offer.fulfillment_modes
      : starterDraft?.fulfillments ?? [],
  );
  const [preview, setPreview] = useState({
    title: offer?.title ?? starterDraft?.title ?? "Tu oferta",
    description:
      offer?.description ??
      starterDraft?.description ??
      "Explicá lo esencial para quien busca.",
    price:
      offer?.price_cents === null || offer?.price_cents === undefined
        ? starterDraft?.price ?? ""
        : (offer.price_cents / 100).toFixed(2),
    unit: offer?.unit ?? starterDraft?.unit ?? "",
  });
  const [currentStep, setCurrentStep] = useState(error ? 4 : 0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(error ? 4 : 0);
  const maintenanceStartedAtRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    setMaxVisitedStep(0);
    if (!availabilityStatesFor(next).includes(availabilityState)) {
      setAvailabilityState("available");
    }
    setFulfillments([]);
  }

  function toggleFulfillment(mode: FulfillmentMode, checked: boolean) {
    setFulfillments((current) =>
      checked
        ? Array.from(new Set([...current, mode]))
        : current.filter((item) => item !== mode),
    );
  }

  function storeStarterDraft(event: FormEvent<HTMLFormElement>) {
    if (!persistStarterDraft) return;
    const draft = starterOfferDraftFromForm(new FormData(event.currentTarget));
    writeStarterOfferDraft(draft);
  }

  function goToStep(step: number) {
    setCurrentStep(step);
    requestAnimationFrame(() => {
      const panel = formRef.current?.querySelector<HTMLElement>(
        `[data-offer-step="${step}"]`,
      );
      panel?.scrollIntoView?.({ block: "start", behavior: "auto" });
      panel?.focus({ preventScroll: true });
    });
  }

  function continueFromStep() {
    const panel = formRef.current?.querySelector<HTMLElement>(
      `[data-offer-step="${currentStep}"]`,
    );
    const controls = Array.from(
      panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ) ?? [],
    );
    const invalid = controls.find((control) => !control.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    if (currentStep === 3 && fulfillments.length === 0) return;
    const next = Math.min(currentStep + 1, OFFER_FLOW_STEPS.length - 1);
    setMaxVisitedStep((visited) => Math.max(visited, next));
    goToStep(next);
  }

  return (
    <div className="stack">
      {offer ? (
        <OfferMaintenancePanel
          presenceId={presenceId}
          offer={offer}
          notice={notice}
        />
      ) : null}
      <form
        action={saveOfferAction}
        className="stack seller-offer-flow"
        onInput={storeStarterDraft}
        onChange={storeStarterDraft}
        ref={formRef}
      >
        <input type="hidden" name="presence_id" value={presenceId} />
        <input type="hidden" name="offer_id" value={offer?.id ?? ""} />
        <input
          type="hidden"
          name="starter_draft"
          value={persistStarterDraft ? "1" : ""}
        />
        <input
          type="hidden"
          name="maintenance_started_at_ms"
          ref={maintenanceStartedAtRef}
        />

        <SellerFlowProgress
          steps={OFFER_FLOW_STEPS}
          currentStep={currentStep}
          maxVisitedStep={maxVisitedStep}
          onStepChange={goToStep}
        />

        <fieldset
          className="seller-flow-panel"
          data-offer-step="0"
          hidden={currentStep !== 0}
          tabIndex={-1}
        >
          <legend>¿Qué ofrecés?</legend>
          {(
            [
              "stocked_product",
              "scheduled_food",
              "local_service",
              "digital_offer",
            ] as OfferClass[]
          ).map((value) => (
            <label key={value} className="offer-class-choice">
              <input
                type="radio"
                name="offer_class"
                value={value}
                checked={offerClass === value}
                onChange={() => changeClass(value)}
              />
              <span>
                <strong>{OFFER_CLASS_LABEL[value]}</strong>
                <small>{CLASS_HELP[value]}</small>
              </span>
            </label>
          ))}
          <FlowNextButton onClick={continueFromStep} />
        </fieldset>

        <fieldset
          className="seller-flow-panel"
          data-offer-step="1"
          hidden={currentStep !== 1}
          tabIndex={-1}
        >
          <legend>Contá lo esencial</legend>
          <label htmlFor="offer-title">Título</label>
          <input
            id="offer-title"
            name="title"
            defaultValue={offer?.title ?? starterDraft?.title ?? ""}
            onChange={(event) =>
              setPreview((current) => ({
                ...current,
                title: event.target.value || "Tu oferta",
              }))
            }
            required
            maxLength={120}
          />

          <label htmlFor="offer-description">Descripción</label>
          <textarea
            id="offer-description"
            name="description"
            defaultValue={offer?.description ?? starterDraft?.description ?? ""}
            onChange={(event) =>
              setPreview((current) => ({
                ...current,
                description:
                  event.target.value || "Explicá lo esencial para quien busca.",
              }))
            }
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
                  offer
                    ? offer.price_cents === null
                      ? ""
                      : (offer.price_cents / 100).toFixed(2)
                    : starterDraft?.price ?? ""
                }
                onChange={(event) =>
                  setPreview((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
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
            defaultValue={offer?.unit ?? starterDraft?.unit ?? ""}
            onChange={(event) =>
              setPreview((current) => ({
                ...current,
                unit: event.target.value,
              }))
            }
            required={
              offerClass === "stocked_product" || offerClass === "scheduled_food"
            }
            maxLength={40}
            placeholder={unitPlaceholder(offerClass)}
          />
          <FlowNavigation
            onBack={() => goToStep(0)}
            onNext={continueFromStep}
          />
        </fieldset>

        <fieldset
          className="seller-flow-panel"
          data-offer-step="2"
          hidden={currentStep !== 2}
          tabIndex={-1}
        >
          <legend>¿Cuándo está disponible?</legend>
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
                defaultValue={details.stock_note ?? starterDraft?.stockNote ?? ""}
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
                defaultValue={
                  localDateTime(details.starts_at) || starterDraft?.windowStart || ""
                }
                required
              />
              <label htmlFor="window-end">Fin de la ventana</label>
              <input
                id="window-end"
                name="window_end"
                type="datetime-local"
                defaultValue={
                  localDateTime(details.ends_at) || starterDraft?.windowEnd || ""
                }
                required
              />
              <label htmlFor="window-cutoff">Fecha de corte (opcional)</label>
              <input
                id="window-cutoff"
                name="window_cutoff"
                type="datetime-local"
                defaultValue={
                  localDateTime(details.cutoff_at) || starterDraft?.windowCutoff || ""
                }
              />
              <label htmlFor="capacity-note">Capacidad (opcional)</label>
              <input
                id="capacity-note"
                name="capacity_note"
                defaultValue={
                  details.capacity_note ?? starterDraft?.capacityNote ?? ""
                }
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
                defaultValue={details.requirements ?? starterDraft?.requirements ?? ""}
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
                defaultValue={
                  localDateTime(details.next_available_at) ||
                  starterDraft?.nextAvailableAt ||
                  ""
                }
              />
              <label htmlFor="schedule-note">Nota de agenda</label>
              <input
                id="schedule-note"
                name="schedule_note"
                defaultValue={details.schedule_note ?? starterDraft?.scheduleNote ?? ""}
                maxLength={500}
                placeholder="Ej. lunes a viernes, horario a confirmar"
              />
              <p>Completá una fecha, una nota de agenda o ambas.</p>
            </>
          ) : null}
          <FlowNavigation
            onBack={() => goToStep(1)}
            onNext={continueFromStep}
          />
        </fieldset>

        <fieldset
          className="seller-flow-panel"
          data-offer-step="3"
          hidden={currentStep !== 3}
          tabIndex={-1}
        >
          <legend>¿Cómo puede recibirlo la persona?</legend>
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
            <p className="field-hint" role="status">
              Elegí al menos una forma de entrega para continuar.
            </p>
          ) : null}
          <FlowNavigation
            onBack={() => goToStep(2)}
            onNext={continueFromStep}
            nextDisabled={fulfillments.length === 0}
          />
        </fieldset>

        <section
          className="seller-flow-panel seller-flow-review"
          data-offer-step="4"
          hidden={currentStep !== 4}
          tabIndex={-1}
          aria-labelledby="offer-review-title"
        >
          <div>
            <p className="eyebrow">Último paso</p>
            <h2 id="offer-review-title">Revisá antes de guardar</h2>
            <p>
              Comprobá cómo se entenderá la oferta. Podés volver a cualquier
              paso sin perder lo escrito.
            </p>
          </div>

          <OfferPublicPreview
            offerClass={offerClass}
            availabilityState={availabilityState}
            fulfillments={fulfillments}
            priceMode={priceMode}
            preview={preview}
          />

          <div>
            {offer ? (
              <input type="hidden" name="status" value={offer.status} />
            ) : null}
            <label htmlFor="offer-image">
              {offer
                ? "Agregar foto (opcional, máximo 4; hasta 3 MB cada una)"
                : "Primera foto (opcional, hasta 3 MB)"}
            </label>
            <input
              id="offer-image"
              name="image"
              type="file"
              accept="image/*"
              disabled={Boolean(offer && media.length >= 4)}
            />
            <p className="field-hint">
              Si no agregás una, La Pulpería muestra la señal visual honesta de
              la clase de oferta. Podés sumar más fotos después.
            </p>
          </div>

          {error ? <p role="alert">{error}</p> : null}
          <div className="seller-flow-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() => goToStep(3)}
            >
              Volver
            </button>
            {offer ? (
              <SubmitButton
                label="Guardar cambios"
                disabled={fulfillments.length === 0}
              />
            ) : (
              <div className="offer-submit-actions">
                <p>
                  Guardar borrador mantiene la oferta privada. Publicar la hace
                  visible sólo si el negocio ya cumple los requisitos públicos.
                </p>
                <SubmitButton
                  label="Guardar borrador"
                  name="status"
                  value="draft"
                  disabled={fulfillments.length === 0}
                />
                <SubmitButton
                  label="Crear y publicar"
                  name="status"
                  value="published"
                  disabled={fulfillments.length === 0}
                />
              </div>
            )}
          </div>
        </section>
      </form>

      {offer ? (
        <section className="offer-media" aria-labelledby="offer-media-heading">
          <div>
            <p className="eyebrow">Material visual</p>
            <h2 id="offer-media-heading">Fotos de la oferta</h2>
            <p>Son opcionales. Si no agregás una, La Pulpería usa la señal visual de la clase de oferta.</p>
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
      ) : null}
    </div>
  );
}

function FlowNextButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="seller-flow-actions">
      <button type="button" onClick={onClick}>
        Continuar
      </button>
    </div>
  );
}

function FlowNavigation({
  onBack,
  onNext,
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="seller-flow-actions">
      <button type="button" className="secondary-action" onClick={onBack}>
        Volver
      </button>
      <button type="button" onClick={onNext} disabled={nextDisabled}>
        Continuar
      </button>
    </div>
  );
}

function parseStoredDraft(raw: string | null): StarterOfferDraft | null {
  if (!raw) return null;
  try {
    return parseStarterOfferDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

function OfferMaintenancePanel({
  presenceId,
  offer,
  notice,
}: {
  presenceId: string;
  offer: OwnedOffer;
  notice?: string;
}) {
  const freshness = freshnessBand(new Date(offer.confirmed_at));
  return (
    <section className="offer-maintenance" aria-labelledby="offer-maintenance-heading">
      <div>
        <p className="eyebrow">Estado de la oferta</p>
        <h2 id="offer-maintenance-heading">Mantenimiento</h2>
        <p>
          <span className={`status-badge is-${offer.status}`}>
            {OFFER_STATUS_LABEL[offer.status]}
          </span>{" "}
          {FRESHNESS_LABEL[freshness]}
        </p>
        <p>
          Reconfirmar actualiza vigencia sin cambiar precio, contenido ni afirmar una venta.
        </p>
      </div>
      <div className="offer-maintenance__actions">
        <form action={confirmOfferAction}>
          <input type="hidden" name="presence_id" value={presenceId} />
          <input type="hidden" name="offer_id" value={offer.id} />
          <SubmitButton label="Confirmar vigencia" />
        </form>
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
            className="secondary-action"
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
            className="quiet-action"
          />
        ) : (
          <StatusButton
            presenceId={presenceId}
            offerId={offer.id}
            status="draft"
            label="Sacar del archivo"
            className="secondary-action"
          />
        )}
      </div>
      {notice ? <p role="status">{notice}</p> : null}
    </section>
  );
}

function OfferPublicPreview({
  offerClass,
  availabilityState,
  fulfillments,
  priceMode,
  preview,
}: {
  offerClass: OfferClass;
  availabilityState: AvailabilityState;
  fulfillments: FulfillmentMode[];
  priceMode: PriceMode;
  preview: { title: string; description: string; price: string; unit: string };
}) {
  const price =
    priceMode === "quote"
      ? "Cotización"
      : `${priceMode === "from" ? "desde " : ""}${preview.price ? `L ${preview.price}` : "Precio por indicar"}${preview.unit ? ` / ${preview.unit}` : ""}`;
  return (
    <aside className="offer-public-preview" aria-live="polite">
      <div>
        <p className="eyebrow">Antes de publicar</p>
        <h2>Así se entenderá al buscar</h2>
      </div>
      <p className="offer-public-preview__class">{OFFER_CLASS_LABEL[offerClass]}</p>
      <strong>{preview.title}</strong>
      <p>{preview.description}</p>
      <dl>
        <div>
          <dt>Precio</dt>
          <dd>{price}</dd>
        </div>
        <div>
          <dt>Disponibilidad</dt>
          <dd>{AVAILABILITY_LABEL[availabilityState]}</dd>
        </div>
        <div>
          <dt>Cómo atenderás</dt>
          <dd>
            {fulfillments.length
              ? fulfillments
                  .map(
                    (mode) =>
                      FULFILLMENT_OPTIONS.find((option) => option.value === mode)
                        ?.label,
                  )
                  .filter(Boolean)
                  .join(", ")
              : "Elegí una forma de entrega"}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function SubmitButton({
  label,
  name,
  value,
  disabled = false,
  className,
}: {
  label: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      className={className}
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
  className,
}: {
  presenceId: string;
  offerId: string;
  status: "draft" | "published" | "paused" | "archived";
  label: string;
  className?: string;
}) {
  return (
    <form action={setOfferStatusAction} style={{ display: "inline" }}>
      <input type="hidden" name="presence_id" value={presenceId} />
      <input type="hidden" name="offer_id" value={offerId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton label={label} className={className} />
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
