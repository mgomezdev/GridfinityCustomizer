import type { ReactNode } from 'react';

interface SidebarPanelProps {
  sidebarTab: 'items' | 'images';
  onTabChange: (tab: 'items' | 'images') => void;
  itemLibraryContent: ReactNode;
  imageTabContent: ReactNode;
  selectionControls: ReactNode;
}

export function SidebarPanel({
  sidebarTab,
  onTabChange,
  itemLibraryContent,
  imageTabContent,
  selectionControls,
}: SidebarPanelProps) {
  return (
    <section className="sidebar">
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
