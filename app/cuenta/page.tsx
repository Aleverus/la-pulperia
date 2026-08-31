import type { Metadata } from "next";
import Link from "next/link";
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
  const { data: deletionPending, error: deletionStatusError } =
    await supabase.rpc("account_deletion_pending");
  const cleanupPending = deletionStatusError ? true : deletionPending === true;
  return (
    <main>
      <h1>Cuenta</h1>
      <p>{user.email}</p>
      <nav className="account-nav" aria-label="Opciones de cuenta">
        <Link href="/cuenta/solicitudes">
          <strong>Pedidos para WhatsApp</strong>
          <span>Revisá los pedidos que armaste para cada vendedor.</span>
        </Link>
        <Link href="/cuenta/ubicacion">
          <strong>Localidad</strong>
          <span>Elegí si querés recordar Siguatepeque sin guardar tu GPS.</span>
        </Link>
      </nav>
      <section className="danger-zone" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title">Eliminar cuenta</h2>
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
      </section>
    </main>
  );
}
