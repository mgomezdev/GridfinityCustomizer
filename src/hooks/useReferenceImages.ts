import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReferenceImage, InteractionMode, Rotation } from '../types/gridfinity';
import { fileToDataUrl } from '../utils/imageUtils';
import { STORAGE_KEYS } from '../utils/storageKeys';

const STORAGE_KEY = STORAGE_KEYS.REFERENCE_IMAGES;
const DEFAULT_INTERACTION_MODE: InteractionMode = 'items';
const STORAGE_DEBOUNCE_MS = 300;

const ROTATION_CW: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 };
const ROTATION_CCW: Record<Rotation, Rotation> = { 0: 270, 90: 0, 180: 90, 270: 180 };

export interface UseReferenceImagesReturn {
  images: ReferenceImage[];
  interactionMode: InteractionMode;

  // CRUD operations
  addImage: (file: File) => Promise<void>;
  removeImage: (id: string) => void;

  // Property updates
  updateImagePosition: (id: string, x: number, y: number) => void;
  updateImageScale: (id: string, scale: number) => void;
  updateImageOpacity: (id: string, opacity: number) => void;
  updateImageRotation: (id: string, direction: 'cw' | 'ccw') => void;
  toggleImageLock: (id: string) => void;

  // Mode toggle
  setInteractionMode: (mode: InteractionMode) => void;
}

function generateImageId(): string {
  return `image-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()}`;
}

function loadImagesFromStorage(): ReferenceImage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const images: ReferenceImage[] = JSON.parse(stored);

    // Validate structure
    if (!Array.isArray(images)) {
      return [];
    }

    // Validate each image has required fields
    for (const img of images) {
      if (
        !img.id ||
        !img.name ||
        !img.dataUrl ||
        typeof img.x !== 'number' ||
        typeof img.y !== 'number' ||
        typeof img.width !== 'number' ||
        typeof img.height !== 'number' ||
        typeof img.opacity !== 'number' ||
        typeof img.scale !== 'number' ||
        typeof img.isLocked !== 'boolean'
      ) {
        console.warn('Invalid image data found in localStorage, skipping');
        return [];
      }
      // Migrate legacy data: default missing rotation to 0
      if (typeof img.rotation !== 'number') {
        img.rotation = 0;
      }
    }

    return images;
  } catch (err) {
    console.error('Failed to load reference images from localStorage', err);
    return [];
  }
}

function saveImagesToStorage(images: ReferenceImage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch (err) {
    console.error('Failed to save reference images to localStorage', err);
    throw new Error('Failed to save images. Storage quota may be exceeded.');
  }
}

export function useReferenceImages(): UseReferenceImagesReturn {
  // Use lazy initializer to load images from localStorage on mount
  const [images, setImages] = useState<ReferenceImage[]>(() => loadImagesFromStorage());
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(DEFAULT_INTERACTION_MODE);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save — for frequent operations like drag/slider
  const debouncedSave = useCallback((imgs: ReferenceImage[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveImagesToStorage(imgs);
      debounceTimerRef.current = null;
    }, STORAGE_DEBOUNCE_MS);
  }, []);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const addImage = useCallback(async (file: File): Promise<void> => {
    try {
      const dataUrl = await fileToDataUrl(file);

      const newImage: ReferenceImage = {
        id: generateImageId(),
        name: file.name,
        dataUrl,
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        opacity: 0.5,
        scale: 1,
        isLocked: false,
        rotation: 0,
      };

      // Capture storage errors to re-throw asynchronously
      let storageError: Error | null = null;

      setImages(prev => {
        try {
          const updatedImages = [...prev, newImage];
          saveImagesToStorage(updatedImages);
          return updatedImages;
        } catch (err) {
          // Capture error but don't update state on storage failure
          storageError = err instanceof Error ? err : new Error('Storage failed');
          return prev;
        }
      });

      // Re-throw after state setter completes to make error async
      if (storageError) {
        throw storageError;
      }
    } catch (err) {
      console.error('Failed to add image', err);
      throw err;
    }
  }, []);

  const removeImage = useCallback((id: string): void => {
    setImages(prev => {
      const imageExists = prev.find(img => img.id === id);
      if (!imageExists) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = prev.filter(img => img.id !== id);
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

  const updateImagePosition = useCallback((id: string, x: number, y: number): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      if (prev[imageIndex].isLocked) {
        console.warn(`Image with id "${id}" is locked`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], x, y };
      debouncedSave(updatedImages);
      return updatedImages;
    });
  }, [debouncedSave]);

  const updateImageScale = useCallback((id: string, scale: number): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], scale };
      debouncedSave(updatedImages);
      return updatedImages;
    });
  }, [debouncedSave]);

  const updateImageOpacity = useCallback((id: string, opacity: number): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], opacity };
      debouncedSave(updatedImages);
      return updatedImages;
    });
  }, [debouncedSave]);

  const updateImageRotation = useCallback((id: string, direction: 'cw' | 'ccw'): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const currentRotation = prev[imageIndex].rotation;
      const newRotation = direction === 'cw'
        ? ROTATION_CW[currentRotation]
        : ROTATION_CCW[currentRotation];
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], rotation: newRotation };
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

  const toggleImageLock = useCallback((id: string): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        isLocked: !updatedImages[imageIndex].isLocked,
      };
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

  return {
    images,
    interactionMode,
    addImage,
    removeImage,
    updateImagePosition,
    updateImageScale,
    updateImageOpacity,
    updateImageRotation,
    toggleImageLock,
    setInteractionMode,
  };
}
