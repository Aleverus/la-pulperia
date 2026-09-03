import type { Metadata } from "next";
import { setSavedLocalityAction } from "@/app/account-actions";
import { getSavedLocality } from "@/lib/account-data";

export const metadata: Metadata = {
  title: "Localidad guardada",
  robots: { index: false, follow: false },
};

export default async function SavedLocalityPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const query = await searchParams;
  const locality = await getSavedLocality();
  return (
    <main className="detail-page workspace-page">
      <p className="eyebrow">Tu cuenta</p>
      <h1>Localidad</h1>
      <p className="lede">
        Podés recordar Siguatepeque para futuras visitas. Se guarda el nombre y
        un centro aproximado de ciudad, nunca tu coordenada exacta.
      </p>
      {query.ok ? <p role="status">Preferencia actualizada.</p> : null}
      {query.error ? <p role="alert">No se pudo actualizar la preferencia.</p> : null}
      <section className="preference-card">
        <h2>{locality ? "Localidad recordada" : "No hay localidad guardada"}</h2>
        <p>{locality ?? "La cercanía exacta siempre pedirá permiso de nuevo."}</p>
        <form action={setSavedLocalityAction}>
          <button name="remember" value={locality ? "false" : "true"} type="submit">
            {locality ? "Olvidar localidad" : "Recordar Siguatepeque"}
          </button>
        </form>
      </section>
    </main>
  );
}
