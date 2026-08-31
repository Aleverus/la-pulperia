import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferForm } from "@/app/_components/OfferForm";
import { formErrorMessage } from "@/lib/seller";
import {
  getOwnedMedia,
  getOwnedOffer,
  getOwnedPresences,
} from "@/lib/seller-data";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Editar oferta",
  robots: { index: false, follow: false },
};

export default async function EditarOfertaPage({
  params,
  searchParams,
}: PageProps<"/mi-pulperia/ofertas/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const requestedId =
    typeof query.presence === "string" ? query.presence : null;
  const presences = await getOwnedPresences(`/mi-pulperia/ofertas/${id}`);
  const presence = selectOwnedPresence(presences, requestedId);
  if (!presence) redirect("/vender");
  if (requestedId !== presence.id) {
    redirect(sellerUrl(`/mi-pulperia/ofertas/${id}`, presence.id));
  }
  const offer = await getOwnedOffer(presence.id, id);
  if (!offer) notFound();
  const media = await getOwnedMedia(offer.id);
  const error = formErrorMessage(
    typeof query.error === "string" ? query.error : undefined,
  );
  const notice =
    query.ok === "fresh" ? "Vigencia confirmada. Eso no registra una venta." : undefined;

  return (
    <main>
      <p>
        <Link href={sellerUrl("/mi-pulperia", presence.id)}>
          Volver a {presence.name}
        </Link>
      </p>
      <h1>Editar oferta</h1>
      <OfferForm
        presenceId={presence.id}
        offer={offer}
        media={media}
        error={error ?? undefined}
        notice={notice}
      />
    </main>
  );
}
