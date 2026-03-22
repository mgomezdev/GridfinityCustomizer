import { useState } from 'react';
import type { ReactNode } from 'react';

interface SidebarPanelProps {
  sidebarTab: 'items' | 'images';
  onTabChange: (tab: 'items' | 'images') => void;
  itemLibraryContent: ReactNode;
  imageTabContent: ReactNode;
  selectionControls: ReactNode;
  dimensionsContent: ReactNode;
  spacerContent: ReactNode;
}

export function SidebarPanel({
  sidebarTab,
  onTabChange,
  itemLibraryContent,
  imageTabContent,
  selectionControls,
  dimensionsContent,
  spacerContent,
}: SidebarPanelProps) {
  const [dimsOpen, setDimsOpen] = useState(true);
  const [spacersOpen, setSpacersOpen] = useState(false);

  return (
    <section className="sidebar">
      <div className="sidebar-section">
        <button
          className={`sidebar-section-header${dimsOpen ? ' open' : ''}`}
          onClick={() => setDimsOpen(o => !o)}
          type="button"
          aria-expanded={dimsOpen}
        >
          <span className="sidebar-section-title">DIMENSIONS</span>
          <span className="sidebar-section-chevron">{dimsOpen ? '▲' : '▼'}</span>
        </button>
        {dimsOpen && (
          <div className="sidebar-section-content">
            {dimensionsContent}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-section-header${spacersOpen ? ' open' : ''}`}
          onClick={() => setSpacersOpen(o => !o)}
          type="button"
          aria-expanded={spacersOpen}
        >
          <span className="sidebar-section-title">SPACER SETTINGS</span>
          <span className="sidebar-section-chevron">{spacersOpen ? '▲' : '▼'}</span>
        </button>
        {spacersOpen && (
          <div className="sidebar-section-content">
            {spacerContent}
          </div>
        )}
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${sidebarTab === 'items' ? ' active' : ''}`}
          onClick={() => onTabChange('items')}
          type="button"
        >
          Items
        </button>
        <button
          className={`sidebar-tab${sidebarTab === 'images' ? ' active' : ''}`}
          onClick={() => onTabChange('images')}
          type="button"
        >
          Images
        </button>
      </div>

      {sidebarTab === 'items' ? itemLibraryContent : imageTabContent}

      {selectionControls}
    </section>
  );
}
