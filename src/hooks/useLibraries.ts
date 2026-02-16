import { useState, useEffect, useCallback, useMemo } from 'react';
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
    // Load from localStorage or default to ['bins_standard']
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
    return ['bins_standard'];
  });

  // Fetch libraries via adapter using TanStack Query
  const { data: libraryInfos, isLoading, error: queryError } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => adapter.getLibraries(),
  });

  // Validate selected IDs against available libraries (derived state, no effect needed)
  const validatedSelectedIds = useMemo(() => {
    if (!libraryInfos || libraryInfos.length === 0) return selectedLibraryIds;
    const validIds = new Set(libraryInfos.map(l => l.id));
    const filtered = selectedLibraryIds.filter(id => validIds.has(id));
    if (filtered.length === 0) {
      return [libraryInfos[0].id];
    }
    return filtered.length === selectedLibraryIds.length ? selectedLibraryIds : filtered;
  }, [libraryInfos, selectedLibraryIds]);

  // Transform LibraryInfo[] into Library[] with isEnabled based on validated selection
  const availableLibraries: Library[] = (libraryInfos ?? []).map((info) => ({
    id: info.id,
    name: info.name,
    path: info.path,
    isEnabled: validatedSelectedIds.includes(info.id),
    itemCount: info.itemCount,
  }));

  // Persist validated selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_LIBRARIES_KEY, JSON.stringify(validatedSelectedIds));
    } catch (err) {
      console.warn('Failed to save selected libraries to localStorage:', err);
    }
  }, [validatedSelectedIds]);

  // Toggle a single library on/off
  const toggleLibrary = useCallback((libraryId: string) => {
    setSelectedLibraryIds(prev => {
      if (prev.includes(libraryId)) {
        return prev.filter(id => id !== libraryId);
      } else {
        return [...prev, libraryId];
      }
    });
  }, []);

  // Set multiple libraries at once
  const selectLibraries = useCallback((libraryIds: string[]) => {
    setSelectedLibraryIds(libraryIds);
  }, []);

  // Refresh library manifest
  const refreshLibraries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['libraries'] });
  }, [queryClient]);

  return {
    availableLibraries,
    selectedLibraryIds: validatedSelectedIds,
    isLoading,
    error: queryError ?? null,
    toggleLibrary,
    selectLibraries,
    refreshLibraries,
  };
}
