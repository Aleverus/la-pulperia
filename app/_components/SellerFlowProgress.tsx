"use client";

type SellerFlowProgressProps = {
  steps: readonly string[];
  currentStep: number;
  maxVisitedStep: number;
  onStepChange: (step: number) => void;
};

export function SellerFlowProgress({
  steps,
  currentStep,
  maxVisitedStep,
  onStepChange,
}: SellerFlowProgressProps) {
  return (
    <nav
      className={`seller-flow-progress is-${steps.length}`}
      aria-label="Progreso"
    >
      <p aria-live="polite">
        Paso {currentStep + 1} de {steps.length} · {steps[currentStep]}
      </p>
      <ol>
        {steps.map((label, index) => {
          const reachable = index <= maxVisitedStep;
          return (
            <li key={label}>
              <button
                type="button"
                className={index < currentStep ? "is-complete" : undefined}
                aria-current={index === currentStep ? "step" : undefined}
                disabled={!reachable}
                onClick={() => onStepChange(index)}
              >
                <span aria-hidden="true">{index + 1}</span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
