import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfferForm } from "@/app/_components/OfferForm";
import { SellerWorkspaceNav } from "@/app/_components/SellerWorkspaceNav";
import { formErrorMessage } from "@/lib/seller";
import { getOwnedPresences } from "@/lib/seller-data";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nueva oferta",
  robots: { index: false, follow: false },
};

export default async function NuevaOfertaPage({
  searchParams,
}: PageProps<"/mi-pulperia/ofertas/nueva">) {
  const params = await searchParams;
  const requestedId =
    typeof params.presence === "string" ? params.presence : null;
  const presences = await getOwnedPresences("/mi-pulperia/ofertas/nueva");
  const presence = selectOwnedPresence(presences, requestedId);
  if (!presence) redirect("/vender");
  if (requestedId !== presence.id) {
    redirect(sellerUrl("/mi-pulperia/ofertas/nueva", presence.id));
  }
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main className="detail-page seller-publication-editor">
      <p>
        <Link href={sellerUrl("/mi-pulperia", presence.id)}>
          Volver a {presence.name}
        </Link>
      </p>
      <p className="eyebrow">Nueva publicación</p>
      <h1>Creá una oferta</h1>
      <p>
        Armala por partes. Podés dejarla en borrador y publicarla sólo cuando el
        contexto sea suficiente.
      </p>
      <SellerWorkspaceNav active="publications" presenceId={presence.id} />
      <OfferForm
        presenceId={presence.id}
        offer={null}
        media={[]}
        error={error ?? undefined}
        resumeStarterDraft={params.retomar === "1"}
      />
    </main>
  );
}
