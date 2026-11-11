import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { CATEGORIES } from "@/lib/domain/categories";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo/site";

/** Public pages only: home, discover, about, published experiences and host profiles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");

  const base = siteUrl();
  const [experiences, hosts] = await Promise.all([
    db.experience.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.hostProfile.findMany({
      where: { experiences: { some: { status: "PUBLISHED" } } },
      select: { slug: true, updatedAt: true },
    }),
  ]).catch((error: unknown) => {
    // Never fail a deploy over the sitemap: fall back to the static pages and retry on the next revalidation.
    console.warn("sitemap: could not read listings, serving static pages only", error);
    return [[], []] as const;
  });

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/discover`, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${base}/discover?category=${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...experiences.map((e) => ({ url: `${base}/experiences/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...hosts.map((h) => ({ url: `${base}/hosts/${h.slug}`, lastModified: h.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
