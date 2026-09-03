import type { Metadata } from "next";
import { SelectionClient } from "@/app/_components/SelectionClient";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Carrito",
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
    <main className="cart-page workspace-page">
      <p className="eyebrow">Tu compra local</p>
      <h1>Carrito</h1>
      <p>
        Revisá lo que querés pedir. La Pulpería lo agrupa por vendedor y
        prepara un pedido de WhatsApp para cada uno.
      </p>
      <SelectionClient signedIn={signedIn} />
    </main>
  );
}
