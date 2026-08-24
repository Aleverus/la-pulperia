import { submitReportAction } from "@/app/operation-actions";

export function ReportForm(props: {
  offerId?: string;
  presenceId?: string;
  returnPath: string;
}) {
  return (
    <details className="report-panel">
      <summary>Reportar información</summary>
      <form action={submitReportAction} className="stacked-form">
        <input type="hidden" name="offer_id" value={props.offerId ?? ""} />
        <input type="hidden" name="presence_id" value={props.presenceId ?? ""} />
        <input type="hidden" name="return_path" value={props.returnPath} />
        <label>
          Motivo
          <select name="category" defaultValue="outdated" required>
            <option value="outdated">Información desactualizada</option>
            <option value="misleading">Información engañosa</option>
            <option value="abuse">Contenido abusivo</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label>
          Qué debería revisar el operador
          <textarea name="explanation" minLength={10} maxLength={2000} required />
        </label>
        <p className="fine-print">
          El reporte es privado. El vendedor y el público no verán este texto.
        </p>
        <button type="submit">Enviar reporte</button>
      </form>
    </details>
  );
}
