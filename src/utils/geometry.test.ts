import { describe, it, expect } from 'vitest';
import { affineFromTriangles, bilinearQuad } from './geometry';
import type { Point } from '../types';

const p = (x: number, y: number): Point => ({ x, y });

describe('affineFromTriangles', () => {
  it('returns identity for identical triangles', () => {
    const tri: [Point, Point, Point] = [p(10, 10), p(50, 10), p(10, 50)];
    const m = affineFromTriangles(tri, tri);
    expect(m).not.toBeNull();
    if (!m) return;
    const transformed = {
      x: m.a * 20 + m.c * 30 + m.e,
      y: m.b * 20 + m.d * 30 + m.f,
    };
    expect(transformed.x).toBeCloseTo(20, 5);
    expect(transformed.y).toBeCloseTo(30, 5);
  });

  it('maps source triangle corners onto target corners', () => {
    const src: [Point, Point, Point] = [p(0, 0), p(100, 0), p(0, 100)];
    const dst: [Point, Point, Point] = [p(200, 100), p(400, 120), p(180, 300)];

    const m = affineFromTriangles(src, dst);
    expect(m).not.toBeNull();
    if (!m) return;
    const apply = (pt: Point): Point => ({
      x: m.a * pt.x + m.c * pt.y + m.e,
      y: m.b * pt.x + m.d * pt.y + m.f,
    });

    const s0 = apply(src[0]);
    const s1 = apply(src[1]);
    const s2 = apply(src[2]);
    expect(s0.x).toBeCloseTo(dst[0].x, 5);
    expect(s0.y).toBeCloseTo(dst[0].y, 5);
    expect(s1.x).toBeCloseTo(dst[1].x, 5);
    expect(s1.y).toBeCloseTo(dst[1].y, 5);
    expect(s2.x).toBeCloseTo(dst[2].x, 5);
    expect(s2.y).toBeCloseTo(dst[2].y, 5);
  });

  it('handles rotation', () => {
    // 90° rotation about origin.
    const src: [Point, Point, Point] = [p(0, 0), p(10, 0), p(0, 10)];
    const dst: [Point, Point, Point] = [p(0, 0), p(0, 10), p(-10, 0)];
    const m = affineFromTriangles(src, dst);
    expect(m).not.toBeNull();
    if (!m) return;
    const px = 10;
    const py = 0;
    const x = m.a * px + m.c * py + m.e;
    const y = m.b * px + m.d * py + m.f;
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(10, 5);
  });

  it('returns null for degenerate triangles', () => {
    const src: [Point, Point, Point] = [p(0, 0), p(10, 0), p(20, 0)]; // collinear
    const dst: [Point, Point, Point] = [p(0, 0), p(0, 10), p(0, 20)];
    const m = affineFromTriangles(src, dst);
    expect(m).toBeNull();
  });
});

describe('bilinearQuad', () => {
  it('returns corners at (u,v) extremes', () => {
    const quad: [Point, Point, Point, Point] = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];
    expect(bilinearQuad(quad, 0, 0)).toEqual(p(0, 0));
    expect(bilinearQuad(quad, 1, 0)).toEqual(p(10, 0));
    expect(bilinearQuad(quad, 1, 1)).toEqual(p(10, 10));
    expect(bilinearQuad(quad, 0, 1)).toEqual(p(0, 10));
  });

  it('interpolates the center', () => {
    const quad: [Point, Point, Point, Point] = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];
    const c = bilinearQuad(quad, 0.5, 0.5);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });
});
