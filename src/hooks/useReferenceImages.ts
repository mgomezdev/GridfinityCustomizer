import { useState, useCallback } from 'react';
import type { ReferenceImage, InteractionMode, Rotation } from '../types/gridfinity';
import { fileToDataUrl } from '../utils/imageUtils';

const STORAGE_KEY = 'gridfinity-reference-images';
const DEFAULT_INTERACTION_MODE: InteractionMode = 'items';

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

      setImages(prev => {
        const updatedImages = [...prev, newImage];
        saveImagesToStorage(updatedImages);
        return updatedImages;
      });
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
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

  const updateImageScale = useCallback((id: string, scale: number): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], scale };
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

  const updateImageOpacity = useCallback((id: string, opacity: number): void => {
    setImages(prev => {
      const imageIndex = prev.findIndex(img => img.id === id);
      if (imageIndex === -1) {
        console.warn(`Image with id "${id}" not found`);
        return prev;
      }
      const updatedImages = [...prev];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], opacity };
      saveImagesToStorage(updatedImages);
      return updatedImages;
    });
  }, []);

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
