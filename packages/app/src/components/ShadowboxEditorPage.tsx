import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { generateShadowbox } from '../api/shadowboxes.api';
import { SHADOWBOXES_QUERY_KEY } from '../hooks/useShadowboxes';
import { useAuth } from '../contexts/AuthContext';

interface EditorState {
  shadowboxId: string;
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
  thicknessMm: number;
  name: string;
}

interface Point {
  x: number;
  y: number;
}

function parseSvgPath(svgPath: string): Point[] {
  const points: Point[] = [];
  const tokens = svgPath.trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') {
      points.push({ x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) });
    }
    // Skip Z and other commands
  }
  return points;
}

function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

function loadEditorState(): EditorState | null {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return null;
  const raw = sessionStorage.getItem(`shadowbox-edit-${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorState;
  } catch {
    return null;
  }
}

export function ShadowboxEditorPage() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const editorState = useRef<EditorState | null>(loadEditorState());
  const state = editorState.current;

  const initialPoints = state ? parseSvgPath(state.svgPath) : [];
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [tolerance, setTolerance] = useState(0.4);
  const [stackable, setStackable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SVG drag state
  const draggingIndex = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute viewBox from points or fall back to a default
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = allX.length > 0 ? Math.min(...allX) : -50;
  const minY = allY.length > 0 ? Math.min(...allY) : -50;
  const maxX = allX.length > 0 ? Math.max(...allX) : 50;
  const maxY = allY.length > 0 ? Math.max(...allY) : 50;
  const padding = 10;
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;

  const getSvgPoint = useCallback((e: React.MouseEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingIndex.current = index;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex.current === null) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    setPoints(prev => {
      const next = [...prev];
      next[draggingIndex.current!] = pt;
      return next;
    });
  }, [getSvgPoint]);

  const handleMouseUp = useCallback(() => {
    draggingIndex.current = null;
  }, []);

  const handleGenerate = async () => {
    if (!state) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      await generateShadowbox({
        shadowboxId: state.shadowboxId,
        svgPath: pointsToSvgPath(points),
        rotationDeg: 0,
        toleranceMm: tolerance,
        stackable,
      }, token);
      await queryClient.invalidateQueries({ queryKey: SHADOWBOXES_QUERY_KEY });
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!state) {
    return (
      <div className="shadowbox-editor-page">
        <p>No editor state found. Please go back and upload an image.</p>
      </div>
    );
  }

  const pathD = pointsToSvgPath(points);

  return (
    <div className="shadowbox-editor-page">
      <h1>Edit Shadowbox: {state.name}</h1>

      <svg
        ref={svgRef}
        role="img"
        aria-label="shadowbox preview"
        viewBox={viewBox}
        style={{ width: '100%', maxWidth: 600, border: '1px solid #ccc', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {pathD && (
          <path
            d={pathD}
            fill="rgba(100, 149, 237, 0.2)"
            stroke="#3b82f6"
            strokeWidth="0.5"
          />
        )}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill="#3b82f6"
            stroke="white"
            strokeWidth="0.5"
            style={{ cursor: 'grab' }}
            onMouseDown={handleMouseDown(i)}
          />
        ))}
      </svg>

      <div className="editor-controls">
        <div className="form-field">
          <label htmlFor="tolerance">Tolerance ({tolerance} mm)</label>
          <input
            type="range"
            id="tolerance"
            min="0.1"
            max="1.0"
            step="0.1"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="stackable">Stackable</label>
          <input
            type="checkbox"
            id="stackable"
            checked={stackable}
            onChange={(e) => setStackable(e.target.checked)}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="editor-error">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Generating…' : 'Generate & Save'}
      </button>
    </div>
  );
}
