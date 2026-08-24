import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferForm } from "@/app/_components/OfferForm";
import { formErrorMessage } from "@/lib/seller";
import {
  getOwnedMedia,
  getOwnedOffer,
  getOwnedPresence,
} from "@/lib/seller-data";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Editar oferta",
  robots: { index: false, follow: false },
};

export default async function EditarOfertaPage({
  params,
  searchParams,
}: PageProps<"/mi-pulperia/ofertas/[id]">) {
  await requireSession("/mi-pulperia");
  const presence = await getOwnedPresence();
  if (!presence) redirect("/vender");
  const { id } = await params;
  const offer = await getOwnedOffer(presence.id, id);
  if (!offer) notFound();
  const media = await getOwnedMedia(offer.id);
  const query = await searchParams;
  const error = formErrorMessage(
    typeof query.error === "string" ? query.error : undefined,
  );
  const notice =
    query.ok === "fresh" ? "Vigencia confirmada. Eso no registra una venta." : undefined;

  return (
    <main>
      <p>
        <Link href="/mi-pulperia">Volver a mi pulpería</Link>
      </p>
      <h1>Editar oferta</h1>
      <OfferForm
        offer={offer}
        media={media}
        error={error ?? undefined}
        notice={notice}
      />
    </main>
  );
}
