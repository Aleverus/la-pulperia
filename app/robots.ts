import type { MetadataRoute } from "next";
import { prelaunchMode } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (prelaunchMode()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/oferta/", "/pulperia/", "/mapa"],
      disallow: [
        "/auth/",
        "/carrito",
        "/seleccion",
        "/cuenta/",
        "/ingresar",
        "/mi-pulperia/",
        "/operacion/",
        "/vender",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
