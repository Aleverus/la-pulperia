import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
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
