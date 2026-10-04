/**
 * OcclusionEngine — decides which body parts should appear IN FRONT of the
 * virtual garment and emits capsule occluders the renderer subtracts from
 * the clothing layer (`destination-out`).
 *
 * Technology: geometric depth test on pose landmarks (z from MediaPipe
 * pose; smaller = closer to camera). Forearms/hands whose filtered z is
 * in front of the torso plane cut through the garment; the head always
 * occludes the neckline region above the shoulder line.
 *
 * A 1-D Kalman filter per arm stabilizes the z estimate so brief pose
 * jitter does not flicker the occlusion on and off.
 */

import type { OccluderCapsule, OcclusionResult, Point, Pose } from '../types';
import { LandmarkIndex } from '../types';
import { APP_CONFIG } from '../config';
import { KalmanFilter } from '../utils/smoothing';
import { lerp } from '../utils/geometry';

export class OcclusionEngine {
  private leftArmZ = new KalmanFilter(0);
  private rightArmZ = new KalmanFilter(0);
  private enabled: boolean;

  constructor(enabled = APP_CONFIG.OCCLUSION.ENABLED) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Build occluders for the current frame.
   * `torsoZ` is the torso-plane depth reference (mid-shoulder z).
   */
  computeOccluders(pose: Pose, frameWidth: number, frameHeight: number): OcclusionResult | null {
    if (!this.enabled) return null;

    const lm = pose.landmarks;
    const capsules: OccluderCapsule[] = [];
    const px = (p: { x: number; y: number }): Point => ({
      x: p.x * frameWidth,
      y: p.y * frameHeight,
    });

    const shoulderSpan =
      Math.hypot(
        (lm[LandmarkIndex.RIGHT_SHOULDER]?.x ?? 0) - (lm[LandmarkIndex.LEFT_SHOULDER]?.x ?? 0),
        (lm[LandmarkIndex.RIGHT_SHOULDER]?.y ?? 0) - (lm[LandmarkIndex.LEFT_SHOULDER]?.y ?? 0)
      ) * frameWidth;
    const hipSpan =
      Math.hypot(
        (lm[LandmarkIndex.RIGHT_HIP]?.x ?? 0) - (lm[LandmarkIndex.LEFT_HIP]?.x ?? 0),
        (lm[LandmarkIndex.RIGHT_HIP]?.y ?? 0) - (lm[LandmarkIndex.LEFT_HIP]?.y ?? 0)
      ) * frameWidth;
    const bodyUnit = Math.max(20, (shoulderSpan + hipSpan) / 2);

    const cfg = APP_CONFIG.OCCLUSION;

    // Torso reference depth: average of hip z (garment plane).
    const torsoZ =
      ((lm[LandmarkIndex.LEFT_HIP]?.z ?? 0) + (lm[LandmarkIndex.RIGHT_HIP]?.z ?? 0)) / 2;

    // ---- Arms: elbow→wrist capsule, gated by depth ----
    const arms: Array<{
      elbowIdx: number;
      wristIdx: number;
      elbowVisIdx: number;
      wristVisIdx: number;
      filter: KalmanFilter;
    }> = [
      {
        elbowIdx: LandmarkIndex.LEFT_ELBOW,
        wristIdx: LandmarkIndex.LEFT_WRIST,
        elbowVisIdx: LandmarkIndex.LEFT_ELBOW,
        wristVisIdx: LandmarkIndex.LEFT_WRIST,
        filter: this.leftArmZ,
      },
      {
        elbowIdx: LandmarkIndex.RIGHT_ELBOW,
        wristIdx: LandmarkIndex.RIGHT_WRIST,
        elbowVisIdx: LandmarkIndex.RIGHT_ELBOW,
        wristVisIdx: LandmarkIndex.RIGHT_WRIST,
        filter: this.rightArmZ,
      },
    ];

    for (const arm of arms) {
      const elbow = lm[arm.elbowIdx];
      const wrist = lm[arm.wristIdx];
      if (!elbow || !wrist) continue;
      if ((elbow.visibility ?? 0) < 0.5 || (wrist.visibility ?? 0) < 0.5) continue;

      const armZ = arm.filter.filter((elbow.z + wrist.z) / 2);

      // Arm in front of the torso plane → forearm/hand occludes garment.
      const inFront = armZ < torsoZ + cfg.FRONT_Z_THRESHOLD;
      if (!inFront) continue;

      const strength = lerp(0.5, 1, Math.min(1, (torsoZ - armZ) / 0.15));

      capsules.push({
        a: px(elbow),
        b: px(wrist),
        radius: bodyUnit * cfg.ARM_RADIUS_RATIO * strength,
        rounded: true,
      });

      // Hand circle at the wrist for a fuller palm shape.
      capsules.push({
        a: px(wrist),
        b: px(wrist),
        radius: bodyUnit * cfg.HAND_RADIUS_RATIO * strength,
        rounded: false,
      });
    }

    // ---- Head: always occludes above the shoulder line ----
    if (cfg.HEAD_OCCLUSION_ENABLED) {
      const nose = lm[LandmarkIndex.NOSE];
      const ls = lm[LandmarkIndex.LEFT_SHOULDER];
      const rs = lm[LandmarkIndex.RIGHT_SHOULDER];
      if (nose && ls && rs) {
        const nosePx = px(nose);
        const shoulderMidY = ((ls.y + rs.y) / 2) * frameHeight;
        // Only when the head is near/above the shoulder line does it
        // overlap the garment's neckline.
        const headRadius = bodyUnit * cfg.HEAD_RADIUS_RATIO;
        if (nosePx.y < shoulderMidY + headRadius * 1.2) {
          capsules.push({
            a: { x: nosePx.x, y: nosePx.y - headRadius * 0.35 },
            b: nosePx,
            radius: headRadius,
            rounded: true,
          });
        }
      }
    }

    return { capsules, timestamp: pose.timestamp };
  }

  /** Test whether a frame-space point is inside any occluder (debug/tests). */
  isPointOccluded(result: OcclusionResult, x: number, y: number): boolean {
    return result.capsules.some((c) => {
      const dx = c.b.x - c.a.x;
      const dy = c.b.y - c.a.y;
      const lenSq = dx * dx + dy * dy;
      const t =
        lenSq === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - c.a.x) * dx + (y - c.a.y) * dy) / lenSq));
      const cx = c.a.x + dx * t;
      const cy = c.a.y + dy * t;
      return Math.hypot(x - cx, y - cy) <= c.radius;
    });
  }

  reset(): void {
    this.leftArmZ.reset();
    this.rightArmZ.reset();
  }

  dispose(): void {
    this.reset();
  }
}
