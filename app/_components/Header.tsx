import Link from "next/link";
import { IconChristmasTreeFilled } from "@tabler/icons-react";
import { signOutAction } from "@/app/actions";
import { CartLink } from "@/app/_components/CartLink";
import { MobileMenu } from "@/app/_components/MobileMenu";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  let email: string | null = null;
  let isOperator = false;
  let hasSellerPresence = false;
  if (hasPublicSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email =
      typeof data?.claims?.email === "string" ? data.claims.email : null;
    if (email) {
      const [operatorResult, presenceResult] = await Promise.all([
        supabase.rpc("is_operator"),
        supabase.rpc("get_my_presences"),
      ]);
      isOperator = operatorResult.data === true;
      hasSellerPresence =
        Array.isArray(presenceResult.data) && presenceResult.data.length > 0;
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
            <PrimaryNavigation
              email={email}
              hasSellerPresence={hasSellerPresence}
              isOperator={isOperator}
            />
          </nav>
          <MobileMenu>
            <PrimaryNavigation
              email={email}
              hasSellerPresence={hasSellerPresence}
              isOperator={isOperator}
            />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

function PrimaryNavigation({
  email,
  hasSellerPresence,
  isOperator,
}: {
  email: string | null;
  hasSellerPresence: boolean;
  isOperator: boolean;
}) {
  return (
    <>
      <Link href="/buscar">Buscar</Link>
      <Link href="/mapa">Mapa</Link>
      {email ? (
        <>
          <Link href={hasSellerPresence ? "/mi-pulperia" : "/vender"}>
            {hasSellerPresence ? "Mi pulpería" : "Vender"}
          </Link>
          <Link href="/cuenta">Cuenta</Link>
          {isOperator ? <Link href="/operacion/reportes">Operación</Link> : null}
          <form action={signOutAction}>
            <button type="submit">Salir</button>
          </form>
        </>
      ) : (
        <>
          <Link href="/vender">Vender</Link>
          <Link href="/ingresar">Ingresar</Link>
        </>
      )}
    </>
  );
}
