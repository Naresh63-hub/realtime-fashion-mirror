import type { ClothPhysicsProvider } from './ClothPhysicsProvider';
import type { Pose } from '../types';

export class NoopClothPhysicsProvider implements ClothPhysicsProvider {
  reset(_w: number, _h: number): void {}

  attachLandmarks(_pose: Pose): void {}

  step(_dtMs: number): { particles: { x: number; y: number }[] } {
    return { particles: [] as { x: number; y: number }[] };
  }

  getParticlePositions(): { x: number; y: number }[] {
    return [];
  }
}
