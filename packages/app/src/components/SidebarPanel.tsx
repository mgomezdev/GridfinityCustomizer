import { useState } from 'react';
import type { ReactNode } from 'react';

type ActiveSection = 'dimensions' | 'grid-settings' | null;

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

  const toggle = (section: ActiveSection) =>
    setActiveSection(prev => (prev === section ? null : section));

  return (
    <section className="sidebar">
      <div className="sidebar-section">
        <button
          className={`sidebar-section-header${activeSection === 'dimensions' ? ' open' : ''}`}
          onClick={() => toggle('dimensions')}
          type="button"
          aria-expanded={activeSection === 'dimensions'}
        >
          <span className="sidebar-section-icon">⊞</span>
          <span className="sidebar-section-title">DIMENSIONS</span>
          <span className="sidebar-section-chevron">{activeSection === 'dimensions' ? '▲' : '▼'}</span>
        </button>
        {activeSection === 'dimensions' && (
          <div className="sidebar-section-content">
            {dimensionsContent}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-section-header${activeSection === 'grid-settings' ? ' open' : ''}`}
          onClick={() => toggle('grid-settings')}
          type="button"
          aria-expanded={activeSection === 'grid-settings'}
        >
          <span className="sidebar-section-icon">⊟</span>
          <span className="sidebar-section-title">GRID SETTINGS</span>
          <span className="sidebar-section-chevron">{activeSection === 'grid-settings' ? '▲' : '▼'}</span>
        </button>
        {activeSection === 'grid-settings' && (
          <div className="sidebar-section-content">
            {spacerContent}
          </div>
        )}
      </div>

      {!isReadOnly && (
        <button className="sidebar-action-row" onClick={onClearCanvas} type="button">
          <span className="sidebar-section-icon sidebar-action-icon">✕</span>
          <span className="sidebar-section-title">CLEAR CANVAS</span>
        </button>
      )}

      <button className="sidebar-action-row" onClick={onReset} type="button">
        <span className="sidebar-section-icon sidebar-action-icon">↺</span>
        <span className="sidebar-section-title">RESET</span>
      </button>
    </section>
  );
}
