import type { MetadataRoute } from "next";
import { SITE } from "@/lib/domain/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/partner/", "/driver", "/membership"] },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
