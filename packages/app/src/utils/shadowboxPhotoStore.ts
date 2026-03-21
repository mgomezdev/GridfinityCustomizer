/**
 * Holds the most-recently uploaded shadowbox photo as an object URL so the
 * editor can display it as a reference overlay without a round-trip to the server.
 *
 * The URL is only valid within the same page session (not preserved on refresh),
 * but that is acceptable — the editor is always reached via client-side navigation
 * from the upload page.
 */
let objectUrl: string | null = null;

export function setPhotoFile(file: File): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
}

export function getPhotoUrl(): string | null {
  return objectUrl;
}
