import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Library } from '../types/gridfinity';
import { useDataSource } from '../contexts/DataSourceContext';
import { STORAGE_KEYS } from '../utils/storageKeys';

const SELECTED_LIBRARIES_KEY = STORAGE_KEYS.SELECTED_LIBRARIES;

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
 * Loads libraries via the DataSourceAdapter
 * Persists user's library selection to localStorage
 */
export function useLibraries(): UseLibrariesResult {
  const adapter = useDataSource();
  const queryClient = useQueryClient();

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

  // Fetch libraries via adapter using TanStack Query
  const { data: libraryInfos, isLoading, error: queryError } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => adapter.getLibraries(),
  });

  // Transform LibraryInfo[] into Library[] with isEnabled based on selection
  const availableLibraries: Library[] = (libraryInfos ?? []).map((info) => ({
    id: info.id,
    name: info.name,
    path: info.path,
    isEnabled: selectedLibraryIds.includes(info.id),
    itemCount: info.itemCount,
  }));

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
    await queryClient.invalidateQueries({ queryKey: ['libraries'] });
  }, [queryClient]);

  return {
    availableLibraries,
    selectedLibraryIds,
    isLoading,
    error: queryError ?? null,
    toggleLibrary,
    selectLibraries,
    refreshLibraries,
  };
}
