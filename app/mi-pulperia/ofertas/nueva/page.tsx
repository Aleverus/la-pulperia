import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfferForm } from "@/app/_components/OfferForm";
import { formErrorMessage } from "@/lib/seller";
import { getOwnedPresence } from "@/lib/seller-data";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nueva oferta",
  robots: { index: false, follow: false },
};

export default async function NuevaOfertaPage({
  searchParams,
}: PageProps<"/mi-pulperia/ofertas/nueva">) {
  await requireSession("/mi-pulperia/ofertas/nueva");
  const presence = await getOwnedPresence();
  if (!presence) redirect("/vender");
  const params = await searchParams;
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main>
      <p>
        <Link href="/mi-pulperia">Volver a mi pulpería</Link>
      </p>
      <h1>Nueva oferta</h1>
      <p>El precio puede ser fijo, desde o por cotización según la clase de oferta.</p>
      <OfferForm offer={null} media={[]} error={error ?? undefined} />
    </main>
  );
}
