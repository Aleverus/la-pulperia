import Link from "next/link";
import {
  IconAdjustments,
  IconLayoutDashboard,
  IconNews,
  IconReceipt,
} from "@tabler/icons-react";
import { sellerUrl } from "@/lib/seller-routing";

type SellerWorkspaceNavProps = {
  active: "overview" | "publications" | "requests" | "settings";
  presenceId: string;
};

export function SellerWorkspaceNav({
  active,
  presenceId,
}: SellerWorkspaceNavProps) {
  const items = [
    {
      id: "overview" as const,
      href: sellerUrl("/mi-pulperia", presenceId),
      label: "Resumen",
      icon: IconLayoutDashboard,
    },
    {
      id: "publications" as const,
      href: `${sellerUrl("/mi-pulperia", presenceId)}#publicaciones`,
      label: "Publicaciones",
      icon: IconNews,
    },
    {
      id: "requests" as const,
      href: sellerUrl("/mi-pulperia/solicitudes", presenceId),
      label: "Solicitudes",
      icon: IconReceipt,
    },
    {
      id: "settings" as const,
      href: `${sellerUrl("/mi-pulperia", presenceId)}#seller-settings`,
      label: "Ajustes",
      icon: IconAdjustments,
    },
  ];

  return (
    <nav className="workspace-tabs" aria-label="Administrar la pulpería">
      {items.map(({ id, href, label, icon: Icon }) => (
        <Link
          href={href}
          key={id}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon aria-hidden="true" size={19} stroke={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
