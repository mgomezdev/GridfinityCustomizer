import { useState, useEffect, useMemo } from 'react';
import type { LibraryItem, Category } from '../types/gridfinity';
import { LibraryItemCard } from './LibraryItemCard';

const STORAGE_KEY = 'gridfinity-collapsed-categories';

interface ItemLibraryProps {
  items: LibraryItem[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  onRefreshLibrary: () => Promise<void>;
}

export function ItemLibrary({
  items,
  categories,
  isLoading,
  error,
  onRefreshLibrary,
}: ItemLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidths, setSelectedWidths] = useState<Set<number>>(new Set());
  const [selectedHeights, setSelectedHeights] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

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

  // Load collapsed state from localStorage, default all to expanded (false = expanded)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(collapsedCategories)));
    } catch (e) {
      console.warn('Failed to save collapsed categories to localStorage', e);
    }
  }, [collapsedCategories]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
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

  if (error) {
    return (
      <div className="item-library">
        <h3 className="item-library-title">Item Library</h3>
        <div className="library-error">
          <p>Failed to load library</p>
          <p className="error-message">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="item-library">
        <h3 className="item-library-title">Item Library</h3>
        <div className="library-loading">
          <p>Loading library...</p>
        </div>
      </div>
    );
  }

  const hasResults = filteredItems.length > 0;

  return (
    <div className="item-library">
      <h3 className="item-library-title">Item Library</h3>
      <p className="item-library-hint">Drag items onto the grid</p>

      <button
        className="refresh-library-button"
        onClick={() => {
          if (window.confirm('Refresh all libraries from files?')) {
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
    </div>
  );
}
