import type { MetadataRoute } from "next";
import { listArtworks } from "@/lib/supabase-rest";
import { artworkUrl, SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${SITE_URL}/marketplace.html`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95
    }
  ];

  try {
    const artworks = await listArtworks();
    return [
      ...staticRoutes,
      ...artworks.map((artwork) => ({
        url: artworkUrl(artwork),
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: artwork.status === "available" ? 0.9 : artwork.status === "auction" ? 0.85 : 0.6
      }))
    ];
  } catch {
    return staticRoutes;
  }
}
