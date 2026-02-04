import { useState, useEffect } from 'react';
import type { LibraryItem, Category } from '../types/gridfinity';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryManager } from './LibraryManager';

const STORAGE_KEY = 'gridfinity-collapsed-categories';

interface ItemLibraryProps {
  items: LibraryItem[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  onAddItem: (item: LibraryItem) => void;
  onUpdateItem: (id: string, updates: Partial<LibraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onResetToDefaults: () => void;
  onExportLibrary: () => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onResetCategories: () => void;
  onUpdateItemCategories: (oldCategoryId: string, newCategoryId: string) => void;
  getCategoryById: (id: string) => Category | undefined;
}

export function ItemLibrary({
  items,
  categories,
  isLoading,
  error,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onResetToDefaults,
  onExportLibrary,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetCategories,
  onUpdateItemCategories,
  getCategoryById,
}: ItemLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManager, setShowManager] = useState(false);

  // Filter items by search query
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category dynamically
  const itemsByCategory = categories.map(category => ({
    category,
    items: filteredItems.filter(item => item.categories.includes(category.id)),
  }));

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

      {sortedCategories.map(({ category, items: categoryItems }) =>
        renderCategory(category, categoryItems)
      )}

      {showManager && (
        <LibraryManager
          items={items}
          categories={categories}
          onClose={() => setShowManager(false)}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onResetToDefaults={onResetToDefaults}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          onResetCategories={onResetCategories}
          onUpdateItemCategories={onUpdateItemCategories}
          getCategoryById={getCategoryById}
        />
      )}
    </div>
  );
}
