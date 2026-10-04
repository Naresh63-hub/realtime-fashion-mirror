/**
 * Mass-spring / FEM cloth physics provider spec.
 *
 * A real implementation owns:
 *   particle buffers,
 *   distance/bend/stretch constraints,
 *   Verlet or Projective Dynamics solver,
 *   landmark-to-anchor-particle pinning.
 *
 * Used inside the frame loop when APP_CONFIG.PHYSICS.ENABLED=true.
 */

import type { ClothPhysicsProvider as ICPP } from '../types';
export type ClothPhysicsProvider = ICPP;
