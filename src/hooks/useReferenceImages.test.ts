import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReferenceImages } from './useReferenceImages';
import * as imageUtils from '../utils/imageUtils';
import type { ReferenceImage } from '../types/gridfinity';

declare global {
  var crypto: Crypto;
  var structuredClone: <T>(value: T) => T;
}

describe('useReferenceImages', () => {
  const mockDataUrl = 'data:image/png;base64,mockBase64String';
  const mockFile = new File(['mock-image-data'], 'test-image.png', { type: 'image/png' });

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(imageUtils, 'fileToDataUrl').mockResolvedValue(mockDataUrl);

    // Mock crypto.randomUUID if not available
    if (!global.crypto.randomUUID) {
      global.crypto.randomUUID = vi.fn(() => 'mock-uuid-' + Date.now());
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty images array', () => {
      const { result } = renderHook(() => useReferenceImages());
      expect(result.current.images).toEqual([]);
    });

    it('should initialize with items interaction mode', () => {
      const { result } = renderHook(() => useReferenceImages());
      expect(result.current.interactionMode).toBe('items');
    });
  });

  describe('addImage', () => {
    it('should add a new image with default properties', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0]).toMatchObject({
        name: 'test-image.png',
        dataUrl: mockDataUrl,
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        opacity: 0.5,
        scale: 1,
        isLocked: false,
        rotation: 0,
      });
      expect(result.current.images[0].id).toBeTruthy();
    });

    it('should call fileToDataUrl with the file', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      expect(imageUtils.fileToDataUrl).toHaveBeenCalledWith(mockFile);
    });

    it('should generate unique IDs for each image', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
        await result.current.addImage(mockFile);
      });

      expect(result.current.images).toHaveLength(2);
      expect(result.current.images[0].id).not.toBe(result.current.images[1].id);
    });

    it('should save images to localStorage after adding', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const stored = localStorage.getItem('gridfinity-reference-images');
      expect(stored).toBeTruthy();
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('test-image.png');
    });

    it('should throw error when fileToDataUrl fails', async () => {
      vi.spyOn(imageUtils, 'fileToDataUrl').mockRejectedValue(new Error('File conversion failed'));
      const { result } = renderHook(() => useReferenceImages());

      await expect(
        act(async () => {
          await result.current.addImage(mockFile);
        })
      ).rejects.toThrow('File conversion failed');

      expect(result.current.images).toHaveLength(0);
    });

    it('should add multiple images', async () => {
      const { result } = renderHook(() => useReferenceImages());
      const file1 = new File(['data1'], 'image1.png', { type: 'image/png' });
      const file2 = new File(['data2'], 'image2.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.addImage(file1);
        await result.current.addImage(file2);
      });

      expect(result.current.images).toHaveLength(2);
      expect(result.current.images[0].name).toBe('image1.png');
      expect(result.current.images[1].name).toBe('image2.jpg');
    });
  });

  describe('removeImage', () => {
    it('should remove an image by id', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.removeImage(imageId);
      });

      expect(result.current.images).toHaveLength(0);
    });

    it('should save updated images to localStorage after removing', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.removeImage(imageId);
      });

      const stored = localStorage.getItem('gridfinity-reference-images');
      expect(stored).toBeTruthy();
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });

    it('should not affect other images when removing one', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
        await result.current.addImage(mockFile);
      });

      const firstId = result.current.images[0].id;
      const secondId = result.current.images[1].id;

      act(() => {
        result.current.removeImage(firstId);
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].id).toBe(secondId);
    });

    it('should handle removing non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.removeImage('non-existent-id');
      });

      expect(result.current.images).toHaveLength(1);
    });

    it('should handle removing from empty images array', () => {
      const { result } = renderHook(() => useReferenceImages());

      act(() => {
        result.current.removeImage('some-id');
      });

      expect(result.current.images).toHaveLength(0);
    });
  });

  describe('updateImagePosition', () => {
    it('should update image position', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImagePosition(imageId, 25, 30);
      });

      expect(result.current.images[0]).toMatchObject({
        x: 25,
        y: 30,
      });
    });

    it('should save updated position to localStorage', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImagePosition(imageId, 40, 50);
      });

      // Flush debounced save
      act(() => { vi.advanceTimersByTime(300); });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed[0]).toMatchObject({
        x: 40,
        y: 50,
      });
      vi.useRealTimers();
    });

    it('should not update position when image is locked', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      // Lock the image first
      act(() => {
        result.current.toggleImageLock(imageId);
      });

      expect(result.current.images[0].isLocked).toBe(true);

      // Try to update position
      act(() => {
        result.current.updateImagePosition(imageId, 100, 100);
      });

      // Position should remain at default (10, 10)
      expect(result.current.images[0]).toMatchObject({
        x: 10,
        y: 10,
      });
    });

    it('should handle updating position of non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.updateImagePosition('non-existent-id', 25, 30);
      });

      // Original image position should remain unchanged
      expect(result.current.images[0]).toMatchObject({
        x: 10,
        y: 10,
      });
    });

    it('should not affect other image properties when updating position', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;
      const originalScale = result.current.images[0].scale;
      const originalOpacity = result.current.images[0].opacity;

      act(() => {
        result.current.updateImagePosition(imageId, 20, 20);
      });

      expect(result.current.images[0].scale).toBe(originalScale);
      expect(result.current.images[0].opacity).toBe(originalOpacity);
    });
  });

  describe('updateImageScale', () => {
    it('should update image scale', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageScale(imageId, 1.5);
      });

      expect(result.current.images[0].scale).toBe(1.5);
    });

    it('should save updated scale to localStorage', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageScale(imageId, 2);
      });

      // Flush debounced save
      act(() => { vi.advanceTimersByTime(300); });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed[0].scale).toBe(2);
      vi.useRealTimers();
    });

    it('should handle updating scale of non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.updateImageScale('non-existent-id', 2);
      });

      // Original image scale should remain at default (1)
      expect(result.current.images[0].scale).toBe(1);
    });

    it('should allow updating scale when image is locked', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      // Lock the image
      act(() => {
        result.current.toggleImageLock(imageId);
      });

      // Scale should still be updatable
      act(() => {
        result.current.updateImageScale(imageId, 1.8);
      });

      expect(result.current.images[0].scale).toBe(1.8);
    });
  });

  describe('updateImageOpacity', () => {
    it('should update image opacity', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageOpacity(imageId, 0.8);
      });

      expect(result.current.images[0].opacity).toBe(0.8);
    });

    it('should save updated opacity to localStorage', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageOpacity(imageId, 0.3);
      });

      // Flush debounced save
      act(() => { vi.advanceTimersByTime(300); });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed[0].opacity).toBe(0.3);
      vi.useRealTimers();
    });

    it('should handle updating opacity of non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.updateImageOpacity('non-existent-id', 0.9);
      });

      // Original image opacity should remain at default (0.5)
      expect(result.current.images[0].opacity).toBe(0.5);
    });

    it('should allow updating opacity when image is locked', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      // Lock the image
      act(() => {
        result.current.toggleImageLock(imageId);
      });

      // Opacity should still be updatable
      act(() => {
        result.current.updateImageOpacity(imageId, 0.7);
      });

      expect(result.current.images[0].opacity).toBe(0.7);
    });
  });

  describe('toggleImageLock', () => {
    it('should toggle image lock state from false to true', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;
      expect(result.current.images[0].isLocked).toBe(false);

      act(() => {
        result.current.toggleImageLock(imageId);
      });

      expect(result.current.images[0].isLocked).toBe(true);
    });

    it('should toggle image lock state from true to false', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.toggleImageLock(imageId);
        result.current.toggleImageLock(imageId);
      });

      expect(result.current.images[0].isLocked).toBe(false);
    });

    it('should save updated lock state to localStorage', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.toggleImageLock(imageId);
      });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed[0].isLocked).toBe(true);
    });

    it('should handle toggling lock of non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.toggleImageLock('non-existent-id');
      });

      // Original image lock state should remain unchanged
      expect(result.current.images[0].isLocked).toBe(false);
    });
  });

  describe('updateImageRotation', () => {
    it('should rotate image CW: 0 -> 90 -> 180 -> 270 -> 0', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;
      expect(result.current.images[0].rotation).toBe(0);

      act(() => { result.current.updateImageRotation(imageId, 'cw'); });
      expect(result.current.images[0].rotation).toBe(90);

      act(() => { result.current.updateImageRotation(imageId, 'cw'); });
      expect(result.current.images[0].rotation).toBe(180);

      act(() => { result.current.updateImageRotation(imageId, 'cw'); });
      expect(result.current.images[0].rotation).toBe(270);

      act(() => { result.current.updateImageRotation(imageId, 'cw'); });
      expect(result.current.images[0].rotation).toBe(0);
    });

    it('should rotate image CCW: 0 -> 270 -> 180 -> 90 -> 0', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => { result.current.updateImageRotation(imageId, 'ccw'); });
      expect(result.current.images[0].rotation).toBe(270);

      act(() => { result.current.updateImageRotation(imageId, 'ccw'); });
      expect(result.current.images[0].rotation).toBe(180);

      act(() => { result.current.updateImageRotation(imageId, 'ccw'); });
      expect(result.current.images[0].rotation).toBe(90);

      act(() => { result.current.updateImageRotation(imageId, 'ccw'); });
      expect(result.current.images[0].rotation).toBe(0);
    });

    it('should save rotation to localStorage', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageRotation(imageId, 'cw');
      });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed[0].rotation).toBe(90);
    });

    it('should handle rotating non-existent image gracefully', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      act(() => {
        result.current.updateImageRotation('non-existent-id', 'cw');
      });

      expect(result.current.images[0].rotation).toBe(0);
    });
  });

  describe('setInteractionMode', () => {
    it('should switch from items to images mode', () => {
      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.interactionMode).toBe('items');

      act(() => {
        result.current.setInteractionMode('images');
      });

      expect(result.current.interactionMode).toBe('images');
    });

    it('should switch from images to items mode', () => {
      const { result } = renderHook(() => useReferenceImages());

      act(() => {
        result.current.setInteractionMode('images');
        result.current.setInteractionMode('items');
      });

      expect(result.current.interactionMode).toBe('items');
    });

    it('should allow setting the same mode multiple times', () => {
      const { result } = renderHook(() => useReferenceImages());

      act(() => {
        result.current.setInteractionMode('images');
        result.current.setInteractionMode('images');
      });

      expect(result.current.interactionMode).toBe('images');
    });
  });

  describe('localStorage persistence', () => {
    it('should load saved images from localStorage on mount', () => {
      const savedImages: ReferenceImage[] = [
        {
          id: 'saved-image-1',
          name: 'saved.png',
          dataUrl: 'data:image/png;base64,savedData',
          x: 20,
          y: 30,
          width: 60,
          height: 40,
          opacity: 0.7,
          scale: 1.2,
          isLocked: true,
          rotation: 90,
        },
      ];

      localStorage.setItem('gridfinity-reference-images', JSON.stringify(savedImages));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0]).toEqual(savedImages[0]);
    });

    it('should handle empty localStorage gracefully', () => {
      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should default missing rotation field to 0 for legacy data', () => {
      const legacyImages = [
        {
          id: 'legacy-image-1',
          name: 'legacy.png',
          dataUrl: 'data:image/png;base64,legacyData',
          x: 20,
          y: 30,
          width: 60,
          height: 40,
          opacity: 0.7,
          scale: 1.2,
          isLocked: false,
          // no rotation field - legacy data
        },
      ];

      localStorage.setItem('gridfinity-reference-images', JSON.stringify(legacyImages));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].rotation).toBe(0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('gridfinity-reference-images', 'invalid json');

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should handle non-array localStorage data gracefully', () => {
      localStorage.setItem('gridfinity-reference-images', JSON.stringify({ notAnArray: true }));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should handle invalid image data in localStorage gracefully', () => {
      const invalidImages = [
        {
          id: 'invalid-image',
          // missing required fields
        },
      ];

      localStorage.setItem('gridfinity-reference-images', JSON.stringify(invalidImages));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should validate all required fields when loading from localStorage', () => {
      const incompleteImage = {
        id: 'incomplete',
        name: 'test.png',
        dataUrl: 'data:image/png;base64,test',
        x: 10,
        y: 10,
        // missing width, height, opacity, scale, isLocked
      };

      localStorage.setItem('gridfinity-reference-images', JSON.stringify([incompleteImage]));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should validate field types when loading from localStorage', () => {
      const wrongTypes = [
        {
          id: 'wrong-types',
          name: 'test.png',
          dataUrl: 'data:image/png;base64,test',
          x: '10', // should be number
          y: 10,
          width: 50,
          height: 50,
          opacity: 0.5,
          scale: 1,
          isLocked: false,
        },
      ];

      localStorage.setItem('gridfinity-reference-images', JSON.stringify(wrongTypes));

      const { result } = renderHook(() => useReferenceImages());

      expect(result.current.images).toEqual([]);
    });

    it('should persist multiple images to localStorage', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
        await result.current.addImage(mockFile);
        await result.current.addImage(mockFile);
      });

      const stored = localStorage.getItem('gridfinity-reference-images');
      const parsed: ReferenceImage[] = JSON.parse(stored!);
      expect(parsed).toHaveLength(3);
    });

    it('should handle localStorage quota exceeded error', async () => {
      const { result } = renderHook(() => useReferenceImages());

      // Mock localStorage.setItem to throw quota exceeded error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // addImage should throw when storage fails
      await expect(
        act(async () => {
          await result.current.addImage(mockFile);
        })
      ).rejects.toThrow();

      // Image should not be added to state when storage fails
      expect(result.current.images).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating properties of the same image multiple times', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImagePosition(imageId, 15, 25);
        result.current.updateImageScale(imageId, 1.5);
        result.current.updateImageOpacity(imageId, 0.9);
        result.current.toggleImageLock(imageId);
      });

      expect(result.current.images[0]).toMatchObject({
        x: 15,
        y: 25,
        scale: 1.5,
        opacity: 0.9,
        isLocked: true,
      });
    });

    it('should handle boundary values for opacity (0)', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageOpacity(imageId, 0);
      });

      expect(result.current.images[0].opacity).toBe(0);
    });

    it('should handle boundary values for opacity (1)', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageOpacity(imageId, 1);
      });

      expect(result.current.images[0].opacity).toBe(1);
    });

    it('should handle negative scale values', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageScale(imageId, -1);
      });

      expect(result.current.images[0].scale).toBe(-1);
    });

    it('should handle very large scale values', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImageScale(imageId, 100);
      });

      expect(result.current.images[0].scale).toBe(100);
    });

    it('should handle negative position values', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImagePosition(imageId, -10, -20);
      });

      expect(result.current.images[0]).toMatchObject({
        x: -10,
        y: -20,
      });
    });

    it('should handle very large position values', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.updateImagePosition(imageId, 1000, 2000);
      });

      expect(result.current.images[0]).toMatchObject({
        x: 1000,
        y: 2000,
      });
    });

    it('should handle file with very long name', async () => {
      const longFileName = 'a'.repeat(300) + '.png';
      const longNameFile = new File(['data'], longFileName, { type: 'image/png' });
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(longNameFile);
      });

      expect(result.current.images[0].name).toBe(longFileName);
    });

    it('should handle multiple operations on multiple images', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
        await result.current.addImage(mockFile);
      });

      const firstId = result.current.images[0].id;
      const secondId = result.current.images[1].id;

      act(() => {
        result.current.updateImagePosition(firstId, 20, 20);
        result.current.updateImageScale(secondId, 2);
        result.current.toggleImageLock(firstId);
        result.current.updateImageOpacity(secondId, 0.3);
      });

      expect(result.current.images[0]).toMatchObject({
        x: 20,
        y: 20,
        isLocked: true,
      });

      expect(result.current.images[1]).toMatchObject({
        scale: 2,
        opacity: 0.3,
      });
    });

    it('should maintain image order after updates', async () => {
      const { result } = renderHook(() => useReferenceImages());
      const file1 = new File(['data1'], 'first.png', { type: 'image/png' });
      const file2 = new File(['data2'], 'second.png', { type: 'image/png' });
      const file3 = new File(['data3'], 'third.png', { type: 'image/png' });

      await act(async () => {
        await result.current.addImage(file1);
        await result.current.addImage(file2);
        await result.current.addImage(file3);
      });

      const secondId = result.current.images[1].id;

      act(() => {
        result.current.updateImagePosition(secondId, 50, 50);
      });

      expect(result.current.images[0].name).toBe('first.png');
      expect(result.current.images[1].name).toBe('second.png');
      expect(result.current.images[2].name).toBe('third.png');
    });
  });

  describe('Lock Behavior', () => {
    it('should prevent position updates when locked but allow other updates', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.toggleImageLock(imageId);
      });

      act(() => {
        result.current.updateImagePosition(imageId, 100, 100);
        result.current.updateImageScale(imageId, 3);
        result.current.updateImageOpacity(imageId, 0.2);
      });

      // Position should not change (locked)
      expect(result.current.images[0]).toMatchObject({
        x: 10,
        y: 10,
      });

      // Scale and opacity should change (not affected by lock)
      expect(result.current.images[0]).toMatchObject({
        scale: 3,
        opacity: 0.2,
      });
    });

    it('should allow position updates after unlocking', async () => {
      const { result } = renderHook(() => useReferenceImages());

      await act(async () => {
        await result.current.addImage(mockFile);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.toggleImageLock(imageId);
        result.current.updateImagePosition(imageId, 100, 100);
      });

      expect(result.current.images[0].x).toBe(10);

      act(() => {
        result.current.toggleImageLock(imageId);
        result.current.updateImagePosition(imageId, 100, 100);
      });

      expect(result.current.images[0]).toMatchObject({
        x: 100,
        y: 100,
      });
    });
  });
});
