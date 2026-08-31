import type { Metadata } from "next";
import Link from "next/link";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { formErrorMessage } from "@/lib/seller";
import { getOwnedPresences } from "@/lib/seller-data";
import { sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Abrir una pulpería",
  robots: { index: false, follow: false },
};

export default async function VenderPage({
  searchParams,
}: PageProps<"/vender">) {
  const presences = await getOwnedPresences();
  const params = await searchParams;
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main>
      <h1>{presences.length ? "Abrir otra pulpería" : "Abrir una pulpería"}</h1>
      <p>
        Una cuenta sirve para comprar y, si querés, vender. No hay cola de
        aprobación. El WhatsApp no se publica en el catálogo.
      </p>
      {presences.length ? (
        <section aria-labelledby="owned-presences-heading">
          <h2 id="owned-presences-heading">Tus pulperías actuales</h2>
          <ul>
            {presences.map((presence) => (
              <li key={presence.id}>
                <Link href={sellerUrl("/mi-pulperia", presence.id)}>
                  Administrar {presence.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PresenceForm presence={null} error={error ?? undefined} />
    </main>
  );
}
