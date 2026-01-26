import { getItemsByCategory } from '../data/libraryItems';
import { LibraryItemCard } from './LibraryItemCard';

export function ItemLibrary() {
  const bins = getItemsByCategory('bin');
  const dividers = getItemsByCategory('divider');
  const organizers = getItemsByCategory('organizer');

  return (
    <div className="item-library">
      <h3 className="item-library-title">Item Library</h3>
      <p className="item-library-hint">Drag items onto the grid</p>

      <div className="item-library-category">
        <h4 className="category-title">Bins</h4>
        <div className="category-items">
          {bins.map(item => (
            <LibraryItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="item-library-category">
        <h4 className="category-title">Dividers</h4>
        <div className="category-items">
          {dividers.map(item => (
            <LibraryItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <div className="item-library-category">
        <h4 className="category-title">Organizers</h4>
        <div className="category-items">
          {organizers.map(item => (
            <LibraryItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
