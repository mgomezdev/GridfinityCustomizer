import { useState, useEffect, useCallback } from 'react';
import type { Library, LibraryManifest, LibraryIndex } from '../types/gridfinity';
import { STORAGE_KEYS } from '../utils/storageKeys';

const SELECTED_LIBRARIES_KEY = STORAGE_KEYS.SELECTED_LIBRARIES;
const MANIFEST_PATH = '/libraries/manifest.json';

export interface UseLibrariesResult {
  availableLibraries: Library[];
  selectedLibraryIds: string[];
  isLoading: boolean;
  error: Error | null;
  toggleLibrary: (libraryId: string) => void;
  selectLibraries: (libraryIds: string[]) => void;
  refreshLibraries: () => Promise<void>;
}

/**
 * Hook for managing library discovery and selection
 * Loads manifest.json to discover available libraries
 * Persists user's library selection to localStorage
 */
export function useLibraries(): UseLibrariesResult {
  const [availableLibraries, setAvailableLibraries] = useState<Library[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(() => {
    // Load from localStorage or default to ['default']
    try {
      const stored = localStorage.getItem(SELECTED_LIBRARIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate: must be a non-empty array of strings
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((id: unknown) => typeof id === 'string')) {
          return parsed;
        }
        console.warn('Invalid library selection in localStorage, using defaults');
      }
    } catch (err) {
      console.warn('Failed to load selected libraries from localStorage:', err);
    }
    return ['default'];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch manifest and build library list
  const fetchLibraries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(MANIFEST_PATH);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }

      const manifest: LibraryManifest = await response.json();

      // Fetch item counts for each library in parallel
      const librariesWithCounts = await Promise.all(
        manifest.libraries.map(async (lib) => {
          try {
            const libResponse = await fetch(lib.path);
            const data: LibraryIndex = await libResponse.json();
            return {
              ...lib,
              isEnabled: selectedLibraryIds.includes(lib.id),
              itemCount: data.items?.length ?? 0,
            };
          } catch (err) {
            console.error(`Failed to load item count for ${lib.id}:`, err);
            return {
              ...lib,
              isEnabled: selectedLibraryIds.includes(lib.id),
              itemCount: undefined,
            };
          }
        })
      );

      setAvailableLibraries(librariesWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error loading libraries'));
      console.error('Failed to load library manifest:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLibraryIds]);

  // Load manifest on mount
  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  // Persist selected library IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_LIBRARIES_KEY, JSON.stringify(selectedLibraryIds));
    } catch (err) {
      console.warn('Failed to save selected libraries to localStorage:', err);
    }
  }, [selectedLibraryIds]);

  // Toggle a single library on/off
  const toggleLibrary = useCallback((libraryId: string) => {
    setSelectedLibraryIds(prev => {
      if (prev.includes(libraryId)) {
        // Don't allow deselecting the last library
        if (prev.length === 1) {
          console.warn('Cannot deselect the last library');
          return prev;
        }
        return prev.filter(id => id !== libraryId);
      } else {
        return [...prev, libraryId];
      }
    });
  }, []);

  // Set multiple libraries at once
  const selectLibraries = useCallback((libraryIds: string[]) => {
    if (libraryIds.length === 0) {
      console.warn('Must select at least one library');
      return;
    }
    setSelectedLibraryIds(libraryIds);
  }, []);

  // Refresh library manifest
  const refreshLibraries = useCallback(async () => {
    await fetchLibraries();
  }, [fetchLibraries]);

  return {
    availableLibraries,
    selectedLibraryIds,
    isLoading,
    error,
    toggleLibrary,
    selectLibraries,
    refreshLibraries,
  };
}
