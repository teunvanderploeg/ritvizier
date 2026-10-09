import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/kosten", "/vergelijken", "/aanbod", "/over", "/privacy"].map(
    (path) => ({ url: new URL(path, siteUrl).href }),
  );
}
