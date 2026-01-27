import { useState, useEffect } from 'react';
import type { LibraryItem } from '../types/gridfinity';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryManager } from './LibraryManager';

const STORAGE_KEY = 'gridfinity-collapsed-categories';

type CategoryKey = 'bins' | 'dividers' | 'organizers';

interface ItemLibraryProps {
  items: LibraryItem[];
  isLoading: boolean;
  error: Error | null;
  onAddItem: (item: LibraryItem) => void;
  onUpdateItem: (id: string, updates: Partial<LibraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onResetToDefaults: () => void;
  onExportLibrary: () => void;
}

export function ItemLibrary({
  items,
  isLoading,
  error,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onResetToDefaults,
  onExportLibrary,
}: ItemLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManager, setShowManager] = useState(false);

  // Filter items by search query
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bins = filteredItems.filter(item => item.category === 'bin');
  const dividers = filteredItems.filter(item => item.category === 'divider');
  const organizers = filteredItems.filter(item => item.category === 'organizer');

  // Load collapsed state from localStorage, default all to expanded (false = expanded)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<CategoryKey>>(() => {
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

  const toggleCategory = (category: CategoryKey) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const renderCategory = (
    key: CategoryKey,
    title: string,
    categoryItems: LibraryItem[]
  ) => {
    if (categoryItems.length === 0) return null;

    const isCollapsed = collapsedCategories.has(key);

    return (
      <div className="item-library-category" key={key}>
        <h4
          className="category-title collapsible"
          onClick={() => toggleCategory(key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCategory(key);
            }
          }}
        >
          <span className={`category-chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            ▶
          </span>
          {title} ({categoryItems.length})
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

  const hasResults = bins.length > 0 || dividers.length > 0 || organizers.length > 0;

  return (
    <div className="item-library">
      <h3 className="item-library-title">Item Library</h3>
      <p className="item-library-hint">Drag items onto the grid</p>

      <button
        className="export-library-button"
        onClick={onExportLibrary}
        title="Export library to JSON file"
      >
        Export Library
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
        className="manage-library-button"
        onClick={() => setShowManager(true)}
      >
        Manage Library
      </button>

      {!hasResults && searchQuery && (
        <div className="library-no-results">
          <p>No items found matching "{searchQuery}"</p>
        </div>
      )}

      {renderCategory('bins', 'Bins', bins)}
      {renderCategory('dividers', 'Dividers', dividers)}
      {renderCategory('organizers', 'Organizers', organizers)}

      {showManager && (
        <LibraryManager
          items={items}
          onClose={() => setShowManager(false)}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onResetToDefaults={onResetToDefaults}
        />
      )}
    </div>
  );
}
