import Link from "next/link";
import type { Metadata } from "next";
import { reviewReportAction } from "@/app/operation-actions";
import { getOperationSnapshot, type OperatorReport } from "@/lib/operations";

export const metadata: Metadata = {
  title: "Operación",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const EVENT_LABELS = {
  search: "Búsquedas",
  offer_open: "Ofertas abiertas",
  selection_add: "Agregados a la selección",
  request_prepared: "Solicitudes preparadas",
  handoff_opened: "WhatsApp abierto",
  request_understood: "Solicitudes entendidas por el vendedor",
  seller_update: "Actualizaciones de vendedores",
} as const;

export default async function OperationReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { reports, metrics } = await getOperationSnapshot();
  const openReports = reports.filter((report) => report.report_status === "open");
  const reviewedReports = reports.filter(
    (report) => report.report_status !== "open",
  );

  return (
    <main className="workspace-page">
      <h1>Operación</h1>
      <p>Reportes privados, decisiones auditadas y métricas agregadas sin PII.</p>
      {query.ok ? <p role="status">Revisión guardada.</p> : null}
      {query.error ? <p role="alert">No se pudo guardar la revisión.</p> : null}

      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title">Señales de uso</h2>
        <p>
          Son señales orientativas: las ráfagas públicas se agrupan y se topan
          por minuto. No prueban venta, pago ni validación de campo.
        </p>
        <dl className="metrics-grid">
          <div>
            <dt>Búsquedas útiles</dt>
            <dd>{metrics.useful_searches}</dd>
          </div>
          <div>
            <dt>Búsquedas vacías</dt>
            <dd>{metrics.empty_searches}</dd>
          </div>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{metrics.events[key as keyof typeof EVENT_LABELS]}</dd>
            </div>
          ))}
          <div>
            <dt>Ubicaciones fijas publicadas</dt>
            <dd>{metrics.published_presences.fixed_location}</dd>
          </div>
          <div>
            <dt>Presencias móviles publicadas</dt>
            <dd>{metrics.published_presences.mobile}</dd>
          </div>
          <div>
            <dt>Presencias remotas publicadas</dt>
            <dd>{metrics.published_presences.remote}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="inbox-title">
        <h2 id="inbox-title">Pendientes ({openReports.length})</h2>
        {openReports.length === 0 ? (
          <p>No hay reportes pendientes.</p>
        ) : (
          <ul className="report-list">
            {openReports.map((report) => (
              <li key={report.report_id}>
                <ReportReview report={report} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewedReports.length > 0 ? (
        <section aria-labelledby="reviewed-title">
          <h2 id="reviewed-title">Revisados</h2>
          <ul className="report-list compact">
            {reviewedReports.map((report) => (
              <li key={report.report_id}>
                <strong>{report.target_name}</strong> · {report.report_status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function ReportReview({ report }: { report: OperatorReport }) {
  const href =
    report.target_kind === "offer"
      ? `/oferta/${report.target_slug}`
      : `/pulperia/${report.target_slug}`;
  return (
    <article>
      <p>
        <Link href={href}>{report.target_name}</Link> · {report.category}
      </p>
      <p>{report.explanation}</p>
      <form action={reviewReportAction} className="stacked-form">
        <input type="hidden" name="report_id" value={report.report_id} />
        <label>
          Nota pública neutral (sólo para “Publicar nota”)
          <textarea name="public_note" minLength={8} maxLength={500} />
        </label>
        <div className="button-row">
          <button name="review_action" value="publish_note" type="submit">
            Publicar nota
          </button>
          <button name="review_action" value="dismiss" type="submit">
            Descartar
          </button>
          <button name="review_action" value="remove_content" type="submit">
            Archivar contenido
          </button>
        </div>
      </form>
    </article>
  );
}
