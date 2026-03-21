import type { ApiShadowbox } from '@gridfinity/shared';
import { useShadowboxesQuery, useDeleteShadowboxMutation } from '../hooks/useShadowboxes';

interface ShadowboxItemProps {
  item: ApiShadowbox;
  onDelete: (id: string) => void;
}

function ShadowboxItem({ item, onDelete }: ShadowboxItemProps) {
  const dragData = JSON.stringify({ type: 'library', itemId: `shadowbox:${item.id}` });

  return (
    <div
      className="shadowbox-library-item"
      draggable={item.status === 'ready'}
      onDragStart={(e) => {
        if (item.status !== 'ready') return;
        e.dataTransfer.setData('application/json', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span className={`shadowbox-item-name ${item.status !== 'ready' ? 'shadowbox-item-pending' : ''}`}>
        {item.name}
      </span>
      {item.status === 'pending' && <span className="shadowbox-status-badge">⏳</span>}
      {item.status === 'error' && <span className="shadowbox-status-badge shadowbox-status-error">⚠</span>}
      {item.status === 'ready' && (
        <button
          className="shadowbox-delete-btn"
          onClick={() => onDelete(item.id)}
          aria-label={`Delete ${item.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function ShadowboxLibrarySection() {
  const { data: shadowboxes = [], isLoading } = useShadowboxesQuery();
  const { mutate: deleteShadowbox } = useDeleteShadowboxMutation();

  return (
    <div className="shadowbox-library-section">
      <div className="library-section-header">My Shadowboxes</div>
      {isLoading && <div className="library-loading">Loading…</div>}
      {shadowboxes.map((item) => (
        <ShadowboxItem key={item.id} item={item} onDelete={deleteShadowbox} />
      ))}
      <a href="/shadowbox/new" className="shadowbox-new-link">+ New shadowbox</a>
    </div>
  );
}
