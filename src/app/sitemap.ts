import type { MetadataRoute } from "next";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/domain/site";

/**
 * The prototype was a hash-routed SPA, so every page shared a single URL and
 * nothing beyond the root was crawlable. Real routes mean a real sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, homes] = await Promise.all([repo.listCars(), repo.listHomes()]);
  const now = new Date();

  const staticRoutes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/cars", priority: 0.9, changeFrequency: "daily" },
    { path: "/homes", priority: 0.9, changeFrequency: "daily" },
    { path: "/subscriptions", priority: 0.8, changeFrequency: "weekly" },
    { path: "/loyalty", priority: 0.7, changeFrequency: "weekly" },
    { path: "/partners", priority: 0.7, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/who-we-are", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/insurance", priority: 0.5, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE.url}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...cars.map((car) => ({
      url: `${SITE.url}/cars/${car.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...homes.map((home) => ({
      url: `${SITE.url}/homes/${home.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
