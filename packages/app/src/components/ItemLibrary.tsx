import { useState, useEffect, useMemo } from 'react';
import type { LibraryItem, Category, Library } from '../types/gridfinity';
import { LibraryItemCard } from './LibraryItemCard';
import { LibrarySelector } from './LibrarySelector';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ConfirmDialog } from './ConfirmDialog';

const STORAGE_KEY = STORAGE_KEYS.COLLAPSED_CATEGORIES;

interface ItemLibraryProps {
  items: LibraryItem[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  onRefreshLibrary: () => Promise<void>;
  availableLibraries: Library[];
  selectedLibraryIds: string[];
  onToggleLibrary: (libraryId: string) => void;
  isLibrariesLoading: boolean;
}

export function ItemLibrary({
  items,
  categories,
  isLoading,
  error,
  onRefreshLibrary,
  availableLibraries,
  selectedLibraryIds,
  onToggleLibrary,
  isLibrariesLoading,
}: ItemLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidths, setSelectedWidths] = useState<Set<number>>(new Set());
  const [selectedHeights, setSelectedHeights] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);
  const { confirm, dialogProps: confirmDialogProps } = useConfirmDialog();

  // Filter items by search query and dimensions
  const filteredItems = items.filter(item => {
    // Text search filter
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Width filter (if any widths selected, item must match one of them)
    const matchesWidth = selectedWidths.size === 0 || selectedWidths.has(item.widthUnits);

    // Height filter (if any heights selected, item must match one of them)
    const matchesHeight = selectedHeights.size === 0 || selectedHeights.has(item.heightUnits);

    return matchesSearch && matchesWidth && matchesHeight;
  });

  // Group items by category using single-pass Map lookup
  const itemsByCategory = useMemo(() => {
    const categoryMap = new Map<string, LibraryItem[]>();
    for (const item of filteredItems) {
      for (const categoryId of item.categories) {
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, []);
        }
        categoryMap.get(categoryId)!.push(item);
      }
    }
    return categories.map(category => ({
      category,
      items: categoryMap.get(category.id) || [],
    }));
  }, [categories, filteredItems]);

  // Sort categories by order
  const sortedCategories = itemsByCategory.sort((a, b) =>
    (a.category.order || 0) - (b.category.order || 0)
  );

  // Whether user has interacted with collapse state (true if localStorage had stored prefs)
  const [hasCollapseInteraction, setHasCollapseInteraction] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
  });

  // User's explicit collapse/expand state (from localStorage or empty)
  const [userCollapsedState, setUserCollapsedState] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load collapsed categories from localStorage', e);
    }
    return new Set();
  });

  // Derive effective collapsed state: default all collapsed until user interacts
  const collapsedCategories = useMemo(() => {
    if (hasCollapseInteraction) return userCollapsedState;
    if (categories.length > 0) return new Set(categories.map(c => c.id));
    return userCollapsedState;
  }, [hasCollapseInteraction, userCollapsedState, categories]);

  // Persist user's collapse state to localStorage
  useEffect(() => {
    if (!hasCollapseInteraction) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(userCollapsedState)));
    } catch (e) {
      console.warn('Failed to save collapsed categories to localStorage', e);
    }
  }, [userCollapsedState, hasCollapseInteraction]);

  const toggleCategory = (categoryId: string) => {
    if (!hasCollapseInteraction) {
      // First interaction: materialize the default "all collapsed" state, then toggle
      const base = new Set(categories.map(c => c.id));
      if (base.has(categoryId)) base.delete(categoryId);
      else base.add(categoryId);
      setUserCollapsedState(base);
      setHasCollapseInteraction(true);
    } else {
      setUserCollapsedState(prev => {
        const next = new Set(prev);
        if (next.has(categoryId)) {
          next.delete(categoryId);
        } else {
          next.add(categoryId);
        }
        return next;
      });
    }
  };

  const renderCategory = (
    category: Category,
    categoryItems: LibraryItem[]
  ) => {
    if (categoryItems.length === 0) return null;

    const isCollapsed = collapsedCategories.has(category.id);

    return (
      <div className="item-library-category" key={category.id}>
        <h4
          className="category-title collapsible"
          onClick={() => toggleCategory(category.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCategory(category.id);
            }
          }}
          style={category.color ? { borderLeft: `4px solid ${category.color}` } : {}}
        >
          <span className={`category-chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            ▶
          </span>
          {category.name} ({categoryItems.length})
        </h4>
        <div className={`category-items ${isCollapsed ? 'collapsed' : 'expanded'}`}>
          {categoryItems.map(item => (
            <LibraryItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  };

  const hasResults = filteredItems.length > 0;

  return (
    <div className="item-library">
      <h3 className="item-library-title">Item Library</h3>
      <p className="item-library-hint">Drag items onto the grid</p>

      <button
        className="toggle-library-selector-button"
        onClick={() => setShowLibrarySelector(!showLibrarySelector)}
        aria-expanded={showLibrarySelector}
      >
        {showLibrarySelector ? '▼' : '▶'} Library Selection
        {selectedLibraryIds.length > 1 && (
          <span className="library-active-indicator">●</span>
        )}
      </button>

      {showLibrarySelector && (
        <LibrarySelector
          availableLibraries={availableLibraries}
          selectedLibraryIds={selectedLibraryIds}
          onToggleLibrary={onToggleLibrary}
          isLoading={isLibrariesLoading}
        />
      )}

      {error && (
        <div className="library-error">
          <p>Failed to load library</p>
          <p className="error-message">{error.message}</p>
        </div>
      )}

      {!error && isLoading && (
        <div className="library-loading">
          <p>Loading library...</p>
        </div>
      )}

      {!error && !isLoading && selectedLibraryIds.length === 0 && (
        <div className="library-empty-selection">
          <p>No libraries selected. Use Library Selection above to choose libraries.</p>
        </div>
      )}

      {!error && !isLoading && selectedLibraryIds.length > 0 && (
        <>
          <button
            className="refresh-library-button"
            onClick={async () => {
              if (await confirm({ title: 'Refresh Library', message: 'Refresh all libraries from files?' })) {
                onRefreshLibrary();
              }
            }}
            title="Re-fetch all selected libraries from files"
          >
            Refresh Library
          </button>

          <div className="library-search">
            <input
              type="text"
              className="library-search-input"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="library-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            className="toggle-filters-button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
          >
            {showFilters ? '▼' : '▶'} Filter by Size
            {(selectedWidths.size > 0 || selectedHeights.size > 0) && (
              <span className="filter-active-indicator">●</span>
            )}
          </button>

          {showFilters && (
            <div className="library-filters">
            <div className="filter-group">
              <label className="filter-label">Width:</label>
              <div className="filter-options">
                {[1, 2, 3, 4, 5].map(width => (
                  <button
                    key={width}
                    className={`filter-chip ${selectedWidths.has(width) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedWidths(prev => {
                        const next = new Set(prev);
                        if (next.has(width)) {
                          next.delete(width);
                        } else {
                          next.add(width);
                        }
                        return next;
                      });
                    }}
                    aria-pressed={selectedWidths.has(width)}
                  >
                    {width}x
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Height:</label>
              <div className="filter-options">
                {[1, 2, 3, 4, 5].map(height => (
                  <button
                    key={height}
                    className={`filter-chip ${selectedHeights.has(height) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedHeights(prev => {
                        const next = new Set(prev);
                        if (next.has(height)) {
                          next.delete(height);
                        } else {
                          next.add(height);
                        }
                        return next;
                      });
                    }}
                    aria-pressed={selectedHeights.has(height)}
                  >
                    {height}x
                  </button>
                ))}
              </div>
            </div>

            {(selectedWidths.size > 0 || selectedHeights.size > 0) && (
              <button
                className="filter-clear-all"
                onClick={() => {
                  setSelectedWidths(new Set());
                  setSelectedHeights(new Set());
                }}
              >
                Clear Filters
              </button>
            )}
            </div>
          )}

          {!hasResults && (searchQuery || selectedWidths.size > 0 || selectedHeights.size > 0) && (
            <div className="library-no-results">
              <p>No items found{searchQuery && ` matching "${searchQuery}"`}</p>
            </div>
          )}

          {sortedCategories.map(({ category, items: categoryItems }) =>
            renderCategory(category, categoryItems)
          )}
        </>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
