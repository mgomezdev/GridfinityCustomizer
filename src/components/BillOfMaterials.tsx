import type { BOMItem } from '../types/gridfinity';
import { serializeCustomization } from '../types/gridfinity';

interface BillOfMaterialsProps {
  items: BOMItem[];
}

function formatCustomization(item: BOMItem): string | null {
  if (!item.customization) return null;
  const parts: string[] = [];
  if (item.customization.wallPattern !== 'none') parts.push(item.customization.wallPattern);
  if (item.customization.lipStyle !== 'normal') parts.push(`lip: ${item.customization.lipStyle}`);
  if (item.customization.fingerSlide !== 'none') parts.push(`slide: ${item.customization.fingerSlide}`);
  if (item.customization.wallCutout !== 'none') parts.push(`cutout: ${item.customization.wallCutout}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function BillOfMaterials({ items }: BillOfMaterialsProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bill-of-materials">
      <div className="bom-header">
        <h3 className="bom-title">Bill of Materials</h3>
        {totalItems > 0 && (
          <div className="bom-total">{totalItems} item{totalItems !== 1 ? 's' : ''}</div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bom-empty" role="status" aria-live="polite">
          <p>No items placed yet</p>
          <p className="bom-hint">Drag items from the library to add them</p>
        </div>
      ) : (
        <div className="bom-content">
          <div className="bom-items">
            {items.map(item => {
              const customText = formatCustomization(item);
              const key = `${item.itemId}::${serializeCustomization(item.customization)}`;
              return (
                <div key={key} className="bom-item">
                  <div
                    className="bom-item-color"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="bom-item-details">
                    <div className="bom-item-name">{item.name}</div>
                    <div className="bom-item-size">
                      {item.widthUnits}×{item.heightUnits}
                    </div>
                    {customText && (
                      <div className="bom-item-customization">{customText}</div>
                    )}
                  </div>
                  <div className="bom-item-quantity">×{item.quantity}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
