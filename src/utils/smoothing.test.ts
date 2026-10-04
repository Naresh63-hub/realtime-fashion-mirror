import { describe, it, expect } from 'vitest';
import { ExponentialSmoother, VectorSmoother, KalmanFilter, MovingAverage } from './smoothing';

describe('ExponentialSmoother', () => {
  it('should return first value on initial call', () => {
    const smoother = new ExponentialSmoother(0.7);
    const result = smoother.smooth(10);
    expect(result).toBe(10);
  });

  it('should smooth subsequent values', () => {
    const smoother = new ExponentialSmoother(0.7);
    smoother.smooth(10);
    const result = smoother.smooth(20);
    expect(result).toBeGreaterThan(10);
    expect(result).toBeLessThan(20);
  });

  it('should reset correctly', () => {
    const smoother = new ExponentialSmoother(0.7);
    smoother.smooth(10);
    smoother.reset();
    const result = smoother.smooth(20);
    expect(result).toBe(20);
  });

  it('should handle alpha bounds', () => {
    const smoother1 = new ExponentialSmoother(1.5);
    expect(smoother1.smooth(10)).toBe(10);

    const smoother2 = new ExponentialSmoother(-0.5);
    expect(smoother2.smooth(10)).toBe(10);
  });
});

describe('VectorSmoother', () => {
  it('should smooth both x and y coordinates', () => {
    const smoother = new VectorSmoother(0.7);
    const result = smoother.smooth(10, 20);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('should smooth subsequent vector values', () => {
    const smoother = new VectorSmoother(0.7);
    smoother.smooth(10, 20);
    const result = smoother.smooth(30, 40);
    expect(result.x).toBeGreaterThan(10);
    expect(result.x).toBeLessThan(30);
    expect(result.y).toBeGreaterThan(20);
    expect(result.y).toBeLessThan(40);
  });

  it('should reset correctly', () => {
    const smoother = new VectorSmoother(0.7);
    smoother.smooth(10, 20);
    smoother.reset();
    const result = smoother.smooth(30, 40);
    expect(result.x).toBe(30);
    expect(result.y).toBe(40);
  });
});

describe('KalmanFilter', () => {
  it('should filter measurements over time', () => {
    const filter = new KalmanFilter(0, 0.1, 0.1, 1);
    const result1 = filter.filter(10);
    const result2 = filter.filter(10.5);
    filter.filter(9.5);
    expect(result1).toBeGreaterThan(0);
    expect(result2).toBeGreaterThan(result1 * 0.9);
    expect(result2).toBeLessThan(result1 * 1.1);
  });

  it('should filter noisy measurements', () => {
    const filter = new KalmanFilter(0, 0.1, 0.1, 1);
    filter.filter(10);
    const result1 = filter.filter(10.5);
    const result2 = filter.filter(9.5);
    expect(result1).toBeGreaterThan(10);
    expect(result1).toBeLessThan(10.5);
    expect(result2).toBeLessThan(10);
    expect(result2).toBeGreaterThan(9.5);
  });

  it('should reset correctly', () => {
    const filter = new KalmanFilter(0, 0.1, 0.1, 1);
    filter.filter(10);
    filter.reset(5);
    const result = filter.filter(20);
    expect(result).toBeGreaterThan(5);
    expect(result).toBeLessThan(20);
  });
});

describe('MovingAverage', () => {
  it('should calculate average over window', () => {
    const smoother = new MovingAverage(3);
    expect(smoother.smooth(10)).toBe(10);
    expect(smoother.smooth(20)).toBe(15);
    expect(smoother.smooth(30)).toBe(20);
  });

  it('should handle window size correctly', () => {
    const smoother = new MovingAverage(2);
    smoother.smooth(10);
    smoother.smooth(20);
    expect(smoother.smooth(30)).toBe(25);
  });

  it('should reset correctly', () => {
    const smoother = new MovingAverage(3);
    smoother.smooth(10);
    smoother.smooth(20);
    smoother.reset();
    expect(smoother.smooth(30)).toBe(30);
  });

  it('should handle minimum window size', () => {
    const smoother = new MovingAverage(0);
    expect(smoother.getWindowSize()).toBe(1);
  });
});
