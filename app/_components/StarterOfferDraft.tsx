"use client";

import { useMemo } from "react";
import type { OfferClass } from "@/lib/catalog";
import { OFFER_CLASS_LABEL } from "@/lib/catalog";
import {
  emptyStarterOfferDraft,
  parseStarterOfferDraft,
  type StarterOfferDraft,
} from "@/lib/starter-offer-draft";
import {
  useStarterOfferDraftStorage,
  writeStarterOfferDraft,
} from "@/lib/starter-offer-draft-store";

const CLASS_HELP: Record<OfferClass, string> = {
  stocked_product: "Algo que vendés por cantidad y podés confirmar.",
  scheduled_food: "Comida o encargo para una ventana concreta.",
  local_service: "Trabajo local que cotizás o agendás.",
  digital_offer: "Algo que atendés o entregás de forma digital.",
};

export function StarterOfferDraft() {
  const storedDraft = useStarterOfferDraftStorage();
  const draft = useMemo(
    () => readDraft(storedDraft),
    [storedDraft],
  );
  const saved = Boolean(draft.title.trim());

  function update(next: Partial<StarterOfferDraft>) {
    writeStarterOfferDraft({ ...draft, ...next });
  }

  return (
    <section className="starter-offer" aria-labelledby="starter-offer-title">
      <p className="eyebrow">Paso 1 de 2</p>
      <h2 id="starter-offer-title">Empezá por lo que ofrecés</h2>
      <p>
        Esto queda privado en este dispositivo. No aparece en búsquedas ni
        comparte contacto mientras no completes y publiques la oferta.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          update(draft);
          document.querySelector<HTMLElement>("#starter-business")?.focus();
        }}
      >
        <fieldset>
          <legend>¿Qué tipo de oferta querés iniciar?</legend>
          {(
            [
              "stocked_product",
              "scheduled_food",
              "local_service",
              "digital_offer",
            ] as OfferClass[]
          ).map((offerClass) => (
            <label key={offerClass} className="offer-class-choice">
              <input
                type="radio"
                name="starter_offer_class"
                value={offerClass}
                checked={draft.offerClass === offerClass}
                onChange={() => update({ offerClass })}
              />
              <span>
                <strong>{OFFER_CLASS_LABEL[offerClass]}</strong>
                <small>{CLASS_HELP[offerClass]}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <label htmlFor="starter-offer-name">¿Qué ofrecés?</label>
        <input
          id="starter-offer-name"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          required
          maxLength={120}
          placeholder="Ej. reparación de licuadoras"
        />
        <label htmlFor="starter-offer-description">
          ¿Qué necesita saber alguien para decidir? (opcional por ahora)
        </label>
        <textarea
          id="starter-offer-description"
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          maxLength={4000}
          rows={3}
          placeholder="Explicá lo esencial; podés completar los detalles después."
        />
        <button type="submit">Guardar y seguir con el negocio</button>
        <p className="field-hint" role="status" aria-live="polite">
          {saved
            ? "Borrador privado guardado. Podés salir y retomarlo desde este dispositivo."
            : "Se guarda automáticamente cuando empezás a escribir."}
        </p>
      </form>
    </section>
  );
}

function readDraft(raw: string | null): StarterOfferDraft {
  if (!raw) return emptyStarterOfferDraft();
  try {
    return parseStarterOfferDraft(JSON.parse(raw)) ?? emptyStarterOfferDraft();
  } catch {
    return emptyStarterOfferDraft();
  }
}
