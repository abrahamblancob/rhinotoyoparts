/**
 * Parse a photo URL field that may be a JSON array of URLs or a single URL string.
 * Handles the `package_photo_url` column format used by pack sessions.
 */
export function parsePhotoUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return raw ? [raw] : [];
  }
}
