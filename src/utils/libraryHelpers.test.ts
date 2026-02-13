import { describe, it, expect } from 'vitest';
import { resolveImagePath, prefixItemId, unprefixItemId } from './libraryHelpers';

describe('libraryHelpers', () => {
  describe('resolveImagePath', () => {
    const libraryId = 'simple-utensils';
    const basePath = '/libraries/simple-utensils';

    it('should handle undefined imageUrl', () => {
      expect(resolveImagePath(libraryId, basePath, undefined)).toBeUndefined();
    });

    it('should pass through HTTP URLs unchanged', () => {
      const url = 'http://example.com/image.png';
      expect(resolveImagePath(libraryId, basePath, url)).toBe(url);
    });

    it('should pass through HTTPS URLs unchanged', () => {
      const url = 'https://example.com/image.png';
      expect(resolveImagePath(libraryId, basePath, url)).toBe(url);
    });

    it('should pass through already-resolved library paths (backward compat)', () => {
      const url = '/libraries/simple-utensils/Utensils 1x3.png';
      expect(resolveImagePath(libraryId, basePath, url)).toBe(url);
    });

    it('should reject absolute paths for security', () => {
      const url = '/images/Utensils 1x3.png';
      expect(resolveImagePath(libraryId, basePath, url)).toBeUndefined();
    });

    it('should resolve simple relative filenames to library root', () => {
      const url = 'Utensils 1x3.png';
      expect(resolveImagePath(libraryId, basePath, url))
        .toBe('/libraries/simple-utensils/Utensils 1x3.png');
    });

    it('should resolve relative paths with subdirectories', () => {
      const url = 'images/subfolder/Utensils 1x3.png';
      expect(resolveImagePath(libraryId, basePath, url))
        .toBe('/libraries/simple-utensils/images/subfolder/Utensils 1x3.png');
    });

    it('should handle filenames with spaces', () => {
      const url = 'Utensils offset 2x4.png';
      expect(resolveImagePath(libraryId, basePath, url))
        .toBe('/libraries/simple-utensils/Utensils offset 2x4.png');
    });

    it('should reject parent directory traversal for security', () => {
      const url = '../../../etc/passwd';
      expect(resolveImagePath(libraryId, basePath, url)).toBeUndefined();
    });

    it('should reject parent directory traversal in subdirectories', () => {
      const url = 'images/../../../file.png';
      expect(resolveImagePath(libraryId, basePath, url)).toBeUndefined();
    });

    it('should reject absolute system paths', () => {
      const url = '/etc/passwd';
      expect(resolveImagePath(libraryId, basePath, url)).toBeUndefined();
    });
  });

  describe('prefixItemId', () => {
    it('should prefix item ID with library ID', () => {
      expect(prefixItemId('default', 'bin-1x1')).toBe('default:bin-1x1');
    });
  });

  describe('unprefixItemId', () => {
    it('should extract library and item ID from prefixed ID', () => {
      const result = unprefixItemId('default:bin-1x1');
      expect(result).toEqual({ libraryId: 'default', itemId: 'bin-1x1' });
    });

    it('should handle unprefixed IDs (backward compat)', () => {
      const result = unprefixItemId('bin-1x1');
      expect(result).toEqual({ libraryId: 'default', itemId: 'bin-1x1' });
    });
  });
});
