import type { MetadataRoute } from "next";
import { getApprovedDealsPageResult } from "@/lib/deals";
import { getAbsoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: getAbsoluteUrl("/"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: getAbsoluteUrl("/auth"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: getAbsoluteUrl("/post"),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    url: getAbsoluteUrl("/about"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: getAbsoluteUrl("/terms"),
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: getAbsoluteUrl("/privacy"),
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: getAbsoluteUrl("/community-rules"),
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: getAbsoluteUrl("/affiliate-disclosure"),
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: getAbsoluteUrl("/contact"),
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const dealPageResult = await getApprovedDealsPageResult({
      feed: "new",
      page: 1,
      pageSize: 100,
    });

    if (!dealPageResult.ok) {
      return staticRoutes;
    }

    return [
      ...staticRoutes,
      ...dealPageResult.data.deals.map((deal) => ({
        url: getAbsoluteUrl(`/deal/${deal.id}`),
        lastModified: new Date(deal.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
