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
  private leftArmOccluding = false;
  private rightArmOccluding = false;
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
   * Interpolates local torso depth at the arm's height with depth hysteresis
   * to eliminate border flicker and project palm capsules over hands.
   */
  computeOccluders(pose: Pose, frameWidth: number, frameHeight: number): OcclusionResult | null {
    if (!this.enabled) return null;

    const lm = pose.landmarks;
    const capsules: OccluderCapsule[] = [];
    const px = (p: { x: number; y: number }): Point => ({
      x: p.x * frameWidth,
      y: p.y * frameHeight,
    });

    const ls = lm[LandmarkIndex.LEFT_SHOULDER];
    const rs = lm[LandmarkIndex.RIGHT_SHOULDER];
    const lh = lm[LandmarkIndex.LEFT_HIP];
    const rh = lm[LandmarkIndex.RIGHT_HIP];

    const shoulderSpan =
      Math.hypot((rs?.x ?? 0) - (ls?.x ?? 0), (rs?.y ?? 0) - (ls?.y ?? 0)) * frameWidth;
    const hipSpan =
      Math.hypot((rh?.x ?? 0) - (lh?.x ?? 0), (rh?.y ?? 0) - (lh?.y ?? 0)) * frameWidth;
    const bodyUnit = Math.max(20, (shoulderSpan + hipSpan) / 2);

    const cfg = APP_CONFIG.OCCLUSION;

    // Torso reference planes: continuous interpolation between shoulders and hips
    const shoulderZ = ((ls?.z ?? 0) + (rs?.z ?? 0)) / 2;
    const hipZ = ((lh?.z ?? 0) + (rh?.z ?? 0)) / 2;
    const shoulderY = ((ls?.y ?? 0) + (rs?.y ?? 0)) / 2;
    const hipY = ((lh?.y ?? 0) + (rh?.y ?? 0)) / 2;
    const torsoHeight = Math.max(1e-4, hipY - shoulderY);

    // ---- Arms: elbow→wrist capsule, gated by local vertical depth ----
    const arms: Array<{
      side: 'left' | 'right';
      elbowIdx: number;
      wristIdx: number;
      filter: KalmanFilter;
    }> = [
      {
        side: 'left',
        elbowIdx: LandmarkIndex.LEFT_ELBOW,
        wristIdx: LandmarkIndex.LEFT_WRIST,
        filter: this.leftArmZ,
      },
      {
        side: 'right',
        elbowIdx: LandmarkIndex.RIGHT_ELBOW,
        wristIdx: LandmarkIndex.RIGHT_WRIST,
        filter: this.rightArmZ,
      },
    ];

    for (const arm of arms) {
      const elbow = lm[arm.elbowIdx];
      const wrist = lm[arm.wristIdx];
      if (!elbow || !wrist) continue;
      // Lowered visibility threshold allows arms crossed over chest to maintain occlusion
      if ((elbow.visibility ?? 0) < 0.3 || (wrist.visibility ?? 0) < 0.3) {
        if (arm.side === 'left') this.leftArmOccluding = false;
        else this.rightArmOccluding = false;
        continue;
      }

      const armZ = arm.filter.filter((elbow.z + wrist.z) / 2);
      const armMidY = (elbow.y + wrist.y) / 2;
      const vArm = Math.min(1, Math.max(0, (armMidY - shoulderY) / torsoHeight));
      const localTorsoZ = lerp(shoulderZ, hipZ, vArm);

      // Depth hysteresis: prevents flickering when arm depth hovers near the torso threshold
      const wasOccluding = arm.side === 'left' ? this.leftArmOccluding : this.rightArmOccluding;
      const threshold = wasOccluding
        ? localTorsoZ + cfg.FRONT_Z_THRESHOLD + 0.035 // exit hysteresis margin
        : localTorsoZ + cfg.FRONT_Z_THRESHOLD; // entry threshold

      const isOccluding = armZ < threshold;
      if (arm.side === 'left') this.leftArmOccluding = isOccluding;
      else this.rightArmOccluding = isOccluding;

      if (!isOccluding) continue;

      const strength = lerp(0.5, 1, Math.min(1, (localTorsoZ - armZ) / 0.15));

      // Forearm capsule
      capsules.push({
        a: px(elbow),
        b: px(wrist),
        radius: bodyUnit * cfg.ARM_RADIUS_RATIO * strength,
        rounded: true,
      });

      // Hand & palm capsule projected forward along the forearm axis
      const armDirX = wrist.x - elbow.x;
      const armDirY = wrist.y - elbow.y;
      const armLen = Math.hypot(armDirX, armDirY) || 1;
      const nx = armDirX / armLen;
      const ny = armDirY / armLen;
      const palmDist = bodyUnit * 0.18;
      const palmCenter = {
        x: px(wrist).x + nx * palmDist,
        y: px(wrist).y + ny * palmDist,
      };

      capsules.push({
        a: px(wrist),
        b: palmCenter,
        radius: bodyUnit * cfg.HAND_RADIUS_RATIO * strength,
        rounded: true,
      });
    }

    // ---- Head: always occludes above the shoulder line ----
    if (cfg.HEAD_OCCLUSION_ENABLED) {
      const nose = lm[LandmarkIndex.NOSE];
      if (nose && ls && rs) {
        const nosePx = px(nose);
        const shoulderMidY = ((ls.y + rs.y) / 2) * frameHeight;
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
    this.leftArmOccluding = false;
    this.rightArmOccluding = false;
  }

  dispose(): void {
    this.reset();
  }
}
