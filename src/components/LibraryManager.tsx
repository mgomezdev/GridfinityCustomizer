import { useState } from 'react';
import type { LibraryItem } from '../types/gridfinity';

interface LibraryManagerProps {
  items: LibraryItem[];
  onClose: () => void;
  onAddItem: (item: LibraryItem) => void;
  onUpdateItem: (id: string, updates: Partial<LibraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onResetToDefaults: () => void;
}

type FormMode = 'add' | 'edit' | null;

export function LibraryManager({
  items,
  onClose,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onResetToDefaults,
}: LibraryManagerProps) {
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LibraryItem>>({
    id: '',
    name: '',
    widthUnits: 1,
    heightUnits: 1,
    color: '#646cff',
    category: 'bin',
  });
  const [error, setError] = useState<string | null>(null);

  const handleStartAdd = () => {
    setFormMode('add');
    setEditingId(null);
    setFormData({
      id: '',
      name: '',
      widthUnits: 1,
      heightUnits: 1,
      color: '#646cff',
      category: 'bin',
    });
    setError(null);
  };

  const handleStartEdit = (item: LibraryItem) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormData(item);
    setError(null);
  };

  const handleCancelForm = () => {
    setFormMode(null);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (formMode === 'add') {
        onAddItem(formData as LibraryItem);
        setFormMode(null);
      } else if (formMode === 'edit' && editingId) {
        onUpdateItem(editingId, formData);
        setFormMode(null);
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        onDeleteItem(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default library? All custom items will be lost.')) {
      onResetToDefaults();
      setFormMode(null);
      setEditingId(null);
      setError(null);
    }
  };

  return (
    <div className="library-manager-overlay" onClick={onClose}>
      <div className="library-manager" onClick={(e) => e.stopPropagation()}>
        <div className="library-manager-header">
          <h2>Manage Library</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="library-manager-error">
            {error}
          </div>
        )}

        {formMode === null ? (
          <>
            <div className="library-manager-actions">
              <button className="add-item-button" onClick={handleStartAdd}>
                + Add New Item
              </button>
              <button className="reset-button" onClick={handleReset}>
                Reset to Defaults
              </button>
            </div>

            <div className="library-manager-list">
              <h3>Library Items ({items.length})</h3>
              {items.map(item => (
                <div key={item.id} className="library-manager-item">
                  <div className="item-info">
                    <div
                      className="item-color-box"
                      style={{ backgroundColor: item.color }}
                      aria-label={`Color: ${item.color}`}
                    />
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-meta">
                        {item.widthUnits}×{item.heightUnits} units • {item.category}
                      </div>
                      <div className="item-id">ID: {item.id}</div>
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleStartEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <form className="library-manager-form" onSubmit={handleSubmit}>
            <h3>{formMode === 'add' ? 'Add New Item' : 'Edit Item'}</h3>

            <div className="form-group">
              <label htmlFor="item-id">ID *</label>
              <input
                id="item-id"
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                required
                disabled={formMode === 'edit'}
                placeholder="e.g., bin-3x2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="item-name">Name *</label>
              <input
                id="item-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., 3x2 Bin"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="item-width">Width (units) *</label>
                <input
                  id="item-width"
                  type="number"
                  min="1"
                  value={formData.widthUnits}
                  onChange={(e) => setFormData({ ...formData, widthUnits: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="item-height">Height (units) *</label>
                <input
                  id="item-height"
                  type="number"
                  min="1"
                  value={formData.heightUnits}
                  onChange={(e) => setFormData({ ...formData, heightUnits: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="item-category">Category *</label>
              <select
                id="item-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as LibraryItem['category'] })}
                required
              >
                <option value="bin">Bin</option>
                <option value="divider">Divider</option>
                <option value="organizer">Organizer</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="item-color">Color *</label>
              <div className="color-input-group">
                <input
                  id="item-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  required
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#646cff"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={handleCancelForm}>
                Cancel
              </button>
              <button type="submit" className="submit-button">
                {formMode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
