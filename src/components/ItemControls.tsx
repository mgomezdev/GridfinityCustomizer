interface ItemControlsProps {
  onRotateCw: () => void;
  onRotateCcw: () => void;
  onDelete: () => void;
}

export function ItemControls({ onRotateCw, onRotateCcw, onDelete }: ItemControlsProps) {
  return (
    <div className="item-controls">
      <button
        className="item-control-btn rotate-btn"
        onClick={onRotateCcw}
        title="Rotate counter-clockwise"
      >
        &#8634; CCW
      </button>
      <button
        className="item-control-btn rotate-btn"
        onClick={onRotateCw}
        title="Rotate clockwise"
      >
        &#8635; CW
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
