import Link from "next/link";
import { IconChristmasTreeFilled, IconMenu2 } from "@tabler/icons-react";
import { signOutAction } from "@/app/actions";
import { CartLink } from "@/app/_components/CartLink";
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
      <div className="site-header__inner">
        <Link href="/" className="mark">
          <IconChristmasTreeFilled aria-hidden="true" size={42} stroke={1.7} />
          <span>
            <strong>La Pulpería</strong>
            <small>Siguatepeque</small>
          </span>
        </Link>

        <div className="site-header__actions">
          <CartLink />
          <nav className="desktop-nav" aria-label="Navegación principal">
            <PrimaryNavigation email={email} isOperator={isOperator} />
          </nav>
          <details className="nav-menu">
            <summary aria-label="Abrir menú principal">
              <IconMenu2 aria-hidden="true" size={28} stroke={1.8} />
            </summary>
            <nav aria-label="Menú principal">
              <PrimaryNavigation email={email} isOperator={isOperator} />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function PrimaryNavigation({
  email,
  isOperator,
}: {
  email: string | null;
  isOperator: boolean;
}) {
  return (
    <>
      <Link href="/buscar">Buscar</Link>
      <Link href="/mapa">Mapa</Link>
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
    </>
  );
}
