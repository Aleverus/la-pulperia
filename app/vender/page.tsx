import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { formErrorMessage } from "@/lib/seller";
import { getOwnedPresence } from "@/lib/seller-data";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Abrir una pulpería",
  robots: { index: false, follow: false },
};

export default async function VenderPage({
  searchParams,
}: PageProps<"/vender">) {
  await requireSession("/vender");
  const presence = await getOwnedPresence();
  if (presence) redirect("/mi-pulperia");
  const params = await searchParams;
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main>
      <h1>Abrir una pulpería</h1>
      <p>
        Una cuenta sirve para comprar y, si querés, vender. No hay cola de
        aprobación. El WhatsApp no se publica en el catálogo.
      </p>
      <PresenceForm presence={null} error={error ?? undefined} />
    </main>
  );
}
