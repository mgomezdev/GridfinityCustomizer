import type { Page, Locator } from '@playwright/test';

/**
 * Performs HTML5 drag and drop with proper dataTransfer handling.
 * This simulates the full drag-and-drop flow that React components expect.
 */
export async function html5DragDrop(
  page: Page,
  source: Locator,
  target: Locator,
  targetPosition?: { x: number; y: number }
): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding box for drag operation');
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;

  let dropX: number, dropY: number;
  if (targetPosition) {
    dropX = targetBox.x + targetPosition.x;
    dropY = targetBox.y + targetPosition.y;
  } else {
    dropX = targetBox.x + targetBox.width / 2;
    dropY = targetBox.y + targetBox.height / 2;
  }

  // Execute the drag and drop in browser context with proper event simulation
  await page.evaluate(
    async ({ sourceX, sourceY, dropX, dropY }) => {
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Find elements at the coordinates
      const sourceElement = document.elementFromPoint(sourceX, sourceY) as HTMLElement;
      let targetElement = document.elementFromPoint(dropX, dropY) as HTMLElement;

      if (!sourceElement) {
        throw new Error('Could not find source element at coordinates');
      }

      // Find the draggable element (may be a parent)
      const draggable = sourceElement.closest('[draggable="true"]') as HTMLElement;
      if (!draggable) {
        throw new Error('Could not find draggable element');
      }

      // Store the data that would be set during dragstart
      // We need to capture this and pass it through manually
      let storedData: Record<string, string> = {};

      // Create a proxy dataTransfer that stores and retrieves data
      const createDataTransfer = () => {
        const dt = new DataTransfer();
        return {
          dataTransfer: dt,
          setData: (type: string, data: string) => {
            storedData[type] = data;
            try { dt.setData(type, data); } catch (e) { /* ignore */ }
          },
          getData: (type: string) => {
            return storedData[type] || '';
          },
          get types() { return Object.keys(storedData); },
          effectAllowed: 'copy' as string,
          dropEffect: 'none' as string,
        };
      };

      const transfer = createDataTransfer();

      // Dispatch dragstart
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        clientX: sourceX,
        clientY: sourceY,
      });

      // Manually set dataTransfer with our proxy
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          setData: transfer.setData,
          getData: transfer.getData,
          get types() { return transfer.types; },
          effectAllowed: transfer.effectAllowed,
          dropEffect: transfer.dropEffect,
        },
        writable: false,
      });

      draggable.dispatchEvent(dragStartEvent);
      await sleep(50);

      // Re-find target element in case DOM changed
      targetElement = document.elementFromPoint(dropX, dropY) as HTMLElement;
      if (!targetElement) {
        throw new Error('Could not find target element at coordinates');
      }

      // Find the grid-container for drop events
      const gridContainer = targetElement.closest('.grid-container') || targetElement;

      // Dispatch dragover
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: dropX,
        clientY: dropY,
      });
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: {
          setData: transfer.setData,
          getData: transfer.getData,
          get types() { return transfer.types; },
          effectAllowed: transfer.effectAllowed,
          dropEffect: 'copy',
        },
        writable: false,
      });
      gridContainer.dispatchEvent(dragOverEvent);
      await sleep(50);

      // Dispatch drop
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: dropX,
        clientY: dropY,
      });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          setData: transfer.setData,
          getData: transfer.getData,
          get types() { return transfer.types; },
          effectAllowed: transfer.effectAllowed,
          dropEffect: 'copy',
        },
        writable: false,
      });
      gridContainer.dispatchEvent(dropEvent);
      await sleep(50);

      // Dispatch dragend
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
      });
      draggable.dispatchEvent(dragEndEvent);
    },
    { sourceX, sourceY, dropX, dropY }
  );

  // Wait for React state to update
  await page.waitForTimeout(150);
}

/**
 * Drags an element to a specific grid cell position
 */
export async function dragToGridCell(
  page: Page,
  source: Locator,
  gridContainer: Locator,
  cellX: number,
  cellY: number,
  gridWidth: number,
  gridHeight: number
): Promise<void> {
  const gridBox = await gridContainer.boundingBox();

  if (!gridBox) {
    throw new Error('Could not get bounding box for grid container');
  }

  const cellWidth = gridBox.width / gridWidth;
  const cellHeight = gridBox.height / gridHeight;

  // Calculate target position within the target element
  const targetX = (cellX + 0.5) * cellWidth;
  const targetY = (cellY + 0.5) * cellHeight;

  await html5DragDrop(page, source, gridContainer, { x: targetX, y: targetY });
}

/**
 * Gets the grid container element
 */
export function getGridContainer(page: Page): Locator {
  return page.locator('.grid-container');
}

/**
 * Gets a library item card by name
 */
export function getLibraryItemByName(page: Page, name: string): Locator {
  return page.locator('.library-item-card').filter({ hasText: name });
}

/**
 * Gets a placed item overlay by its position
 */
export function getPlacedItemAt(page: Page, x: number, y: number): Locator {
  return page.locator('.placed-item').filter({
    has: page.locator(`[data-x="${x}"][data-y="${y}"]`)
  });
}

/**
 * Gets all placed items on the grid
 */
export function getAllPlacedItems(page: Page): Locator {
  return page.locator('.placed-item');
}

/**
 * Performs a drag and drop using the native HTML5 drag and drop API
 * This is more reliable for components using dataTransfer
 */
export async function dragAndDropToGrid(
  page: Page,
  source: Locator,
  targetX: number,
  targetY: number
): Promise<void> {
  const gridContainer = getGridContainer(page);
  const gridBox = await gridContainer.boundingBox();

  if (!gridBox) {
    throw new Error('Could not get grid container bounding box');
  }

  // Get grid dimensions from the DOM
  const gridStyle = await gridContainer.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      rows: style.gridTemplateRows.split(' ').length,
    };
  });

  const cellWidth = gridBox.width / gridStyle.columns;
  const cellHeight = gridBox.height / gridStyle.rows;

  const dropX = gridBox.x + (targetX + 0.5) * cellWidth;
  const dropY = gridBox.y + (targetY + 0.5) * cellHeight;

  // Use Playwright's built-in drag and drop with precise target coordinates
  await source.dragTo(gridContainer, {
    targetPosition: {
      x: (targetX + 0.5) * cellWidth,
      y: (targetY + 0.5) * cellHeight,
    },
  });
}
