export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url, "http://localhost");
    if (["http:", "https:", "ftp:", "mailto:"].includes(parsed.protocol)) {
      return url;
    }
    // If it's a relative path, it's safe
    if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) {
      return url;
    }
    return "#";
  } catch (e) {
    return "#";
  }
}
