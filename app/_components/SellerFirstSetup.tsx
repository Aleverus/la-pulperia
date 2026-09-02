"use client";

import { useState } from "react";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { SellerFlowProgress } from "@/app/_components/SellerFlowProgress";
import { StarterOfferDraft } from "@/app/_components/StarterOfferDraft";

const FIRST_SETUP_STEPS = ["Tu oferta", "Tu negocio"] as const;

export function SellerFirstSetup({ error }: { error?: string }) {
  const [currentStep, setCurrentStep] = useState(error ? 1 : 0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(error ? 1 : 0);

  function goToBusiness() {
    setMaxVisitedStep(1);
    setCurrentStep(1);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#starter-business")?.focus();
    });
  }

  return (
    <div className="seller-first-setup">
      <SellerFlowProgress
        steps={FIRST_SETUP_STEPS}
        currentStep={currentStep}
        maxVisitedStep={maxVisitedStep}
        onStepChange={setCurrentStep}
      />
      {currentStep === 0 ? (
        <StarterOfferDraft onContinue={goToBusiness} />
      ) : (
        <section className="starter-business" aria-labelledby="starter-business">
          <p className="eyebrow">Paso 2 de 2</p>
          <h2 id="starter-business" tabIndex={-1}>
            Completá lo necesario para guardar la oferta
          </h2>
          <p>
            El modo de atención y el WhatsApp protegen la lectura pública. Una
            ubicación exacta se pide sólo si elegís un local fijo.
          </p>
          <button
            type="button"
            className="secondary-action seller-first-setup__back"
            onClick={() => setCurrentStep(0)}
          >
            Volver a la oferta
          </button>
          <PresenceForm presence={null} error={error} continueToOffer />
        </section>
      )}
    </div>
  );
}
