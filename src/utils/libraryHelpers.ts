/**
 * Utility functions for multi-library system
 */

/**
 * Prefix an item ID with its library ID to ensure uniqueness
 * @example prefixItemId('default', 'bin-1x1') => 'default:bin-1x1'
 */
export function prefixItemId(libraryId: string, itemId: string): string {
  return `${libraryId}:${itemId}`;
}

/**
 * Extract library ID and item ID from a prefixed ID
 * @example unprefixItemId('default:bin-1x1') => { libraryId: 'default', itemId: 'bin-1x1' }
 */
export function unprefixItemId(prefixedId: string): { libraryId: string; itemId: string } {
  const colonIndex = prefixedId.indexOf(':');
  if (colonIndex === -1) {
    // Not prefixed - assume default library for backward compatibility
    return { libraryId: 'default', itemId: prefixedId };
  }
  const libraryId = prefixedId.substring(0, colonIndex);
  const itemId = prefixedId.substring(colonIndex + 1);
  return { libraryId, itemId };
}

/**
 * Resolve image URL to library-specific path
 * @param libraryId - ID of the library
 * @param imageUrl - Image URL from library item (optional)
 * @returns Resolved absolute path or undefined
 */
export function resolveImagePath(libraryId: string, imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  // Absolute HTTP/HTTPS URL - return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Already resolved to library path
  if (imageUrl.startsWith('/libraries/')) {
    return imageUrl;
  }

  // Path starting with /images/ - prepend library path
  if (imageUrl.startsWith('/images/')) {
    return `/libraries/${libraryId}${imageUrl}`;
  }

  // Relative path - assume it's in library's images folder
  return `/libraries/${libraryId}/images/${imageUrl}`;
}
