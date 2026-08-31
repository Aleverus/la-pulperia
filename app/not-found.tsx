import Link from "next/link";
import { IconMapPinOff } from "@tabler/icons-react";

export default function NotFound() {
  return (
    <main className="detail-page state-page">
      <IconMapPinOff className="state-page__icon" aria-hidden="true" size={54} stroke={1.5} />
      <p className="eyebrow">No encontramos ese puesto</p>
      <h1>Esta página no está disponible</h1>
      <p>
        Puede que la oferta haya cambiado, esté pausada o que el enlace ya no sea
        válido. El catálogo actualizado sigue disponible.
      </p>
      <div className="button-row">
        <Link className="primary-action" href="/buscar">
          Volver a buscar
        </Link>
        <Link className="secondary-action" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
