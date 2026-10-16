import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock ImageData for node environment
(globalThis as any).ImageData = class ImageData {
  constructor(data: Uint8ClampedArray | number, width: number, height?: number) {
    if (typeof data === 'number') {
      this.data = new Uint8ClampedArray(data * width * (height || 1));
      this.width = width;
      this.height = height || 1;
    } else {
      this.data = data;
      this.width = width;
      this.height = height || data.length / (width * 4);
    }
  }
  data: Uint8ClampedArray;
  width: number;
  height: number;
} as any;


