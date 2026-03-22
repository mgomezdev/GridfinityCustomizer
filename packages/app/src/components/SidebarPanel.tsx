import { useState } from 'react';
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
  const [dimsOpen, setDimsOpen] = useState(true);
  const [gridSettingsOpen, setGridSettingsOpen] = useState(false);

  return (
    <section className="sidebar">
      <div className="sidebar-section">
        <button
          className={`sidebar-section-header${dimsOpen ? ' open' : ''}`}
          onClick={() => setDimsOpen(o => !o)}
          type="button"
          aria-expanded={dimsOpen}
        >
          <span className="sidebar-section-icon">⊞</span>
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
          className={`sidebar-section-header${gridSettingsOpen ? ' open' : ''}`}
          onClick={() => setGridSettingsOpen(o => !o)}
          type="button"
          aria-expanded={gridSettingsOpen}
        >
          <span className="sidebar-section-icon">⊟</span>
          <span className="sidebar-section-title">GRID SETTINGS</span>
          <span className="sidebar-section-chevron">{gridSettingsOpen ? '▲' : '▼'}</span>
        </button>
        {gridSettingsOpen && (
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
