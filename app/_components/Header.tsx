import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  let email: string | null = null;
  let isOperator = false;
  if (hasPublicSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email =
      typeof data?.claims?.email === "string" ? data.claims.email : null;
    if (email) {
      const operatorResult = await supabase.rpc("is_operator");
      isOperator = operatorResult.data === true;
    }
  }

  return (
    <header className="site-header">
      <Link href="/" className="mark">
        <span>La Pulpería</span>
        <small>Oferta local de Siguatepeque</small>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/buscar">Buscar</Link>
        <Link href="/mapa">Mapa</Link>
        <Link href="/carrito">Selección</Link>
        <Link href="/vender">Vender</Link>
        {email ? (
          <>
            <Link href="/cuenta">Cuenta</Link>
            {isOperator ? <Link href="/operacion/reportes">Operación</Link> : null}
            <form action={signOutAction}>
              <button type="submit">Salir</button>
            </form>
          </>
        ) : (
          <Link href="/ingresar">Ingresar</Link>
        )}
      </nav>
    </header>
  );
}
