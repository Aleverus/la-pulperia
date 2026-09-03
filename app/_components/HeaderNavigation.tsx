"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBuildingStore,
  IconHomeSearch,
  IconMap2,
  IconUserCircle,
} from "@tabler/icons-react";
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
  const sellerHref = hasSellerPresence ? "/mi-pulperia" : "/vender";
  const accountHref = email ? "/cuenta" : "/ingresar?next=%2Fcuenta";
  const tabs = [
    {
      href: "/buscar",
      label: "Comprar",
      icon: IconHomeSearch,
      active:
        pathname === "/" ||
        pathname.startsWith("/buscar") ||
        pathname.startsWith("/oferta/") ||
        pathname.startsWith("/pulperia/"),
    },
    {
      href: "/mapa",
      label: "Mapa",
      icon: IconMap2,
      active: pathname.startsWith("/mapa"),
    },
    {
      href: sellerHref,
      label: hasSellerPresence ? "Mi pulpería" : "Abrir",
      icon: IconBuildingStore,
      active:
        pathname === "/vender" ||
        pathname.startsWith("/mi-pulperia"),
    },
    {
      href: accountHref,
      label: email ? "Cuenta" : "Ingresar",
      icon: IconUserCircle,
      active:
        pathname.startsWith("/cuenta") || pathname.startsWith("/ingresar"),
    },
  ];

  return (
    <>
      <div className="site-header__actions">
        <CartLink />
        {email ? (
          <>
            <div className="desktop-session-actions">
              {isOperator ? (
                <Link href="/operacion/reportes">Operación</Link>
              ) : null}
              <form action={signOutAction}>
                <button type="submit">Salir</button>
              </form>
            </div>
            <MobileMenu>
              <Link href="/cuenta">Ver cuenta</Link>
              {isOperator ? (
                <Link href="/operacion/reportes">Operación</Link>
              ) : null}
              <form action={signOutAction}>
                <button type="submit">Salir</button>
              </form>
            </MobileMenu>
          </>
        ) : null}
      </div>
      <nav className="site-tabs" aria-label="Secciones principales">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            href={href}
            key={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={21} stroke={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
