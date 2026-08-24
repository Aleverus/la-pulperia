import type { MetadataRoute } from "next";
import { getPublicSitemapEntries } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { offerSlugs, presenceSlugs } = await getPublicSitemapEntries();
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/mapa"), changeFrequency: "daily", priority: 0.7 },
    ...presenceSlugs.map((slug) => ({
      url: absoluteUrl(`/pulperia/${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...offerSlugs.map((slug) => ({
      url: absoluteUrl(`/oferta/${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
