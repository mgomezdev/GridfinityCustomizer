export function generateFilename(layoutName?: string): string {
  if (layoutName && layoutName.trim()) {
    const slug = layoutName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}.pdf`;
  }
  const date = new Date().toISOString().slice(0, 10);
  return `gridfinity-${date}.pdf`;
}

export function getOrientation(gridX: number, gridY: number): 'l' | 'p' {
  return gridX > gridY ? 'l' : 'p';
}
