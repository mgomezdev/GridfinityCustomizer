import type { BOMItem } from '../types/gridfinity';

interface BillOfMaterialsProps {
  items: BOMItem[];
}

export function BillOfMaterials({ items }: BillOfMaterialsProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Group items by category (first category only for display)
  // TODO: Remove category grouping - tracked in separate issue
  const bins = items.filter(item => item.categories.includes('bin'));
  const dividers = items.filter(item => item.categories.includes('divider'));
  const organizers = items.filter(item => item.categories.includes('organizer'));

  const renderCategory = (title: string, categoryItems: BOMItem[]) => {
    if (categoryItems.length === 0) return null;

    return (
      <div className="bom-category">
        <h4 className="bom-category-title">{title}</h4>
        <div className="bom-items">
          {categoryItems.map(item => (
            <div key={item.itemId} className="bom-item">
              <div
                className="bom-item-color"
                style={{ backgroundColor: item.color }}
              />
              <div className="bom-item-details">
                <div className="bom-item-name">{item.name}</div>
                <div className="bom-item-size">
                  {item.widthUnits}×{item.heightUnits}
                </div>
              </div>
              <div className="bom-item-quantity">×{item.quantity}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bill-of-materials">
      <div className="bom-header">
        <h3 className="bom-title">Bill of Materials</h3>
        {totalItems > 0 && (
          <div className="bom-total">{totalItems} item{totalItems !== 1 ? 's' : ''}</div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bom-empty">
          <p>No items placed yet</p>
          <p className="bom-hint">Drag items from the library to add them</p>
        </div>
      ) : (
        <div className="bom-content">
          {renderCategory('Bins', bins)}
          {renderCategory('Dividers', dividers)}
          {renderCategory('Organizers', organizers)}
        </div>
      )}
    </div>
  );
}
