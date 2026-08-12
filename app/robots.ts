import type {
  MetadataRoute,
} from "next";

export default function robots():
  MetadataRoute.Robots {

  const baseUrl =
    "https://dubaiwholesalehub.com";

  return {
    rules: {
      userAgent: "*",

      allow: "/",

      disallow: [
        "/admin/",
      ],
    },

    sitemap:
      `${baseUrl}/sitemap.xml`,

    host:
      baseUrl,
  };
}