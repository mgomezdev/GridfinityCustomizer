import { describe, it, expect } from 'vitest';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  WHEEL_ZOOM_FACTOR,
} from './constants';

describe('Zoom constants', () => {
  it('should export MIN_ZOOM as 0.25', () => {
    expect(MIN_ZOOM).toBe(0.25);
  });

  it('should export MAX_ZOOM as 4.0', () => {
    expect(MAX_ZOOM).toBe(4.0);
  });

  it('should export ZOOM_STEP as 0.1', () => {
    expect(ZOOM_STEP).toBe(0.1);
  });

  it('should export WHEEL_ZOOM_FACTOR as 0.001', () => {
    expect(WHEEL_ZOOM_FACTOR).toBe(0.001);
  });

  it('should have MIN_ZOOM less than MAX_ZOOM', () => {
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
  });

  it('should have ZOOM_STEP greater than 0', () => {
    expect(ZOOM_STEP).toBeGreaterThan(0);
  });
});
