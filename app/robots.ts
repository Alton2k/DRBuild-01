import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_ACCESS_PIN) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: getSiteUrl().origin,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getSiteUrl().origin,
  };
}
