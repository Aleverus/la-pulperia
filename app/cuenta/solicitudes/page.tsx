import Link from "next/link";
import type { Metadata } from "next";
import { getMyRequestBatches } from "@/lib/account-data";

export const metadata: Metadata = {
  title: "Pedidos para WhatsApp",
  robots: { index: false, follow: false },
};

export default async function RequestHistoryPage() {
  const batches = await getMyRequestBatches();
  return (
    <main className="detail-page">
      <p className="eyebrow">Tu cuenta</p>
      <h1>Pedidos para WhatsApp</h1>
      <p>
        Cada registro conserva durante 180 días lo que armaste para cada
        vendedor. No confirma que el mensaje se envió ni que hubo una venta.
      </p>
      {batches.length === 0 ? (
        <p className="empty-state">Todavía no armaste pedidos para WhatsApp.</p>
      ) : (
        <ul className="request-history">
          {batches.map((batch) => (
            <li key={batch.batch_id}>
              <div>
                <strong>{formatDate(batch.created_at)}</strong>
                <span>
                  {batch.seller_count} {batch.seller_count === 1 ? "vendedor" : "vendedores"}
                  {" · "}
                  {batch.handoff_opened_count} WhatsApp abiertos
                </span>
              </div>
              <Link
                className="secondary-action"
                href={`/cuenta/solicitudes/${batch.batch_id}`}
              >
                Ver detalle
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(value));
}
