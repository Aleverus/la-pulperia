import type { Metadata } from "next";
import { OfferList } from "@/app/_components/OfferList";
import { SearchForm } from "@/app/_components/SearchForm";
import { searchOffers } from "@/lib/data";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo local de Siguatepeque",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function Home() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <main>
        <h1>La Pulpería</h1>
        <p>Falta el entorno local de Supabase. Corré `pnpm db:start` y `pnpm db:env`.</p>
      </main>
    );
  }

  const { offers } = await searchOffers({
    query: "",
    offerClass: "all",
    presence: "all",
    availability: "all",
    sort: "organic",
    page: 1,
  });

  return (
    <main className="catalog-page">
      <section className="hero">
        <p className="eyebrow">Índice vivo de comercio local</p>
        <h1>Encontrá quién ofrece lo que necesitás en Siguatepeque.</h1>
        <p>
          Compará precio, vigencia, disponibilidad y cómo lo recibís. Después
          hablás con el negocio para confirmar el pedido, el pago y la entrega.
        </p>
      </section>
      <SearchForm />
      <div className="section-heading">
        <div>
          <p className="eyebrow">Oferta local</p>
          <h2>Ofertas publicadas</h2>
        </div>
      </div>
      <OfferList offers={offers} />
    </main>
  );
}
