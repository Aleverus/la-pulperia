"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { IconMenu2 } from "@tabler/icons-react";

export function MobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    detailsRef.current?.removeAttribute("open");
  }, [pathname, search]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="nav-menu"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) {
          detailsRef.current?.removeAttribute("open");
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        detailsRef.current?.removeAttribute("open");
        detailsRef.current?.querySelector("summary")?.focus();
      }}
    >
      <summary aria-label="Abrir menú principal">
        <IconMenu2 aria-hidden="true" size={28} stroke={1.8} />
      </summary>
      <nav aria-label="Menú principal">{children}</nav>
    </details>
  );
}
