import type { Metadata } from "next";
import Link from "next/link";
import {
  IconChevronRight,
  IconClipboardList,
  IconBuildingStore,
  IconMapPin,
} from "@tabler/icons-react";
import { AccountProfileSettings } from "@/app/_components/AccountProfileSettings";
import {
  deleteAccountAction,
  retryAccountDeletionAction,
} from "@/app/account-actions";
import { mediaPublicUrl } from "@/lib/media-url";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cuenta",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; perfil?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireSession("/cuenta");
  const [deletionResult, profileResult, mediaResult] = await Promise.all([
    supabase.rpc("account_deletion_pending"),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("offer_media")
      .select("id, storage_path, alt_text")
      .eq("deletion_pending", false)
      .order("created_at", { ascending: false }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const profile = profileResult.data;
  const initial = (profile.display_name.trim().charAt(0) || "P").toLocaleUpperCase("es-HN");
  const media = (mediaResult.data ?? []).flatMap((item) => {
    const src = mediaPublicUrl(item.storage_path);
    return src
      ? [{
          id: item.id,
          storagePath: item.storage_path,
          src,
          alt: item.alt_text,
        }]
      : [];
  });
  const selectedAvatarPath = media.some(
    (item) => item.storagePath === profile.avatar_url,
  )
    ? profile.avatar_url
    : null;
  const avatarSrc = selectedAvatarPath
    ? mediaPublicUrl(selectedAvatarPath)
    : null;
  const deletionPending = deletionResult.data;
  const deletionStatusError = deletionResult.error;
  const cleanupPending = deletionStatusError ? true : deletionPending === true;
  return (
    <main className="detail-page account-page workspace-page">
      <header className="account-page__heading">
        <p className="eyebrow">Tu espacio</p>
        <h1>Cuenta</h1>
        <p className="lede">
          Manejá tu perfil y las configuraciones importantes desde un solo lugar.
        </p>
      </header>

      {query.perfil === "guardado" ? (
        <p role="status">Tu perfil quedó actualizado.</p>
      ) : null}
      {query.error === "perfil" || query.error === "foto" ? (
        <p role="alert">
          {query.error === "foto"
            ? "Esa imagen ya no está disponible en tus publicaciones. Elegí otra."
            : "No pudimos guardar el perfil. Revisá el nombre e intentá de nuevo."}
        </p>
      ) : null}

      <AccountProfileSettings
        email={user.email ?? "Cuenta de La Pulpería"}
        displayName={profile.display_name}
        initial={initial}
        avatarSrc={avatarSrc}
        selectedAvatarPath={selectedAvatarPath}
        media={media}
      />

      <section className="account-settings" aria-labelledby="account-settings-title">
        <div>
          <p className="eyebrow">Configuración</p>
          <h2 id="account-settings-title">Ajustes de la cuenta</h2>
        </div>
        <nav className="account-nav" aria-label="Configuraciones importantes">
          <Link href="/cuenta/solicitudes">
            <span className="account-nav__icon" aria-hidden="true">
              <IconClipboardList size={25} stroke={1.8} />
            </span>
            <span>
              <strong>Mis pedidos</strong>
              <small>Revisá lo que preparaste para cada vendedor antes de continuar por WhatsApp.</small>
            </span>
            <IconChevronRight className="account-nav__chevron" aria-hidden="true" size={21} />
          </Link>
          <Link href="/cuenta/ubicacion">
            <span className="account-nav__icon" aria-hidden="true">
              <IconMapPin size={25} stroke={1.8} />
            </span>
            <span>
              <strong>Localidad</strong>
              <small>Recordá Siguatepeque sin guardar tu ubicación exacta.</small>
            </span>
            <IconChevronRight className="account-nav__chevron" aria-hidden="true" size={21} />
          </Link>
          <Link href="/mi-pulperia">
            <span className="account-nav__icon" aria-hidden="true">
              <IconBuildingStore size={25} stroke={1.8} />
            </span>
            <span>
              <strong>Mi pulpería</strong>
              <small>Administrá el perfil, las publicaciones y los ajustes de tu negocio.</small>
            </span>
            <IconChevronRight className="account-nav__chevron" aria-hidden="true" size={21} />
          </Link>
        </nav>
      </section>

      <details
        className="danger-zone"
        open={Boolean(query.error && !["perfil", "foto"].includes(query.error)) || cleanupPending}
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
