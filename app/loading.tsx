export default function Loading() {
  return (
    <div className="route-loading detail-page state-page" aria-busy="true">
      <p className="eyebrow">La Pulpería</p>
      <h1>Cargando el puesto…</h1>
      <div className="loading-card" role="status" aria-live="polite">
        <span className="loading-pulse" aria-hidden="true" />
        <span>Estamos preparando la información local.</span>
      </div>
    </div>
  );
}
