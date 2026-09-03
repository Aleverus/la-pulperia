import type { Metadata } from "next";
import Link from "next/link";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { SellerFirstSetup } from "@/app/_components/SellerFirstSetup";
import { formErrorMessage } from "@/lib/seller";
import { getOwnedPresences } from "@/lib/seller-data";
import { sellerUrl } from "@/lib/seller-routing";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ofrecer en La Pulpería",
  robots: { index: false, follow: false },
};

export default async function VenderPage({
  searchParams,
}: PageProps<"/vender">) {
  const params = await searchParams;
  const { user } = await getSession();
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  if (!user) {
    return (
      <main className="detail-page seller-entry workspace-page">
        <p className="eyebrow">Abrí una pulpería</p>
        <h1>Empezá por una oferta real.</h1>
        <p className="lede">
          No vas a construir una tienda ni perder tu canal. Empezás una oferta
          privada, explicás cómo atendés y publicás sólo cuando la información
          necesaria ya es honesta.
        </p>
        <ol className="seller-setup-steps" aria-label="Qué ocurre al ofrecer">
          <li>
            <strong>1. Iniciás una oferta</strong>
            <span>Producto, encargo, servicio u oferta digital.</span>
          </li>
          <li>
            <strong>2. La guardás en privado</strong>
            <span>Podés salir y retomarla sin aparecer en el catálogo.</span>
          </li>
          <li>
            <strong>3. Publicás con contexto</strong>
            <span>Negocio, atención y WhatsApp verificado sólo cuando hacen falta.</span>
          </li>
        </ol>
        <section className="seller-entry__promise" aria-labelledby="seller-entry-promise">
          <h2 id="seller-entry-promise">Tu conversación sigue en WhatsApp</h2>
          <p>
            La Pulpería ayuda a que te encuentren y prepara una solicitud clara.
            No cobra, no confirma ventas y no lee tus chats.
          </p>
        </section>
        <div className="button-row">
          <Link
            className="primary-action"
            href="/ingresar?next=%2Fvender"
          >
            Ingresar y abrir mi pulpería
          </Link>
          <Link className="secondary-action" href="/buscar">
            Ver la vitrina pública
          </Link>
        </div>
      </main>
    );
  }

  const presences = await getOwnedPresences();
  const firstBusiness = presences.length === 0;

  return (
    <main className="detail-page seller-entry workspace-page">
      <p className="eyebrow">Publicar en La Pulpería</p>
      <h1>{firstBusiness ? "Abrí tu pulpería" : "Publicá desde tu negocio"}</h1>
      <p>
        Esta misma cuenta sirve para comprar y ofrecer. No hay selector de rol
        ni una identidad separada.
      </p>
      {presences.length ? (
        <section className="seller-owned" aria-labelledby="owned-presences-heading">
          <h2 id="owned-presences-heading">¿Dónde querés publicar?</h2>
          <ul className="seller-owned__list">
            {presences.map((presence) => (
              <li key={presence.id}>
                <div>
                  <strong>{presence.name}</strong>
                  <span>Creá una oferta o revisá el trabajo pendiente.</span>
                </div>
                <div className="button-row">
                  <Link
                    className="primary-action"
                    href={sellerUrl("/mi-pulperia/ofertas/nueva", presence.id)}
                  >
                    Crear oferta
                  </Link>
                  <Link
                    className="secondary-action"
                    href={sellerUrl("/mi-pulperia", presence.id)}
                  >
                    Administrar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {firstBusiness ? (
        <SellerFirstSetup error={error ?? undefined} />
      ) : (
        <details className="seller-add-business" open={Boolean(error)}>
          <summary>Agregar otro negocio</summary>
          <section className="starter-business" aria-labelledby="starter-business">
            <h2 id="starter-business" tabIndex={-1}>
              Nuevo perfil de negocio
            </h2>
            <p>
              Elegí cómo atendés. La ubicación exacta se pide sólo para un local
              fijo.
            </p>
            <PresenceForm presence={null} error={error ?? undefined} />
          </section>
        </details>
      )}
    </main>
  );
}
