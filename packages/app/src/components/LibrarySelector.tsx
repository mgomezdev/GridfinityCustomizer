import type { Library } from '../types/gridfinity';

interface LibrarySelectorProps {
  availableLibraries: Library[];
  selectedLibraryIds: string[];
  onToggleLibrary: (libraryId: string) => void;
  isLoading: boolean;
}

export function LibrarySelector({
  availableLibraries,
  selectedLibraryIds,
  onToggleLibrary,
  isLoading,
}: LibrarySelectorProps) {
  return (
    <div className="library-selector">
      <div className="library-selector-title">Library Selection</div>
      <div className="library-selector-list">
        {availableLibraries.map((library) => {
          const isSelected = selectedLibraryIds.includes(library.id);
          const isLastSelected =
            selectedLibraryIds.length === 1 && isSelected;

          return (
            <label
              key={library.id}
              className="library-selector-item"
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isLoading || isLastSelected}
                onChange={() => onToggleLibrary(library.id)}
              />
              <span className="library-selector-label">
                {library.name}
                {library.itemCount !== undefined && (
                  <span className="library-selector-count">
                    {' '}({library.itemCount} {library.itemCount === 1 ? 'item' : 'items'})
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
