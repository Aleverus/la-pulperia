"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArrowLeft, IconBuildingStore } from "@tabler/icons-react";
import { signOutAction } from "@/app/actions";
import { CartLink } from "@/app/_components/CartLink";
import { MobileMenu } from "@/app/_components/MobileMenu";

type HeaderNavigationProps = {
  email: string | null;
  hasSellerPresence: boolean;
  isOperator: boolean;
};

export function HeaderNavigation({
  email,
  hasSellerPresence,
  isOperator,
}: HeaderNavigationProps) {
  const pathname = usePathname();
  const sellerMode =
    pathname === "/vender" || pathname.startsWith("/mi-pulperia");

  return (
    <div className="site-header__actions">
      {sellerMode ? (
        <Link className="seller-mode-return" href="/buscar">
          <IconArrowLeft aria-hidden="true" size={20} stroke={1.9} />
          <span>Comprar</span>
        </Link>
      ) : (
        <CartLink />
      )}
      <nav className="desktop-nav" aria-label="Navegación principal">
        <PrimaryNavigation
          email={email}
          hasSellerPresence={hasSellerPresence}
          isOperator={isOperator}
          sellerMode={sellerMode}
        />
      </nav>
      <MobileMenu>
        <PrimaryNavigation
          email={email}
          hasSellerPresence={hasSellerPresence}
          isOperator={isOperator}
          sellerMode={sellerMode}
        />
      </MobileMenu>
    </div>
  );
}

function PrimaryNavigation({
  email,
  hasSellerPresence,
  isOperator,
  sellerMode,
}: HeaderNavigationProps & { sellerMode: boolean }) {
  if (sellerMode) {
    return (
      <>
        <Link href="/mi-pulperia" className="seller-nav-link">
          <IconBuildingStore aria-hidden="true" size={18} stroke={1.8} />
          Mi pulpería
        </Link>
        {hasSellerPresence ? (
          <Link href="/mi-pulperia/solicitudes">Solicitudes</Link>
        ) : null}
        <Link href="/cuenta">Cuenta</Link>
        {isOperator ? <Link href="/operacion/reportes">Operación</Link> : null}
        {email ? (
          <form action={signOutAction}>
            <button type="submit">Salir</button>
          </form>
        ) : (
          <Link href="/ingresar">Ingresar</Link>
        )}
      </>
    );
  }

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
