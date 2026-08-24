"use client";

import { markHandoffAction } from "@/app/actions";

export function HandoffButton(props: {
  sellerRequestId: string;
  sellerName: string;
  href: string;
}) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void markHandoffAction(props.sellerRequestId);
      }}
    >
      Abrir WhatsApp de {props.sellerName}
    </a>
  );
}
