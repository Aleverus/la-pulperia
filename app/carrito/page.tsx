import type { Metadata } from "next";
import { SelectionClient } from "@/app/_components/SelectionClient";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Selección",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  let signedIn = false;
  if (hasPublicSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  }

  return (
    <main className="cart-page">
      <p className="eyebrow">Intención por vendedor</p>
      <h1>Selección</h1>
      <p>La selección se agrupa por vendedor. No es un pedido único de la plataforma.</p>
      <SelectionClient signedIn={signedIn} />
    </main>
  );
}
