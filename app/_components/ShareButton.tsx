"use client";

import { useState } from "react";

export function ShareButton({ label }: { label: string }) {
  const [notice, setNotice] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        setNotice("Enlace compartido.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Enlace copiado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("No se pudo copiar. Usá la dirección del navegador.");
    }
  }

  return (
    <div className="share-control">
      <button type="button" onClick={share}>
        {label}
      </button>
      <span aria-live="polite">{notice}</span>
    </div>
  );
}
