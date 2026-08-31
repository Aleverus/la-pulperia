"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { recordPublicEventAction } from "@/app/operation-actions";
import type {
  AvailabilityDetails,
  AvailabilityState,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";
import { requestedWindowIssue } from "@/lib/offer-context";
import {
  MAX_SELECTION_QUANTITY,
  MIN_SELECTION_QUANTITY,
  isValidSelectionQuantity,
  parseSelection,
  SELECTION_CHANGE_EVENT,
  SELECTION_STORAGE_KEY,
  upsertSelection,
  type SelectionLine,
  type SelectionRequest,
} from "@/lib/selection";

type AddToSelectionProps = {
  offerId: string;
  offerClass: OfferClass;
  availabilityDetails: AvailabilityDetails;
  listedPriceCents: number | null;
  listedPriceMode: PriceMode;
  listedUnit: string | null;
  listedAvailabilityState: AvailabilityState;
  listedConfirmedAt: string;
  requestContextToken: string;
};

export function AddToSelection(props: AddToSelectionProps) {
  const rawSelection = useSyncExternalStore(
    subscribeToSelection,
    selectionSnapshot,
    serverSelectionSnapshot,
  );
  const ready = rawSelection !== null;
  const existingLine = useMemo(
    () =>
      rawSelection
        ? parseSelection(rawSelection).find(
            (line) => line.offerId === props.offerId,
          )
        : undefined,
    [props.offerId, rawSelection],
  );

  if (!ready) {
    return (
      <div className="selection-config">
        <button type="button" disabled>
          Preparando carrito…
        </button>
      </div>
    );
  }

  return <SelectionForm {...props} existingLine={existingLine} />;
}

function SelectionForm(
  props: AddToSelectionProps & { existingLine?: SelectionLine },
) {
  const { existingLine } = props;
  const inSelection = Boolean(existingLine);
  const initial = selectionRequestDraft(existingLine, props.offerClass);
  const [quantityInput, setQuantityInput] = useState(initial.quantityInput);
  const [scope, setScope] = useState(initial.scope);
  const [substitutionOk, setSubstitutionOk] = useState(
    initial.substitutionOk,
  );
  const [variant, setVariant] = useState(initial.variant);
  const [requestedWindowStart, setRequestedWindowStart] = useState(
    initial.requestedWindowStart,
  );
  const [requestedWindowEnd, setRequestedWindowEnd] = useState(
    initial.requestedWindowEnd,
  );
  const [appointmentPreference, setAppointmentPreference] = useState(
    initial.appointmentPreference,
  );
  const [approximateLocality, setApproximateLocality] = useState(
    initial.approximateLocality,
  );
  const [plan, setPlan] = useState(initial.plan);
  const [referenceUrl, setReferenceUrl] = useState(initial.referenceUrl);
  const [added, setAdded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const needsScope =
    props.offerClass === "local_service" || props.offerClass === "digital_offer";
  const quantity = Number(quantityInput);
  const quantityIssue =
    (props.offerClass === "stocked_product" ||
      props.offerClass === "scheduled_food") &&
    !isValidSelectionQuantity(quantity)
      ? `Usá una cantidad entre ${MIN_SELECTION_QUANTITY} y ${MAX_SELECTION_QUANTITY.toLocaleString("es-HN")}, con hasta tres decimales.`
      : null;
  const scopeIssue = needsScope && !scope.trim()
    ? "Contanos qué necesitás para poder agregar esta oferta."
    : null;
  const windowIssue =
    props.offerClass === "scheduled_food"
      ? requestedWindowIssue(
          props.availabilityDetails,
          tegucigalpaTimestamp(requestedWindowStart) ?? "",
          tegucigalpaTimestamp(requestedWindowEnd) ?? "",
        )
      : null;
  const referenceIssue =
    props.offerClass === "digital_offer" &&
    referenceUrl.trim() &&
    !isHttpUrl(referenceUrl.trim())
      ? "El enlace debe comenzar con http:// o https://."
      : null;
  const issue =
    quantityIssue ??
    scopeIssue ??
    windowIssueMessage(windowIssue) ??
    referenceIssue;
  const request = buildRequest(props.offerClass, props.availabilityDetails, {
    quantity,
    scope,
    substitutionOk,
    variant,
    requestedWindowStart,
    requestedWindowEnd,
    appointmentPreference,
    approximateLocality,
    plan,
    referenceUrl,
  });

  function add() {
    if (!request) {
      setShowErrors(true);
      return;
    }
    const lines = parseSelection(
      window.localStorage.getItem(SELECTION_STORAGE_KEY),
    );
    const next = upsertSelection(lines, {
      offerId: props.offerId,
      offerClass: props.offerClass,
      request,
      listedPriceCents: props.listedPriceCents,
      listedPriceMode: props.listedPriceMode,
      listedUnit: props.listedUnit,
      listedAvailabilityState: props.listedAvailabilityState,
      listedConfirmedAt: props.listedConfirmedAt,
      requestContextToken: props.requestContextToken,
    });
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SELECTION_CHANGE_EVENT));
    setAdded(true);
    void recordPublicEventAction("selection_add");
  }

  return (
    <div className="selection-config">
      {props.offerClass === "stocked_product" ||
      props.offerClass === "scheduled_food" ? (
        <label>
          Cantidad
          <input
            type="number"
            min={MIN_SELECTION_QUANTITY}
            max={MAX_SELECTION_QUANTITY}
            step={0.001}
            value={quantityInput}
            aria-invalid={showErrors && Boolean(quantityIssue)}
            aria-describedby="selection-request-help"
            onChange={(event) => {
              setQuantityInput(event.target.value);
              setAdded(false);
            }}
          />
        </label>
      ) : null}
      {props.offerClass === "stocked_product" ? (
        <label>
          <input
            type="checkbox"
            checked={substitutionOk}
            onChange={(event) => {
              setSubstitutionOk(event.target.checked);
              setAdded(false);
            }}
          />
          Acepto que me propongan un sustituto
        </label>
      ) : null}
      {props.offerClass === "scheduled_food" ? (
        <>
          <label>
            Inicio que necesitás
            <input
              type="datetime-local"
              min={localDateTimeInput(props.availabilityDetails.starts_at)}
              max={localDateTimeInput(props.availabilityDetails.ends_at)}
              value={requestedWindowStart}
              aria-invalid={showErrors && Boolean(windowIssue)}
              aria-describedby="selection-request-help"
              onInput={(event) => {
                setRequestedWindowStart(event.currentTarget.value);
                setAdded(false);
              }}
              required
            />
          </label>
          <label>
            Fin que necesitás
            <input
              type="datetime-local"
              min={localDateTimeInput(props.availabilityDetails.starts_at)}
              max={localDateTimeInput(props.availabilityDetails.ends_at)}
              value={requestedWindowEnd}
              aria-invalid={showErrors && Boolean(windowIssue)}
              aria-describedby="selection-request-help"
              onInput={(event) => {
                setRequestedWindowEnd(event.currentTarget.value);
                setAdded(false);
              }}
              required
            />
          </label>
          <label>
            Variante o detalle (opcional)
            <input
              value={variant}
              onChange={(event) => {
                setVariant(event.target.value);
                setAdded(false);
              }}
              maxLength={120}
            />
          </label>
          <p>Elegí una subventana dentro del horario publicado.</p>
        </>
      ) : null}
      {needsScope ? (
        <label>
          Qué necesitás
          <textarea
            value={scope}
            aria-invalid={showErrors && Boolean(scopeIssue)}
            aria-describedby="selection-request-help"
            onChange={(event) => {
              setScope(event.target.value);
              setAdded(false);
            }}
            maxLength={1000}
            required
          />
        </label>
      ) : null}
      {props.offerClass === "local_service" ? (
        <>
          <label>
            Preferencia de cita (opcional)
            <input
              value={appointmentPreference}
              onChange={(event) => {
                setAppointmentPreference(event.target.value);
                setAdded(false);
              }}
              maxLength={240}
            />
          </label>
          <label>
            Zona aproximada (opcional)
            <input
              value={approximateLocality}
              onChange={(event) => {
                setApproximateLocality(event.target.value);
                setAdded(false);
              }}
              maxLength={80}
            />
          </label>
        </>
      ) : null}
      {props.offerClass === "digital_offer" ? (
        <>
          <label>
            Plan o formato (opcional)
            <input
              value={plan}
              onChange={(event) => {
                setPlan(event.target.value);
                setAdded(false);
              }}
              maxLength={120}
            />
          </label>
          <label>
            Enlace de referencia (opcional)
            <input
              type="url"
              value={referenceUrl}
              aria-invalid={showErrors && Boolean(referenceIssue)}
              aria-describedby="selection-request-help"
              onChange={(event) => {
                setReferenceUrl(event.target.value);
                setAdded(false);
              }}
              maxLength={500}
              placeholder="https://"
            />
          </label>
        </>
      ) : null}
      <p
        id="selection-request-help"
        className={issue && showErrors ? "field-hint is-error" : "field-hint"}
        aria-live="polite"
      >
        {issue ??
          (inSelection
            ? "Esta oferta ya está en tu carrito; podés actualizar sus datos."
            : "Podés revisar y cambiar estos datos antes de abrir WhatsApp.")}
      </p>
      <button
        type="button"
        onClick={add}
        aria-describedby="selection-request-help"
      >
        {added
          ? "En el carrito"
          : inSelection
            ? "Actualizar carrito"
            : "Agregar al carrito"}
      </button>
    </div>
  );
}

function selectionRequestDraft(
  existingLine: SelectionLine | undefined,
  offerClass: OfferClass,
) {
  const empty = {
    quantityInput: "1",
    scope: "",
    substitutionOk: false,
    variant: "",
    requestedWindowStart: "",
    requestedWindowEnd: "",
    appointmentPreference: "",
    approximateLocality: "",
    plan: "",
    referenceUrl: "",
  };
  if (!existingLine || existingLine.offerClass !== offerClass) return empty;

  if (offerClass === "stocked_product") {
    const request = existingLine.request as {
      quantity: number;
      substitution_ok?: boolean;
    };
    return {
      ...empty,
      quantityInput: String(request.quantity),
      substitutionOk: Boolean(request.substitution_ok),
    };
  }
  if (offerClass === "scheduled_food") {
    const request = existingLine.request as {
      quantity: number;
      variant?: string;
      requested_window_start: string;
      requested_window_end: string;
    };
    return {
      ...empty,
      quantityInput: String(request.quantity),
      variant: request.variant ?? "",
      requestedWindowStart: localDateTimeInput(request.requested_window_start),
      requestedWindowEnd: localDateTimeInput(request.requested_window_end),
    };
  }
  if (offerClass === "local_service") {
    const request = existingLine.request as {
      scope: string;
      appointment_preference?: string;
      approximate_locality?: string;
    };
    return {
      ...empty,
      scope: request.scope,
      appointmentPreference: request.appointment_preference ?? "",
      approximateLocality: request.approximate_locality ?? "",
    };
  }
  const request = existingLine.request as {
    scope: string;
    plan?: string;
    reference_url?: string;
  };
  return {
    ...empty,
    scope: request.scope,
    plan: request.plan ?? "",
    referenceUrl: request.reference_url ?? "",
  };
}

function buildRequest(
  offerClass: OfferClass,
  details: AvailabilityDetails,
  input: {
    quantity: number;
    scope: string;
    substitutionOk: boolean;
    variant: string;
    requestedWindowStart: string;
    requestedWindowEnd: string;
    appointmentPreference: string;
    approximateLocality: string;
    plan: string;
    referenceUrl: string;
  },
): SelectionRequest | null {
  if (!isValidSelectionQuantity(input.quantity)) return null;
  if (offerClass === "stocked_product") {
    return {
      quantity: input.quantity,
      substitution_ok: input.substitutionOk,
    };
  }
  if (offerClass === "scheduled_food") {
    const requestedStart = tegucigalpaTimestamp(input.requestedWindowStart);
    const requestedEnd = tegucigalpaTimestamp(input.requestedWindowEnd);
    if (
      !requestedStart ||
      !requestedEnd ||
      requestedWindowIssue(details, requestedStart, requestedEnd) !== null
    ) {
      return null;
    }
    const variant = input.variant.trim();
    return {
      quantity: input.quantity,
      ...(variant ? { variant } : {}),
      requested_window_start: requestedStart,
      requested_window_end: requestedEnd,
    };
  }
  const scope = input.scope.trim();
  if (!scope) return null;
  if (offerClass === "local_service") {
    const appointmentPreference = input.appointmentPreference.trim();
    const approximateLocality = input.approximateLocality.trim();
    return {
      scope,
      ...(appointmentPreference
        ? { appointment_preference: appointmentPreference }
        : {}),
      ...(approximateLocality
        ? { approximate_locality: approximateLocality }
        : {}),
    };
  }
  const plan = input.plan.trim();
  const referenceUrl = input.referenceUrl.trim();
  if (referenceUrl && !isHttpUrl(referenceUrl)) return null;
  return {
    scope,
    ...(plan ? { plan } : {}),
    ...(referenceUrl ? { reference_url: referenceUrl } : {}),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function tegucigalpaTimestamp(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-06:00`
    : null;
}

function localDateTimeInput(value: string | undefined): string {
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
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function windowIssueMessage(
  issue: ReturnType<typeof requestedWindowIssue>,
): string | null {
  if (issue === "missing") return "Elegí el inicio y el fin que necesitás.";
  if (issue === "invalid") return "Revisá el inicio y el fin de la ventana.";
  if (issue === "closed") return "La ventana publicada ya cerró para pedidos.";
  if (issue === "outside") {
    return "La hora elegida debe quedar dentro de la ventana publicada y terminar después de comenzar.";
  }
  return null;
}

function subscribeToSelection(onStoreChange: () => void) {
  window.addEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function selectionSnapshot(): string {
  return window.localStorage.getItem(SELECTION_STORAGE_KEY) ?? "";
}

function serverSelectionSnapshot(): null {
  return null;
}
