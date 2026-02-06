import { useState, useCallback } from 'react';
import type { ReferenceImage, InteractionMode } from '../types/gridfinity';
import { fileToDataUrl } from '../utils/imageUtils';

const STORAGE_KEY = 'gridfinity-reference-images';
const DEFAULT_INTERACTION_MODE: InteractionMode = 'items';

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
        x: 10, // Default position (percentage)
        y: 10, // Default position (percentage)
        width: 50, // Default width (percentage)
        height: 50, // Default height (percentage)
        opacity: 0.5, // Default opacity (semi-transparent)
        scale: 1, // Default scale
        isLocked: false,
      };

      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      saveImagesToStorage(updatedImages);
    } catch (err) {
      console.error('Failed to add image', err);
      throw err;
    }
  }, [images]);

  const removeImage = useCallback((id: string): void => {
    const imageExists = images.find(img => img.id === id);

    if (!imageExists) {
      console.warn(`Image with id "${id}" not found`);
      return;
    }

    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    saveImagesToStorage(updatedImages);
  }, [images]);

  const updateImagePosition = useCallback((id: string, x: number, y: number): void => {
    const imageIndex = images.findIndex(img => img.id === id);

    if (imageIndex === -1) {
      console.warn(`Image with id "${id}" not found`);
      return;
    }

    // Don't update if image is locked
    if (images[imageIndex].isLocked) {
      console.warn(`Image with id "${id}" is locked`);
      return;
    }

    const updatedImages = [...images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      x,
      y,
    };

    setImages(updatedImages);
    saveImagesToStorage(updatedImages);
  }, [images]);

  const updateImageScale = useCallback((id: string, scale: number): void => {
    const imageIndex = images.findIndex(img => img.id === id);

    if (imageIndex === -1) {
      console.warn(`Image with id "${id}" not found`);
      return;
    }

    const updatedImages = [...images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      scale,
    };

    setImages(updatedImages);
    saveImagesToStorage(updatedImages);
  }, [images]);

  const updateImageOpacity = useCallback((id: string, opacity: number): void => {
    const imageIndex = images.findIndex(img => img.id === id);

    if (imageIndex === -1) {
      console.warn(`Image with id "${id}" not found`);
      return;
    }

    const updatedImages = [...images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      opacity,
    };

    setImages(updatedImages);
    saveImagesToStorage(updatedImages);
  }, [images]);

  const toggleImageLock = useCallback((id: string): void => {
    const imageIndex = images.findIndex(img => img.id === id);

    if (imageIndex === -1) {
      console.warn(`Image with id "${id}" not found`);
      return;
    }

    const updatedImages = [...images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      isLocked: !updatedImages[imageIndex].isLocked,
    };

    setImages(updatedImages);
    saveImagesToStorage(updatedImages);
  }, [images]);

  return {
    images,
    interactionMode,
    addImage,
    removeImage,
    updateImagePosition,
    updateImageScale,
    updateImageOpacity,
    toggleImageLock,
    setInteractionMode,
  };
}
