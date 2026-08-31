"use client";

import { useState } from "react";
import { markHandoffAction } from "@/app/actions";

export function HandoffButton(props: {
  sellerRequestId: string;
  sellerName: string;
  href: string;
}) {
  const [state, setState] = useState<"idle" | "opening" | "opened" | "failed">(
    "idle",
  );

  return (
    <div className="handoff-control">
      <a
        className="handoff-link"
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          setState("opening");
          void markHandoffAction(props.sellerRequestId)
            .then(() => setState("opened"))
            .catch(() => setState("failed"));
        }}
      >
        {state === "opening"
          ? "Abriendo WhatsApp…"
          : `Abrir WhatsApp de ${props.sellerName}`}
      </a>
      {state === "opened" ? (
        <p className="field-hint" role="status">
          Registramos la apertura. Revisá y enviá el mensaje en WhatsApp.
        </p>
      ) : null}
      {state === "failed" ? (
        <p className="field-hint is-error" role="alert">
          WhatsApp pudo abrirse, pero no pudimos registrar la apertura.
        </p>
      ) : null}
    </div>
  );
}
