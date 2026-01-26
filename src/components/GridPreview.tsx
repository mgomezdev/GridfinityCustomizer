interface GridPreviewProps {
  gridX: number;
  gridY: number;
}

export function GridPreview({ gridX, gridY }: GridPreviewProps) {
  if (gridX <= 0 || gridY <= 0) {
    return (
      <div className="grid-preview empty">
        <p>Enter dimensions to see grid preview</p>
      </div>
    );
  }

  const cells = [];
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      cells.push(<div key={`${x}-${y}`} className="grid-cell" />);
    }
  }

  return (
    <div className="grid-preview">
      <div
        className="grid-container"
        style={{
          gridTemplateColumns: `repeat(${gridX}, 1fr)`,
          gridTemplateRows: `repeat(${gridY}, 1fr)`,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
