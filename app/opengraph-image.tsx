import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}, catálogo local de Siguatepeque`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f3efe8",
        color: "#1c1916",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        width: "100%",
      }}
    >
      <div style={{ color: "#7a1f11", fontSize: 30, letterSpacing: 8 }}>
        SIGUATEPEQUE
      </div>
      <div style={{ fontSize: 104, fontWeight: 700, marginTop: 24 }}>
        {SITE_NAME}
      </div>
      <div style={{ fontSize: 34, marginTop: 28, textAlign: "center" }}>
        {SITE_DESCRIPTION}
      </div>
    </div>,
    size,
  );
}
