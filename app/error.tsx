"use client";

import Link from "next/link";
import { IconRefresh, IconToolsKitchen3 } from "@tabler/icons-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="detail-page state-page">
      <IconToolsKitchen3 className="state-page__icon" aria-hidden="true" size={54} stroke={1.5} />
      <p className="eyebrow">Algo se cayó del estante</p>
      <h1>No pudimos mostrar esta página</h1>
      <p>
        Tus datos no se borraron. Probá de nuevo; si el problema continúa, volvé
        al catálogo y retomá desde ahí.
      </p>
      <div className="button-row">
        <button type="button" onClick={reset}>
          <IconRefresh aria-hidden="true" size={18} stroke={1.9} />
          Intentar de nuevo
        </button>
        <Link className="secondary-action" href="/buscar">
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
