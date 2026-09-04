import Link from "next/link";
import {
  IconAdjustments,
  IconNews,
  IconReceipt,
} from "@tabler/icons-react";
import { sellerUrl } from "@/lib/seller-routing";

type SellerWorkspaceNavProps = {
  active: "publications" | "requests" | "profile";
  presenceId: string;
};

export function SellerWorkspaceNav({
  active,
  presenceId,
}: SellerWorkspaceNavProps) {
  const items = [
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
      id: "profile" as const,
      href: `${sellerUrl("/mi-pulperia", presenceId)}#seller-settings`,
      label: "Perfil",
      icon: IconAdjustments,
    },
  ];

  return (
    <nav className="workspace-tabs" aria-label="Tu pulpería">
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
