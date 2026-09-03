import type { Metadata } from "next";
import Link from "next/link";
import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconMapPin,
} from "@tabler/icons-react";
import {
  deleteAccountAction,
  retryAccountDeletionAction,
} from "@/app/account-actions";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cuenta",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireSession("/cuenta");
  const initial = (user.email?.trim().charAt(0) || "P").toLocaleUpperCase("es-HN");
  const { data: deletionPending, error: deletionStatusError } =
    await supabase.rpc("account_deletion_pending");
  const cleanupPending = deletionStatusError ? true : deletionPending === true;
  return (
    <main className="detail-page account-page workspace-page">
      <p className="eyebrow">Tu espacio</p>
      <h1>Tu perfil</h1>
      <section className="account-profile" aria-label="Perfil de la cuenta">
        <span className="account-avatar" aria-hidden="true">{initial}</span>
        <div>
          <strong>{user.email}</strong>
          <p>
            Una sola cuenta para comprar, preparar solicitudes y administrar
            una pulpería.
          </p>
        </div>
      </section>
      <nav className="account-nav" aria-label="Opciones de cuenta">
        <Link href="/cuenta/solicitudes">
          <IconBrandWhatsapp aria-hidden="true" size={25} stroke={1.8} />
          <span>
            <strong>Pedidos para WhatsApp</strong>
            <small>Revisá los pedidos que armaste para cada vendedor.</small>
          </span>
        </Link>
        <Link href="/cuenta/ubicacion">
          <IconMapPin aria-hidden="true" size={25} stroke={1.8} />
          <span>
            <strong>Localidad</strong>
            <small>Elegí si querés recordar Siguatepeque sin guardar tu GPS.</small>
          </span>
        </Link>
        <Link href="/mi-pulperia">
          <IconBuildingStore aria-hidden="true" size={25} stroke={1.8} />
          <span>
            <strong>Mi pulpería</strong>
            <small>Volvé al perfil, las publicaciones y los ajustes del negocio.</small>
          </span>
        </Link>
      </nav>
      <details
        className="danger-zone"
        open={Boolean(query.error) || cleanupPending}
      >
        <summary id="delete-account-title">Eliminar cuenta</summary>
        <p>
          Esta acción elimina tu identidad, tus solicitudes y, si vendés, tu
          pulpería, ofertas e imágenes. No se puede deshacer.
        </p>
        {query.error ? (
          <p role="alert">
            {query.error === "confirmacion"
              ? "La confirmación debe decir BORRAR."
              : cleanupPending
                ? "La cuenta quedó cerrada al público, pero su limpieza todavía está pendiente. Reintentá para completarla."
                : "No se pudo iniciar la eliminación. Intentá de nuevo."}
          </p>
        ) : null}
        {cleanupPending ? (
          <form action={retryAccountDeletionAction} className="stacked-form">
            <p role="status">
              La pulpería y sus ofertas ya no son públicas. Falta completar la
              limpieza de archivos y borrar la identidad.
            </p>
            <button type="submit">Reintentar eliminación</button>
          </form>
        ) : (
          <form action={deleteAccountAction} className="stacked-form">
            <label>
              Escribí BORRAR para confirmar
              <input name="confirmation" autoComplete="off" required />
            </label>
            <button type="submit">Eliminar mi cuenta definitivamente</button>
          </form>
        )}
      </details>
    </main>
  );
}
