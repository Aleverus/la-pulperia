"use client";

import { useState } from "react";

export function ShareButton({
  label,
  secondary = false,
  url,
  title,
}: {
  label: string;
  secondary?: boolean;
  url?: string;
  title?: string;
}) {
  const [notice, setNotice] = useState("");

  async function share() {
    const shareUrl = url ? new URL(url, window.location.origin).toString() : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: title ?? document.title, url: shareUrl });
        setNotice("Enlace compartido.");
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Enlace copiado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("No se pudo copiar. Usá la dirección del navegador.");
    }
  }

  return (
    <div className="share-control">
      <button
        type="button"
        className={secondary ? "secondary-action" : undefined}
        onClick={share}
      >
        {label}
      </button>
      <span aria-live="polite">{notice}</span>
    </div>
  );
}
