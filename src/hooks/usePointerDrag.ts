import { useCallback, useRef, useEffect } from 'react';
import type { DragData } from '../types/gridfinity';

// --- Module-level drag store (side-channel replacing HTML5 dataTransfer) ---

interface ActiveDrag {
  data: DragData;
  ghostElement: HTMLElement | null;
  sourceElement: HTMLElement;
  offsetX: number;
  offsetY: number;
}

interface DropTargetConfig {
  element: HTMLElement;
  gridX: number;
  gridY: number;
  onDrop: (dragData: DragData, x: number, y: number) => void;
}

let activeDrag: ActiveDrag | null = null;
let registeredDropTarget: DropTargetConfig | null = null;

const DRAG_THRESHOLD = 5; // pixels — below this, treat as tap

export function getActiveDrag(): ActiveDrag | null {
  return activeDrag;
}

export function clearActiveDrag(): void {
  if (activeDrag?.ghostElement) {
    activeDrag.ghostElement.remove();
  }
  activeDrag = null;
}

export function registerDropTarget(config: DropTargetConfig): void {
  registeredDropTarget = config;
}

export function unregisterDropTarget(): void {
  registeredDropTarget = null;
}

// --- Ghost element ---

function createGhostElement(sourceElement: HTMLElement): HTMLElement {
  const ghost = sourceElement.cloneNode(true) as HTMLElement;
  const rect = sourceElement.getBoundingClientRect();

  ghost.style.position = 'fixed';
  ghost.style.zIndex = '10000';
  ghost.style.pointerEvents = 'none';
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.opacity = '0.7';
  ghost.style.transition = 'none';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.margin = '0';
  ghost.setAttribute('data-drag-ghost', 'true');

  document.body.appendChild(ghost);
  return ghost;
}

// --- Drop detection ---

function attemptDrop(clientX: number, clientY: number): void {
  if (!activeDrag || !registeredDropTarget) return;

  // Hide ghost so elementFromPoint can find the real element underneath
  if (activeDrag.ghostElement) {
    activeDrag.ghostElement.style.display = 'none';
  }

  const elementUnder = document.elementFromPoint(clientX, clientY);
  const gridContainer = elementUnder?.closest('.grid-container');

  if (gridContainer && gridContainer === registeredDropTarget.element) {
    const rect = registeredDropTarget.element.getBoundingClientRect();
    const cellWidth = rect.width / registeredDropTarget.gridX;
    const cellHeight = rect.height / registeredDropTarget.gridY;
    const dropX = Math.floor((clientX - rect.left) / cellWidth);
    const dropY = Math.floor((clientY - rect.top) / cellHeight);
    const clampedX = Math.max(0, Math.min(dropX, registeredDropTarget.gridX - 1));
    const clampedY = Math.max(0, Math.min(dropY, registeredDropTarget.gridY - 1));

    registeredDropTarget.onDrop(activeDrag.data, clampedX, clampedY);
  }
}

// --- usePointerDragSource hook ---

interface PointerDragSourceOptions {
  dragData: DragData;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTap?: (e: PointerEvent) => void;
}

interface PointerDragSourceResult {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function usePointerDragSource(
  options: PointerDragSourceOptions
): PointerDragSourceResult {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const activePointerIdRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activePointerIdRef.current !== null) {
        clearActiveDrag();
        activePointerIdRef.current = null;
      }
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary button (left click / single touch)
    if (e.button !== 0) return;

    // Don't interfere with buttons (delete, rotate, etc.)
    if ((e.target as HTMLElement).closest('button')) return;

    // Ignore if already tracking a pointer
    if (activePointerIdRef.current !== null) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const sourceElement = e.currentTarget as HTMLElement;
    let isDragging = false;
    activePointerIdRef.current = e.pointerId;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Only track the pointer we started with
      if (moveEvent.pointerId !== activePointerIdRef.current) return;

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!isDragging && distance >= DRAG_THRESHOLD) {
        isDragging = true;

        const rect = sourceElement.getBoundingClientRect();
        activeDrag = {
          data: optionsRef.current.dragData,
          ghostElement: createGhostElement(sourceElement),
          sourceElement,
          offsetX: startX - rect.left,
          offsetY: startY - rect.top,
        };

        sourceElement.classList.add('pointer-dragging');
        optionsRef.current.onDragStart?.();
      }

      if (isDragging && activeDrag?.ghostElement) {
        activeDrag.ghostElement.style.left = `${moveEvent.clientX - activeDrag.offsetX}px`;
        activeDrag.ghostElement.style.top = `${moveEvent.clientY - activeDrag.offsetY}px`;
      }
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
      sourceElement.classList.remove('pointer-dragging');
      activePointerIdRef.current = null;
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== activePointerIdRef.current) return;

      if (!isDragging) {
        // Below threshold — this was a tap
        cleanup();
        optionsRef.current.onTap?.(upEvent);
      } else {
        // End of drag — attempt drop
        attemptDrop(upEvent.clientX, upEvent.clientY);
        clearActiveDrag();
        cleanup();
        optionsRef.current.onDragEnd?.();
      }
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== activePointerIdRef.current) return;
      clearActiveDrag();
      cleanup();
      optionsRef.current.onDragEnd?.();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
  }, []);

  return { onPointerDown };
}

// --- usePointerDropTarget hook ---

interface PointerDropTargetOptions {
  gridRef: React.RefObject<HTMLDivElement | null>;
  gridX: number;
  gridY: number;
  onDrop: (dragData: DragData, x: number, y: number) => void;
}

export function usePointerDropTarget(options: PointerDropTargetOptions): void {
  const { gridRef, gridX, gridY, onDrop } = options;

  useEffect(() => {
    const el = gridRef.current;
    if (!el || gridX <= 0 || gridY <= 0) return;

    registerDropTarget({ element: el, gridX, gridY, onDrop });

    return () => unregisterDropTarget();
  }, [gridRef, gridX, gridY, onDrop]);
}
