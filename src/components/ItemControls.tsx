interface ItemControlsProps {
  onRotate: () => void;
  onDelete: () => void;
}

export function ItemControls({ onRotate, onDelete }: ItemControlsProps) {
  return (
    <div className="item-controls">
      <button
        className="item-control-btn rotate-btn"
        onClick={onRotate}
        title="Rotate 90 degrees"
      >
        Rotate
      </button>
      <button
        className="item-control-btn delete-btn"
        onClick={onDelete}
        title="Delete item"
      >
        Delete
      </button>
    </div>
  );
}
