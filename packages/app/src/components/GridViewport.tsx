import { useEffect, useRef, type ReactNode, type RefObject, type MutableRefObject } from 'react';
import type { GridTransform } from '../hooks/useGridTransform';

interface GridViewportProps {
  children: ReactNode;
  transform: GridTransform;
  handleWheel: (e: WheelEvent, rect: DOMRect) => void;
  setZoomLevel: (zoom: number) => void;
  pan: (dx: number, dy: number) => void;
  isSpaceHeldRef: MutableRefObject<boolean>;
  viewportRef?: RefObject<HTMLDivElement | null>;
}

export function GridViewport({
  children,
  transform,
  handleWheel,
  setZoomLevel,
  pan,
  isSpaceHeldRef,
  viewportRef: externalRef,
}: GridViewportProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = externalRef ?? internalRef;
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const isTransformed = transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0;

  // Wheel zoom handler
  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      const rect = viewport.getBoundingClientRect();
      handleWheel(e, rect);
    };

    // passive: false is required -- handler calls preventDefault() to capture wheel zoom
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [handleWheel, ref]);

  // Middle-mouse and space+drag pan
  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || isSpaceHeldRef.current) {
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        viewport.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = (e.clientX - panStartRef.current.x) / transform.zoom;
      const dy = (e.clientY - panStartRef.current.y) / transform.zoom;
      pan(dx, dy);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        viewport.style.cursor = isSpaceHeldRef.current ? 'grab' : '';
      }
    };

    viewport.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      viewport.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pan, transform.zoom, isSpaceHeldRef, ref]);

  // Pinch-to-zoom touch support
  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;

    let lastPinchDist = 0;
    let lastPinchZoom = 1;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDist = getDistance(e.touches[0], e.touches[1]);
        lastPinchZoom = transform.zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / lastPinchDist;
        setZoomLevel(lastPinchZoom * scale);
      }
    };

    // passive: false is required -- handlers call preventDefault() to capture pinch-to-zoom
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
    };
  }, [transform.zoom, setZoomLevel, ref]);

  return (
    <div
      ref={ref}
      className={`preview-viewport${isTransformed ? ' zoomed' : ''}`}
      data-testid="preview-viewport"
    >
      <div
        className={`preview-content${isTransformed ? ' transformed' : ''}`}
        style={isTransformed ? {
          transform: `scale(${transform.zoom}) translate(${transform.panX}px, ${transform.panY}px)`,
          transformOrigin: '0 0',
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
