import type { ReactNode } from 'react';

interface SidebarPanelProps {
  dimensionsContent: ReactNode;
  spacerContent: ReactNode;
  onClearCanvas: () => void;
  onReset: () => void;
  isReadOnly: boolean;
}

export function SidebarPanel({
  dimensionsContent,
  spacerContent,
  onClearCanvas,
  onReset,
  isReadOnly,
}: SidebarPanelProps) {
  return (
    <section className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-nav-row sidebar-nav-heading">
          <span className="sidebar-nav-icon">⊞</span>
          <span className="sidebar-nav-label">GRID SETTINGS</span>
        </div>

        {!isReadOnly && (
          <button className="sidebar-nav-row sidebar-nav-action" onClick={onClearCanvas} type="button">
            <span className="sidebar-nav-icon">✕</span>
            <span className="sidebar-nav-label">CLEAR CANVAS</span>
          </button>
        )}

        <button className="sidebar-nav-row sidebar-nav-action" onClick={onReset} type="button">
          <span className="sidebar-nav-icon">↺</span>
          <span className="sidebar-nav-label">RESET</span>
        </button>
      </nav>

      <div className="sidebar-content-area">
        <div className="sidebar-settings-group">
          <span className="sidebar-settings-group-label">Dimensions</span>
          {dimensionsContent}
        </div>

        <div className="sidebar-settings-group">
          {spacerContent}
        </div>
      </div>
    </section>
  );
}
