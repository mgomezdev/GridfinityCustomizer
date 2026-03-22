import { useState } from 'react';
import type { ReactNode } from 'react';

type ActiveSection = 'dimensions' | 'grid-settings';

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
  const [activeSection, setActiveSection] = useState<ActiveSection>('dimensions');

  return (
    <section className="sidebar">
      {/* Vertical tab nav — all rows always visible */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-row${activeSection === 'dimensions' ? ' active' : ''}`}
          onClick={() => setActiveSection('dimensions')}
          type="button"
        >
          <span className="sidebar-nav-icon">⊞</span>
          <span className="sidebar-nav-label">DIMENSIONS</span>
        </button>

        <button
          className={`sidebar-nav-row${activeSection === 'grid-settings' ? ' active' : ''}`}
          onClick={() => setActiveSection('grid-settings')}
          type="button"
        >
          <span className="sidebar-nav-icon">⊟</span>
          <span className="sidebar-nav-label">GRID SETTINGS</span>
        </button>

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

      {/* Content area below the nav */}
      <div className="sidebar-content-area">
        {activeSection === 'dimensions' ? dimensionsContent : spacerContent}
      </div>
    </section>
  );
}
