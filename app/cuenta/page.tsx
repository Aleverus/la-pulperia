import type { Metadata } from "next";
import Link from "next/link";
import { deleteAccountAction } from "@/app/account-actions";
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
  const { user } = await requireSession("/cuenta");
  return (
    <main>
      <h1>Cuenta</h1>
      <p>{user.email}</p>
      <nav className="account-nav" aria-label="Opciones de cuenta">
        <Link href="/cuenta/solicitudes">
          <strong>Solicitudes</strong>
          <span>Revisá los WhatsApp que preparaste por vendedor.</span>
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
            No se pudo eliminar la cuenta. Revisá la confirmación o intentá de nuevo.
          </p>
        ) : null}
        <form action={deleteAccountAction} className="stacked-form">
          <label>
            Escribí BORRAR para confirmar
            <input name="confirmation" autoComplete="off" required />
          </label>
          <button type="submit">Eliminar mi cuenta definitivamente</button>
        </form>
      </section>
    </main>
  );
}
