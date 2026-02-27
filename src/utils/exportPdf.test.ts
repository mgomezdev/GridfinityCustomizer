import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename, getOrientation } from './exportPdf';

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slugifies a layout name', () => {
    expect(generateFilename('My Drawer Organizer')).toBe('my-drawer-organizer.pdf');
  });

  it('strips special characters', () => {
    expect(generateFilename('Test! Layout #1')).toBe('test-layout-1.pdf');
  });

  it('collapses multiple separators', () => {
    expect(generateFilename('A  --  B')).toBe('a-b.pdf');
  });

  it('falls back to date when name is undefined', () => {
    expect(generateFilename()).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is empty string', () => {
    expect(generateFilename('')).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is whitespace only', () => {
    expect(generateFilename('   ')).toBe('gridfinity-2026-02-26.pdf');
  });
});

describe('getOrientation', () => {
  it('returns landscape for wide grid', () => {
    expect(getOrientation(6, 4)).toBe('l');
  });

  it('returns portrait for tall grid', () => {
    expect(getOrientation(3, 5)).toBe('p');
  });

  it('returns portrait for square grid', () => {
    expect(getOrientation(4, 4)).toBe('p');
  });
});
