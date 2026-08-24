import type { Metadata } from "next";
import { CartClient } from "@/app/_components/CartClient";
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
    <main className="cart-page">
      <p className="eyebrow">Tu canasto</p>
      <h1>Carrito</h1>
      <p>La selección se agrupa por vendedor. No es un pedido único de la plataforma.</p>
      <CartClient signedIn={signedIn} />
    </main>
  );
}
