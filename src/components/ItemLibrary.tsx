import { useState, useEffect } from 'react';
import { getItemsByCategory } from '../data/libraryItems';
import { LibraryItemCard } from './LibraryItemCard';

const STORAGE_KEY = 'gridfinity-collapsed-categories';

type CategoryKey = 'bins' | 'dividers' | 'organizers';

export function ItemLibrary() {
  const bins = getItemsByCategory('bin');
  const dividers = getItemsByCategory('divider');
  const organizers = getItemsByCategory('organizer');

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
    items: ReturnType<typeof getItemsByCategory>
  ) => {
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
          {title}
        </h4>
        <div className={`category-items ${isCollapsed ? 'collapsed' : 'expanded'}`}>
          {items.map(item => (
            <LibraryItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="item-library">
      <h3 className="item-library-title">Item Library</h3>
      <p className="item-library-hint">Drag items onto the grid</p>

      {renderCategory('bins', 'Bins', bins)}
      {renderCategory('dividers', 'Dividers', dividers)}
      {renderCategory('organizers', 'Organizers', organizers)}
    </div>
  );
}
